import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { GameSessionService } from '../services/game-session.service';
import { DamageImpactService } from '../services/damage-impact.service';
import { AdvantageState, RollLogPayload, RollType } from '../models/game-session.interface';
import { PixelDieComponent } from '../pixel-die/pixel-die.component';
import { PixelNumericDieComponent } from '../pixel-numeric-die/pixel-numeric-die.component';
import { hasRiderChoices, RiderChoices, RiderOption } from './spell-riders';
import { ApplyKind, ApplyRequest, ApplyTarget } from './apply-target';

/** Uma opção de espaço de magia pra gastar em Destruição Divina — ver `AbilityRollConfig.damage.smite`. */
export interface SmiteOption {
  /** Chave do nível de espaço (ex: "level_2") — repassada em `smiteUsed` pro chamador debitar o espaço certo. */
  slotKey: string;
  levelLabel: string;
  /** Quantos d8 esse nível de espaço soma ao dano (2 pro espaço de 1º nível, +1 por nível acima, limitado a 5). */
  bonusDice: number;
}

export interface AbilityRollConfig {
  mode: 'ability';
  rollType: 'attack' | 'skill' | 'save' | 'initiative';
  label: string;
  modifier: number;
  /**
   * Só pra rollType 'attack': dado de dano da arma equipada. Quando presente, depois do
   * resultado do d20 o modal pergunta "passou da CA?" e, se sim, rola esse dado — tudo no
   * mesmo modal, sem fechar e reabrir.
   */
  damage?: {
    diceCount: number;
    diceSides: number;
    modifier: number;
    label: string;
    /** Cura Suprema: usa o valor máximo de cada dado em vez de rolar. */
    maximize?: boolean;
    /** Grupos de dados a mais que entram junto no dano (Tempestade de Gelo: 2d8 + 4d6). */
    extraDice?: { count: number; sides: number }[];
    /** Só ataque corpo a corpo de Paladino nv2+ com espaço de magia disponível: antes de rolar
     *  o dano, o modal pergunta se quer gastar um espaço em Destruição Divina. */
    smite?: SmiteOption[];
    /** Magias que somam dano neste acerto: Destruições (escolher gasta o espaço) e as de efeito
     *  contínuo já lançadas (Bruxaria, Marca do Caçador…), que o jogador marca se estão ativas. */
    riders?: RiderChoices;
  };
  /** Magia de cura: a rolagem "de dano" é cura (vai pro log como `heal`, sem impacto em tela). */
  healing?: { tempHp: boolean };
  /** Acerto automático (Mísseis Mágicos), resistência e cura: pula o d20 e já abre no dano. */
  autoHit?: boolean;
  /** Magia de resistência: a CD/atributo que os alvos rolam (ex.: "CD 14 de Destreza") e o dano
   *  de quem passa — o modal mostra os dois valores e o mestre aplica em cada alvo. */
  save?: { note: string; onSuccess: 'half' | 'none' | 'full' };
  /** Vários ataques na mesma ação (raios do Raio Ardente, feixes da Rajada Mística): depois de
   *  cada um (acerto + dano, ou erro), o modal oferece o próximo até `count`. */
  instances?: { count: number; label: string };
}

export interface FreeformRollConfig {
  mode: 'freeform';
}

export type RollConfig = AbilityRollConfig | FreeformRollConfig;

interface RollResult {
  rolls: number[];
  chosen: number[];
  total: number;
}

type AttackPhase = 'attack' | 'awaiting-hit' | 'smite-choice' | 'damage' | 'next-instance';

const DIE_OPTIONS = [4, 6, 8, 10, 12, 20, 100];
const MAX_PER_DIE_TYPE = 9;
const ROLL_TICKS = 10;
const ROLL_TICK_MS = 80;

@Component({
  selector: 'app-roll-modal',
  standalone: true,
  imports: [PixelDieComponent, PixelNumericDieComponent],
  templateUrl: './roll-modal.component.html',
  styleUrls: ['./roll-modal.component.scss'],
})
export class RollModalComponent implements OnInit {
  private gameSessionService = inject(GameSessionService);
  private damageImpact = inject(DamageImpactService);

  @Input({ required: true }) config!: RollConfig;
  @Input() idCharacter: number | null = null;
  @Input() actorName = 'Aventureiro';
  @Input() sessionId: string | undefined;
  /** Só o mestre pode rolar oculto — mostra o alternador PÚBLICO/OCULTO no modo freeform. */
  @Input() canHideRoll = false;
  /** Alvos em que o dano/cura rolado pode ser aplicado direto (opcional). Vazio = sem a opção,
   *  e o modal se comporta como antes (encerra sozinho ao terminar a rolagem de dano). */
  @Input() applyTargets: ApplyTarget[] = [];
  @Output() closed = new EventEmitter<void>();
  /** O jogador/mestre pediu pra aplicar o resultado num alvo — o pai aplica no PV. */
  @Output() applyToTarget = new EventEmitter<ApplyRequest>();
  /** Emite quando a interação termina de vez (não a cada rolagem — ver finishRoll/confirmMiss). */
  @Output() rolled = new EventEmitter<{ rolls: number[]; modifier: number; total: number }>();
  /** Só emite pro fluxo de ataque com dano (`config.damage` presente): `true` quando o mestre
   *  confirma que passou da CA (rollDamageNow), `false` quando confirma que não acertou (confirmMiss). */
  @Output() attackResolved = new EventEmitter<boolean>();
  /** Emite quando o jogador escolhe um espaço de magia em Destruição Divina — o pai é
   *  responsável por debitar o espaço (`slotKey`), o modal só cuida do dado extra. */
  @Output() smiteUsed = new EventEmitter<{ slotKey: string }>();
  /** Emite quando o jogador escolhe uma Destruição (magia) no acerto — o pai debita o espaço e
   *  anuncia a magia; o modal só soma os dados. */
  @Output() riderSpellUsed = new EventEmitter<RiderOption>();

  readonly dieOptions = DIE_OPTIONS;

  advantageState = signal<AdvantageState>('normal');
  /** Bandeja de dados livres: quantos de cada lado (ex: {6: 3, 12: 1, ...} = 3d6 + 1d12). Começa
   *  zerada (o jogador escolhe) — todos os tipos presentes só pra ter valor definido no template. */
  freeformPool = signal<Record<number, number>>(Object.fromEntries(DIE_OPTIONS.map((d) => [d, 0])));
  freeformModifier = signal(0);
  /** Só tem efeito se canHideRoll — ver comentário no @Input. */
  freeformHidden = signal(false);

  /** Fase do fluxo de ataque — só avança além de 'attack' quando config.damage existe. */
  attackPhase = signal<AttackPhase>('attack');
  /** Qual dos `config.instances` ataques está em andamento (1-based). */
  instanceIndex = signal(1);
  /** 20 natural no d20 do ataque: acerta sempre e os dados de dano dobram (o modificador não). */
  isCritical = signal(false);

  ngOnInit(): void {
    if (this.pendingDamage && this.config.mode === 'ability' && this.config.autoHit) {
      this.attackPhase.set('damage');
    }
  }

  /** Estado da escolha de Destruição Divina (fase 'smite-choice'). */
  selectedSmiteOption = signal<SmiteOption | null>(null);
  smiteTargetSpecial = signal(false);
  /** Quantos d8 extras somar à rolagem de dano — 0 se Destruição Divina não foi usada. */
  private smiteExtraDice = signal(0);
  /** Destruição (magia) escolhida no acerto e efeitos contínuos marcados como ativos. */
  selectedRider = signal<RiderOption | null>(null);
  activeToggles = signal<ReadonlySet<string>>(new Set());
  /** Alvo escolhido no "APLICAR EM…" e o que já foi aplicado nesta rolagem (área: vários alvos). */
  applyTargetKey = signal<string>('');
  applied = signal<{ label: string; amount: number; kind: ApplyKind }[]>([]);
  /** Rolagem de dano/cura terminou e espera o "CONCLUIR" (só quando há alvos pra aplicar). */
  awaitingApply = signal(false);
  /** Dados das magias somadas ao dano desta rolagem e o nome delas (pro título). */
  private riderDice = signal<{ count: number; sides: number }[]>([]);
  private riderNames = signal<string[]>([]);

  isRolling = signal(false);
  displayValues = signal<number[]>([]);
  result = signal<RollResult | null>(null);
  posting = signal(false);
  postFailed = signal(false);

  /** Lados de cada dado da rolagem em andamento/mais recente, na ordem — congelada no início de
   *  cada roll() pra não mudar de baixo do resultado se o jogador mexer na bandeja depois. */
  private rolledSides: number[] = [];

  private get pendingDamage() {
    if (this.config.mode !== 'ability' || this.config.rollType !== 'attack') return null;
    return this.config.damage ?? null;
  }

  get isAwaitingHitDecision(): boolean {
    return this.attackPhase() === 'awaiting-hit';
  }

  /** Linha da resistência exibida acima dos dados (ex.: "CD 14 de Destreza — metade se passar"). */
  get saveLine(): string | null {
    if (this.config.mode !== 'ability' || !this.config.save) return null;
    const { note, onSuccess } = this.config.save;
    const effect =
      onSuccess === 'half'
        ? 'metade do dano se passar'
        : onSuccess === 'none'
          ? 'sem dano se passar'
          : 'dano total sempre; a resistência evita só o efeito';
    return `${note} — ${effect}`;
  }

  /** Dano de quem passou na resistência, depois de rolar (só quando a magia dá metade). */
  get saveSuccessTotal(): number | null {
    const res = this.result();
    if (!res || this.config.mode !== 'ability' || this.config.save?.onSuccess !== 'half')
      return null;
    return Math.floor(res.total / 2);
  }

  get isOfferingNextInstance(): boolean {
    return this.attackPhase() === 'next-instance';
  }

  private get instanceCount(): number {
    return this.config.mode === 'ability' ? (this.config.instances?.count ?? 1) : 1;
  }

  private get hasMoreInstances(): boolean {
    return this.instanceIndex() < this.instanceCount;
  }

  /** Ex: "raio 2 de 3" — vazio quando há um ataque só. */
  get instanceProgress(): string {
    if (this.config.mode !== 'ability' || !this.config.instances || this.instanceCount < 2)
      return '';
    return `${this.config.instances.label} ${this.instanceIndex()} de ${this.instanceCount}`;
  }

  get nextInstanceLabel(): string {
    if (this.config.mode !== 'ability' || !this.config.instances) return '';
    return `${this.config.instances.label} ${this.instanceIndex() + 1} de ${this.instanceCount}`;
  }

  get isChoosingSmite(): boolean {
    return this.attackPhase() === 'smite-choice';
  }

  get smiteOptions(): SmiteOption[] {
    return this.pendingDamage?.smite ?? [];
  }

  get riderOptions(): RiderOption[] {
    return this.pendingDamage?.riders?.oneShot ?? [];
  }

  get riderToggles() {
    return this.pendingDamage?.riders?.persistent ?? [];
  }

  /** Depois do dano: a resistência do efeito extra da Destruição usada (ex.: "CD 14 de Sabedoria"). */
  get riderSaveLine(): string | null {
    const rider = this.selectedRider();
    if (this.attackPhase() !== 'damage' || !rider?.saveNote) return null;
    return `${rider.spellName}: ${rider.saveNote}`;
  }

  /** Mostra o "APLICAR EM…" depois de uma rolagem de dano/cura, se houver alvos. */
  get canApply(): boolean {
    return (
      this.applyTargets.length > 0 &&
      !!this.result() &&
      !this.isRolling() &&
      (this.attackPhase() === 'damage' || this.attackPhase() === 'next-instance') &&
      // erro de ataque não tem dano pra aplicar (o resultado na tela é o d20)
      this.lastRollWasDamage
    );
  }

  private lastRollWasDamage = false;

  /** O que o resultado faz no alvo: dano, cura ou PV temporários. */
  get applyKind(): ApplyKind {
    if (this.config.mode === 'ability' && this.config.healing) {
      return this.config.healing.tempHp ? 'temp_hp' : 'heal';
    }
    return 'damage';
  }

  /** Alvos válidos pro tipo de resultado (PV temporários só em jogador). */
  get applicableTargets(): ApplyTarget[] {
    return this.applyKind === 'temp_hp'
      ? this.applyTargets.filter((t) => t.allowsTempHp)
      : this.applyTargets;
  }

  setApplyTarget(event: Event): void {
    this.applyTargetKey.set((event.target as HTMLSelectElement).value);
  }

  /** `half`: magia de resistência — o alvo passou e sofre metade. */
  apply(half = false): void {
    const res = this.result();
    const target = this.applicableTargets.find((t) => t.key === this.applyTargetKey());
    if (!res || !target) return;
    const amount = half ? Math.floor(res.total / 2) : res.total;
    if (amount <= 0) return;
    const kind = this.applyKind;
    this.applyToTarget.emit({ targetKey: target.key, amount, kind });
    this.applied.update((list) => [...list, { label: target.label, amount, kind }]);
  }

  /** Encerra a rolagem depois de aplicar (ou desistir de aplicar). */
  finishApply(): void {
    this.awaitingApply.set(false);
    const res = this.result();
    this.rolled.emit({ rolls: res?.rolls ?? [], modifier: this.modifier, total: res?.total ?? 0 });
  }

  isToggleActive(key: string): boolean {
    return this.activeToggles().has(key);
  }

  toggleRider(key: string): void {
    this.activeToggles.update((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  selectRider(option: RiderOption | null): void {
    this.selectedRider.set(option);
  }

  /** true só pro d20 de teste de habilidade — falso durante a sub-rolagem de dano do ataque
   *  e durante a escolha de Destruição Divina. */
  get isAbility(): boolean {
    return (
      this.config.mode === 'ability' &&
      this.attackPhase() !== 'damage' &&
      this.attackPhase() !== 'smite-choice' &&
      this.attackPhase() !== 'next-instance'
    );
  }

  get title(): string {
    const progress = this.instanceProgress;
    return progress ? `${this.baseTitle} (${progress})` : this.baseTitle;
  }

  private get baseTitle(): string {
    if (this.attackPhase() === 'smite-choice') {
      return hasRiderChoices(this.pendingDamage?.riders) ? 'Somar ao dano' : 'Destruição Divina';
    }
    if (this.attackPhase() === 'damage' && this.pendingDamage) {
      const extras = [
        ...(this.smiteExtraDice() > 0 ? ['Destruição Divina'] : []),
        ...this.riderNames(),
      ];
      const label = [this.pendingDamage.label, ...extras].join(' + ');
      return this.isCritical() ? `${label} — CRÍTICO` : label;
    }
    return this.config.mode === 'ability' ? this.config.label : 'Rolagem de Dados';
  }

  get modifier(): number {
    if (this.attackPhase() === 'damage' && this.pendingDamage) return this.pendingDamage.modifier;
    return this.config.mode === 'ability' ? this.config.modifier : this.freeformModifier();
  }

  /** true quando não há nada selecionado pra rolar (bandeja livre vazia). */
  get freeformPoolEmpty(): boolean {
    return this.config.mode === 'freeform' && this.currentDiceSides().length === 0;
  }

  /** Lados de cada dado a exibir agora: enquanto rola/tem resultado usa a lista congelada da
   *  rolagem em curso; antes de rolar, mostra a composição atual (d20/dano da arma/bandeja livre). */
  private diceSidesForDisplay(): number[] {
    return this.isRolling() || this.result() ? this.rolledSides : this.currentDiceSides();
  }

  /** Lados do dado na posição i — usado pelo template pra saber qual imagem/componente mostrar. */
  sidesAt(index: number): number {
    return this.diceSidesForDisplay()[index] ?? 20;
  }

  get diceCount(): number {
    return this.diceSidesForDisplay().length;
  }

  placeholderIndexes(): number[] {
    return Array.from({ length: this.diceCount }, (_, i) => i);
  }

  setAdvantage(state: AdvantageState) {
    if (this.isRolling()) return;
    this.advantageState.set(state);
    this.result.set(null);
  }

  /** Muda quantos dados de `sides` estão na bandeja livre (ex: +1 no d12). */
  changeFreeformDieCount(sides: number, delta: number) {
    if (this.isRolling()) return;
    this.freeformPool.update((pool) => {
      const current = pool[sides] ?? 0;
      const next = Math.min(MAX_PER_DIE_TYPE, Math.max(0, current + delta));
      return { ...pool, [sides]: next };
    });
    this.result.set(null);
  }

  changeFreeformModifier(delta: number) {
    if (this.isRolling()) return;
    this.freeformModifier.update((m) => m + delta);
    this.result.set(null);
  }

  setFreeformHidden(hidden: boolean) {
    if (this.isRolling()) return;
    this.freeformHidden.set(hidden);
  }

  roll() {
    if (this.isRolling() || this.freeformPoolEmpty) return;
    this.result.set(null);
    this.postFailed.set(false);
    this.isRolling.set(true);

    const sidesList = this.currentDiceSides();
    this.rolledSides = sidesList;
    this.displayValues.set(sidesList.map(() => 1));

    let ticks = 0;
    const interval = setInterval(() => {
      this.displayValues.set(sidesList.map((s) => this.rollDie(s)));
      ticks++;
      if (ticks >= ROLL_TICKS) {
        clearInterval(interval);
        this.finishRoll(sidesList);
      }
    }, ROLL_TICK_MS);
  }

  /** O mestre confirmou que o ataque passou da CA — se houver opções de Destruição Divina,
   *  pergunta antes; senão já rola o dado de dano da arma, no mesmo modal. */
  rollDamageNow(): void {
    if (!this.pendingDamage) return;
    this.attackResolved.emit(true);
    if (this.pendingDamage.smite?.length || hasRiderChoices(this.pendingDamage.riders)) {
      this.attackPhase.set('smite-choice');
      return;
    }
    this.beginDamageRoll();
  }

  selectSmiteOption(option: SmiteOption | null): void {
    this.selectedSmiteOption.set(option);
  }

  toggleSmiteTargetSpecial(): void {
    this.smiteTargetSpecial.update((v) => !v);
  }

  /** Fecha a escolha (Destruição Divina e/ou magias) e rola o dano com os dados extras. */
  confirmSmiteChoice(): void {
    const option = this.selectedSmiteOption();
    this.smiteExtraDice.set(option ? option.bonusDice + (this.smiteTargetSpecial() ? 1 : 0) : 0);
    if (option) this.smiteUsed.emit({ slotKey: option.slotKey });

    const rider = this.selectedRider();
    const toggles = this.riderToggles.filter((t) => this.activeToggles().has(t.key));
    this.riderDice.set([...(rider ? [rider.dice] : []), ...toggles.map((t) => t.dice)]);
    this.riderNames.set([...(rider ? [rider.spellName] : []), ...toggles.map((t) => t.spellName)]);
    if (rider) this.riderSpellUsed.emit(rider);
    this.beginDamageRoll();
  }

  private beginDamageRoll(): void {
    this.attackPhase.set('damage');
    this.result.set(null);
    this.roll();
  }

  /** O mestre disse que não passou da CA — encerra sem rolar dano (ou oferece o próximo raio). */
  confirmMiss(): void {
    this.attackResolved.emit(false);
    if (this.hasMoreInstances) {
      this.attackPhase.set('next-instance');
      return;
    }
    const res = this.result();
    this.rolled.emit({ rolls: res?.rolls ?? [], modifier: this.modifier, total: res?.total ?? 0 });
  }

  /** Começa o próximo raio/feixe: volta pro d20 do ataque. */
  nextInstance(): void {
    this.instanceIndex.update((i) => i + 1);
    this.isCritical.set(false);
    this.lastRollWasDamage = false;
    this.applied.set([]);
    this.result.set(null);
    this.smiteExtraDice.set(0);
    this.selectedSmiteOption.set(null);
    this.smiteTargetSpecial.set(false);
    // Destruição só vale no primeiro acerto; efeitos contínuos continuam marcados.
    this.selectedRider.set(null);
    this.riderDice.set([]);
    this.riderNames.set([]);
    this.attackPhase.set('attack');
  }

  /** Encerra antes de usar todos os raios (ex.: o alvo caiu). */
  finishInstances(): void {
    const res = this.result();
    this.rolled.emit({ rolls: res?.rolls ?? [], modifier: this.modifier, total: res?.total ?? 0 });
  }

  isDropped(index: number): boolean {
    const res = this.result();
    if (!res || !this.isAbility || res.rolls.length < 2) return false;
    return !res.chosen.includes(res.rolls[index]);
  }

  criticalFor(index: number): 'high' | 'low' | null {
    if (!this.isAbility) return null;
    const value = this.result()?.rolls[index];
    if (value === 20) return 'high';
    if (value === 1) return 'low';
    return null;
  }

  formatMod(value: number): string {
    return value >= 0 ? `+${value}` : `${value}`;
  }

  close() {
    this.closed.emit();
  }

  /** Lista de lados dos dados da rolagem atual, na ordem — d20 (1-2x pra vantagem/desvantagem),
   *  o dado de dano da arma, ou a bandeja livre expandida (ex: {6:3,12:1} -> [6,6,6,12]). */
  private currentDiceSides(): number[] {
    if (this.attackPhase() === 'damage' && this.pendingDamage) {
      const { diceCount, diceSides } = this.pendingDamage;
      const weaponDice = Array.from({ length: diceCount }, () => diceSides);
      const extraDice = (this.pendingDamage.extraDice ?? []).flatMap(({ count, sides }) =>
        Array.from({ length: count }, () => sides),
      );
      const smiteDice = Array.from({ length: this.smiteExtraDice() }, () => 8);
      const riderDice = this.riderDice().flatMap(({ count, sides }) =>
        Array.from({ length: count }, () => sides),
      );
      const dice = [...weaponDice, ...extraDice, ...smiteDice, ...riderDice];
      // Crítico: rola o dobro de todos os dados de dano (arma/magia, extras e Destruição Divina).
      return this.isCritical() ? [...dice, ...dice] : dice;
    }
    if (this.config.mode === 'ability') {
      const count = this.advantageState() === 'normal' ? 1 : 2;
      return Array.from({ length: count }, () => 20);
    }
    const pool = this.freeformPool();
    return this.dieOptions.flatMap((sides) => Array(pool[sides] ?? 0).fill(sides));
  }

  private get isHealing(): boolean {
    return this.config.mode === 'ability' && !!this.config.healing;
  }

  private finishRoll(sidesList: number[]) {
    const maximize = this.attackPhase() === 'damage' && !!this.pendingDamage?.maximize;
    const rolls = sidesList.map((s) => (maximize ? s : this.rollDie(s)));
    this.displayValues.set(rolls);

    let chosen: number[];
    if (this.isAbility) {
      const state = this.advantageState();
      if (state === 'normal') {
        chosen = rolls;
      } else {
        const picked = state === 'disadvantage' ? Math.min(...rolls) : Math.max(...rolls);
        chosen = [picked];
      }
    } else {
      chosen = rolls;
    }

    const total = chosen.reduce((sum, r) => sum + r, 0) + this.modifier;
    this.isRolling.set(false);
    this.result.set({ rolls, chosen, total });
    this.postRoll(rolls, total, sidesList);

    // Impacto em tela cheia (golpe de arma, efeito de magia ou névoa de cura) — só dentro da
    // sessão (a ficha isolada não tem sessionId). Quem rola não recebe o toast da própria
    // rolagem; os outros disparam pelo toast (session-panel), com o mesmo tipo e rótulo do log.
    if (this.attackPhase() === 'damage' && this.sessionId) {
      this.damageImpact.trigger({
        dice_notation: this.diceNotationFor(sidesList),
        modifier: this.modifier,
        total,
        roll_type: this.isHealing ? 'heal' : 'damage',
        label: this.title,
      });
    }

    if (this.pendingDamage && this.attackPhase() === 'attack') {
      // Terminou o d20 do ataque — espera a decisão do mestre antes de sinalizar
      // "interação concluída" (rolled) pro componente pai, senão ele fecharia tudo agora.
      this.isCritical.set(chosen.length === 1 && chosen[0] === 20);
      this.attackPhase.set('awaiting-hit');
      return;
    }

    this.lastRollWasDamage = this.attackPhase() === 'damage';

    if (this.attackPhase() === 'damage' && this.hasMoreInstances) {
      this.attackPhase.set('next-instance');
      return;
    }

    // Com alvos pra aplicar, espera o "CONCLUIR" em vez de encerrar na hora.
    if (this.attackPhase() === 'damage' && this.applyTargets.length > 0) {
      this.applied.set([]);
      this.awaitingApply.set(true);
      return;
    }

    this.rolled.emit({ rolls, modifier: this.modifier, total });
  }

  private rollDie(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
  }

  /** Ex: [6,6,6,12] -> "3d6 + 1d12". Cada grupo de mesmo lado vira um termo. */
  private diceNotationFor(sidesList: number[]): string {
    if (this.isAbility) return '1d20';
    const counts = new Map<number, number>();
    for (const s of sidesList) counts.set(s, (counts.get(s) ?? 0) + 1);
    return [...counts.entries()].map(([sides, count]) => `${count}d${sides}`).join(' + ');
  }

  private postRoll(rolls: number[], total: number, sidesList: number[]) {
    if (!this.sessionId) return;

    const rollType: RollType =
      this.attackPhase() === 'damage'
        ? this.isHealing
          ? 'heal'
          : 'damage'
        : this.config.mode === 'ability'
          ? this.config.rollType
          : 'dice';

    const payload: RollLogPayload = {
      id_character: this.idCharacter,
      actor_name: this.actorName,
      roll_type: rollType,
      label: this.title,
      dice_notation: this.diceNotationFor(sidesList),
      rolls,
      advantage_state: this.isAbility ? this.advantageState() : 'normal',
      modifier: this.modifier,
      total,
      is_hidden: this.canHideRoll && this.config.mode === 'freeform' && this.freeformHidden(),
    };

    this.posting.set(true);
    this.gameSessionService.postRoll(this.sessionId, payload).subscribe({
      next: () => this.posting.set(false),
      error: () => {
        this.posting.set(false);
        this.postFailed.set(true);
      },
    });
  }
}
