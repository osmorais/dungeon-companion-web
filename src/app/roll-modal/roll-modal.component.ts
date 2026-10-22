import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GameSessionService } from '../services/game-session.service';
import { DamageImpactService } from '../services/damage-impact.service';
import {
  AdvantageState,
  CastStageRoll,
  RollLogEntry,
  RollLogPayload,
  RollType,
} from '../models/game-session.interface';
import { PixelDieComponent } from '../pixel-die/pixel-die.component';
import { PixelNumericDieComponent } from '../pixel-numeric-die/pixel-numeric-die.component';
import { hasRiderChoices, RiderChoices, RiderOption } from './spell-riders';
import { ApplyKind, ApplyRequest, ApplyTarget, resistsDamage } from './apply-target';
import { SpellCastStageComponent } from '../spell-cast/spell-cast-stage.component';
import { SpellCastContext, castStagePayload, castVerb } from '../spell-cast/spell-cast-context';
import { CastStageView, castRollView } from '../spell-cast/spell-cast-stage.model';

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
    /** Tipo do dano (resistências do alvo ao aplicar). */
    damageType?: string | null;
    /** Crítico corpo a corpo: dados da arma a mais (Crítico Brutal, Ataques Selvagens). */
    critExtraDice?: number;
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
  /** `distribute`: cura fixa repartida entre alvos (Preservar a Vida) — cada "aplicar" escolhe
   *  quanto, até acabar o total. */
  healing?: { tempHp: boolean; distribute?: boolean };
  /** Indomável (Guerreiro): usos disponíveis pra rolar de novo um teste de resistência. */
  indomitable?: number;
  /** Inspiração Bárdica guardada: soma o dado nesta rolagem (uma vez) e consome. */
  inspiration?: { sides: number; from: string };
  /** Lembretes de vantagem que valem pra esta rolagem (o jogador decide). */
  reminders?: string[];
  /** Halfling (Sortudo): 1 natural no d20 pode ser rolado de novo (vale o novo). */
  halflingLucky?: boolean;
  /** Talento Sortudo: Pontos de Sorte disponíveis — gastar um rola mais um d20 e fica o melhor. */
  luckPoints?: number;
  /** Menor d20 natural que é crítico (Campeão: 19 ou 18). Padrão 20. */
  critMin?: number;
  /** Talento de −5 no ataque / +10 no dano (Mestre em Armas Grandes, Mestre-Atirador): o
   *  jogador liga antes de rolar. */
  powerAttack?: { name: string };
  /** Acerto automático (Mísseis Mágicos), resistência e cura: pula o d20 e já abre no dano. */
  autoHit?: boolean;
  /** Magia de resistência: a CD/atributo que os alvos rolam (ex.: "CD 14 de Destreza") e o dano
   *  de quem passa — o modal mostra os dois valores e o mestre aplica em cada alvo. */
  save?: {
    note: string;
    onSuccess: 'half' | 'none' | 'full';
    effectNote?: string;
    /** Atributo da resistência (Evasão só vale em Destreza). */
    ability?: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
  };
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
  imports: [PixelDieComponent, PixelNumericDieComponent, SpellCastStageComponent],
  templateUrl: './roll-modal.component.html',
  styleUrls: ['./roll-modal.component.scss'],
})
export class RollModalComponent implements OnInit, OnDestroy {
  private gameSessionService = inject(GameSessionService);
  private damageImpact = inject(DamageImpactService);

  @Input({ required: true }) config!: RollConfig;
  @Input() idCharacter: number | null = null;
  @Input() actorName = 'Aventureiro';
  @Input() sessionId: string | undefined;
  /** Só o mestre pode rolar oculto — mostra o alternador PÚBLICO/OCULTO no modo freeform. */
  @Input() canHideRoll = false;
  /** Resposta a um teste secreto do mestre: a rolagem vai oculta (só o mestre e quem rolou veem). */
  @Input() secretRequestId: string | null = null;
  /** Alvos em que o dano/cura rolado pode ser aplicado direto (opcional). Vazio = sem a opção,
   *  e o modal se comporta como antes (encerra sozinho ao terminar a rolagem de dano). */
  @Input() applyTargets: ApplyTarget[] = [];
  /** Aberto de dentro de outra tela (gaveta de ações/grimório): botão "◀ VOLTAR..." no topo, que
   *  fecha só a rolagem e deixa a tela de trás aberta. */
  @Input() backLabel: string | null = null;
  /**
   * Lançamento de magia (1.5.0): em cima das decisões aparece o mesmo palco que a mesa vê (card do
   * personagem + carta + rolagens), e cada passo (ataque registrado, acertou/errou, dano, fim) é
   * mandado pra mesa. `null` = rolagem comum.
   */
  @Input() cast: SpellCastContext | null = null;
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
  /** Somas 1×/turno marcadas neste acerto (Ataque Furtivo…) — o pai trava na vez do combate. */
  @Output() oncePerTurnUsed = new EventEmitter<string[]>();

  /** O jogador gastou um Ponto de Sorte (talento) — o pai debita o recurso. */
  @Output() luckUsed = new EventEmitter<void>();
  /** Indomável usado — o pai debita o uso. */
  @Output() indomitableUsed = new EventEmitter<void>();
  /** Inspiração Bárdica usada — o pai apaga o dado guardado. */
  @Output() inspirationUsed = new EventEmitter<void>();

  indomitableSpent = signal(false);
  /** Valor tirado no dado de Inspiração Bárdica (somado ao total). */
  inspirationRoll = signal<number | null>(null);

  get reminders(): string[] {
    return this.config.mode === 'ability' && this.isAbility ? (this.config.reminders ?? []) : [];
  }

  get canIndomitable(): boolean {
    return (
      this.d20Settled &&
      this.config.mode === 'ability' &&
      this.config.rollType === 'save' &&
      (this.config.indomitable ?? 0) > 0 &&
      !this.indomitableSpent()
    );
  }

  get canUseInspiration(): boolean {
    return (
      this.d20Settled &&
      this.config.mode === 'ability' &&
      !!this.config.inspiration &&
      this.inspirationRoll() === null
    );
  }

  get inspirationSides(): number {
    return this.config.mode === 'ability' ? (this.config.inspiration?.sides ?? 0) : 0;
  }

  /** Indomável: rola de novo a resistência (vale o novo) e gasta o uso. */
  rerollIndomitable(): void {
    const res = this.result();
    if (!res || !this.canIndomitable) return;
    this.indomitableSpent.set(true);
    this.indomitableUsed.emit();
    const index = res.rolls.indexOf(res.chosen[0]);
    const rolls = [...res.rolls];
    rolls[index] = this.rollDie(20);
    this.settleD20(rolls, ' (Indomável)', false, [rolls[index]]);
  }

  /** Inspiração Bárdica: rola o dado e soma no total desta rolagem. */
  useInspiration(): void {
    const res = this.result();
    if (!res || !this.canUseInspiration) return;
    const value = this.rollDie(this.inspirationSides);
    this.inspirationRoll.set(value);
    this.inspirationUsed.emit();
    this.result.set({ ...res, total: res.total + value });
    this.postRoll(
      res.rolls,
      res.total + value,
      this.rolledSides,
      ` (Inspiração Bárdica +${value})`,
    );
  }

  /** Sortudo já usado nesta rolagem (Halfling ou talento: uma vez cada). */
  halflingRerolled = signal(false);
  luckSpent = signal(false);
  /** Teste/resistência terminou e há Sortudo pra oferecer: espera o "CONCLUIR". */
  awaitingLuck = signal(false);

  /** Rolagem de d20 (teste, resistência ou ataque antes do dano) com resultado na tela. */
  private get d20Settled(): boolean {
    return (
      this.config.mode === 'ability' &&
      !!this.result() &&
      !this.isRolling() &&
      (this.attackPhase() === 'attack' || this.attackPhase() === 'awaiting-hit')
    );
  }

  get canHalflingReroll(): boolean {
    return (
      this.d20Settled &&
      this.config.mode === 'ability' &&
      !!this.config.halflingLucky &&
      !this.halflingRerolled() &&
      this.result()!.chosen.includes(1)
    );
  }

  get canUseLuck(): boolean {
    return (
      this.d20Settled &&
      this.config.mode === 'ability' &&
      (this.config.luckPoints ?? 0) > 0 &&
      !this.luckSpent()
    );
  }

  /** Sortudo (Halfling): rola de novo o d20 que deu 1 e fica com o novo resultado. */
  rerollHalfling(): void {
    const res = this.result();
    if (!res || !this.canHalflingReroll) return;
    const index = res.rolls.indexOf(1);
    const rolls = [...res.rolls];
    rolls[index] = this.rollDie(20);
    this.halflingRerolled.set(true);
    this.settleD20(rolls, ' (Sortudo)');
  }

  /** Talento Sortudo: gasta um ponto, rola mais um d20 e fica com o melhor. */
  useLuck(): void {
    const res = this.result();
    if (!res || !this.canUseLuck) return;
    this.luckSpent.set(true);
    this.luckUsed.emit();
    this.rolledSides = [...this.rolledSides, 20];
    this.settleD20([...res.rolls, this.rollDie(20)], ' (Ponto de Sorte)', true);
  }

  /** Recalcula o d20 depois do Sortudo/Indomável (escolhido, crítico) e registra de novo no log.
   *  `forced` = o dado escolhido é esse (Indomável: vale o novo, mesmo com vantagem). */
  private settleD20(rolls: number[], suffix: string, best = false, forced?: number[]): void {
    const state = this.advantageState();
    const chosen = forced
      ? forced
      : best
        ? [Math.max(...rolls)]
        : state === 'normal'
          ? rolls
          : [state === 'disadvantage' ? Math.min(...rolls) : Math.max(...rolls)];
    const total =
      chosen.reduce((sum, r) => sum + r, 0) + this.modifier + (this.inspirationRoll() ?? 0);
    this.displayValues.set(rolls);
    this.result.set({ rolls, chosen, total });
    if (this.attackPhase() === 'awaiting-hit') {
      const critMin = this.config.mode === 'ability' ? (this.config.critMin ?? 20) : 20;
      this.isCritical.set(chosen.length === 1 && chosen[0] >= critMin);
    }
    this.postRoll(rolls, total, this.rolledSides, suffix);
  }

  /** Teste/resistência com Sortudo disponível: encerra quando o jogador decide. */
  finishLuck(): void {
    this.awaitingLuck.set(false);
    const res = this.result();
    this.rolled.emit({ rolls: res?.rolls ?? [], modifier: this.modifier, total: res?.total ?? 0 });
  }

  /** Ataque poderoso ligado (−5 no ataque, +10 no dano). */
  powerAttackOn = signal(false);

  togglePowerAttack(): void {
    if (this.isRolling() || this.result()) return;
    this.powerAttackOn.update((v) => !v);
  }

  get powerAttackName(): string | null {
    return this.config.mode === 'ability' ? (this.config.powerAttack?.name ?? null) : null;
  }

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

  /** ========================= LANÇAMENTO DE MAGIA (palco da mesa) ========================= */

  /** Rolagens do lançamento (referência mandada pra mesa + o registro, pra desenhar os dados). */
  private castRolls = signal<{ ref: CastStageRoll; entry: RollLogEntry }[]>([]);
  private castDone = false;
  /** Etapas vão em fila: a mesa precisa receber na ordem (a última é sempre o "terminou"). */
  private castQueue: Promise<unknown> = Promise.resolve();

  castView = computed<CastStageView | null>(() => {
    const cast = this.cast;
    if (!cast) return null;
    return {
      key: cast.castId,
      actorName: this.actorName,
      verb: castVerb(!!cast.weapon),
      spellName: cast.spellName,
      actor: cast.actor,
      card: cast.card,
      rolls: this.castRolls().map(({ ref, entry }) => castRollView(ref, entry)),
      saveNote: cast.saveNote,
      applied: this.applied(),
      done: false,
    };
  });

  /** Rolagem registrada (resposta da API): entra no palco e vai pra mesa. Uma nova rolagem de
   *  ataque ainda sem decisão (Sortudo, Inspiração) substitui a anterior. */
  private addCastRoll(entry: RollLogEntry, rollType: RollType): void {
    if (!this.cast) return;
    const kind = rollType === 'attack' ? 'attack' : rollType === 'damage' ? 'damage' : rollType === 'heal' ? 'heal' : null;
    if (!kind) return;
    const ref: CastStageRoll = {
      id_roll: entry.id_roll,
      kind,
      outcome: kind === 'attack' ? 'pending' : null,
      critical: kind === 'attack' && this.isCritical(),
    };
    this.castRolls.update((list) => {
      const last = list[list.length - 1];
      const replace = kind === 'attack' && last?.ref.kind === 'attack' && last.ref.outcome === 'pending';
      return [...(replace ? list.slice(0, -1) : list), { ref, entry }];
    });
    this.sendCastStage('open');
  }

  /** Acertou/errou o ataque mais recente (decisão de quem lança). */
  private resolveCastAttack(hit: boolean): void {
    if (!this.cast) return;
    this.castRolls.update((list) => {
      const index = list.map((r) => r.ref.kind).lastIndexOf('attack');
      if (index < 0) return list;
      const next = [...list];
      next[index] = { ...next[index], ref: { ...next[index].ref, outcome: hit ? 'hit' : 'miss' } };
      return next;
    });
    this.sendCastStage('open');
  }

  private sendCastStage(phase: 'open' | 'done'): void {
    const cast = this.cast;
    if (!cast || !this.sessionId || this.idCharacter === null || this.castDone) return;
    if (phase === 'done') this.castDone = true;
    const payload = castStagePayload(
      cast,
      this.idCharacter,
      this.actorName,
      phase,
      this.castRolls().map((r) => r.ref),
      this.applied(),
    );
    const sessionId = this.sessionId;
    this.castQueue = this.castQueue.then(() =>
      firstValueFrom(this.gameSessionService.publishSpellCastStage(sessionId, payload)).catch(
        () => undefined,
      ),
    );
  }

  /** Fechou (terminou, errou ou desistiu): a mesa recebe o "terminou" e o aviso some sozinho. */
  ngOnDestroy(): void {
    this.sendCastStage('done');
  }

  ngOnInit(): void {
    if (this.pendingDamage && this.config.mode === 'ability' && this.config.autoHit) {
      this.attackPhase.set('damage');
      // Valor fixo, sem dado (Integridade Corporal, Curar pelo Toque, Preservar a Vida): já
      // mostra o resultado, sem "rolar".
      if (this.currentDiceSides().length === 0) {
        this.rolledSides = [];
        this.finishRoll([]);
      }
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
  /** Valor fixo das somas marcadas (Matador de Inimigos). */
  private riderFlat = signal(0);
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
    const { note, onSuccess, effectNote } = this.config.save;
    const effect = effectNote
      ? effectNote
      : onSuccess === 'half'
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

  /** Alvos válidos pro tipo de resultado (PV temporários só em jogador; cura não vai pra quem
   *  só aceita dano). */
  get applicableTargets(): ApplyTarget[] {
    if (this.applyKind === 'temp_hp') return this.applyTargets.filter((t) => t.allowsTempHp);
    if (this.applyKind === 'heal') return this.applyTargets.filter((t) => !t.damageOnly);
    return this.applyTargets;
  }

  setApplyTarget(event: Event): void {
    this.applyTargetKey.set((event.target as HTMLSelectElement).value);
  }

  /** `half`: magia de resistência — o alvo passou e sofre metade. */
  /** Cura a distribuir (Preservar a Vida): quanto ainda sobra do total. */
  get isDistributing(): boolean {
    return this.config.mode === 'ability' && !!this.config.healing?.distribute;
  }

  get distributeRemaining(): number {
    const total = this.result()?.total ?? 0;
    return total - this.applied().reduce((sum, a) => sum + a.amount, 0);
  }

  /** Quanto aplicar no próximo alvo ao distribuir (padrão: o que sobra). */
  distributeAmount = signal<number | null>(null);

  setDistributeAmount(event: Event): void {
    const value = Math.trunc(Number((event.target as HTMLInputElement).value));
    this.distributeAmount.set(Number.isFinite(value) && value > 0 ? value : null);
  }

  private get selectedTarget(): ApplyTarget | undefined {
    return this.applicableTargets.find((t) => t.key === this.applyTargetKey());
  }

  /** Resistência do alvo ao tipo deste dano (ex.: "fogo"), ou `null`. */
  resistanceOf(target: ApplyTarget | undefined): string | null {
    if (this.applyKind !== 'damage' || !target?.defenses) return null;
    return resistsDamage(target.defenses.resistances, this.pendingDamage?.damageType);
  }

  /** Esquiva Sobrenatural: o alvo pode receber metade de um ataque (rolagem com d20). */
  canUncannyDodge(target: ApplyTarget | undefined): boolean {
    return (
      this.applyKind === 'damage' &&
      !!target?.defenses?.uncanny_dodge &&
      this.config.mode === 'ability' &&
      !this.config.autoHit
    );
  }

  /** Evasão: resistência de DES de metade → passou = nada, falhou = metade. */
  hasEvasion(target: ApplyTarget | undefined): boolean {
    return (
      this.applyKind === 'damage' &&
      !!target?.defenses?.evasion &&
      this.config.mode === 'ability' &&
      this.config.save?.ability === 'DEX' &&
      this.config.save.onSuccess === 'half'
    );
  }

  /** Quanto o alvo recebe: `full` = falhou/acertou, `half` = passou na resistência,
   *  `uncanny` = Esquiva Sobrenatural; com Evasão e resistência ao tipo já aplicadas. */
  amountForTarget(target: ApplyTarget | undefined, mode: 'full' | 'half' | 'uncanny'): number {
    const total = this.result()?.total ?? 0;
    let amount = mode === 'half' ? Math.floor(total / 2) : total;
    if (this.hasEvasion(target)) amount = mode === 'half' ? 0 : Math.floor(total / 2);
    if (mode === 'uncanny') amount = Math.floor(amount / 2);
    if (this.resistanceOf(target)) amount = Math.floor(amount / 2);
    return amount;
  }

  /** Alvo único escolhido no seletor (cura distribuída e chamadas antigas). */
  get targetResistance(): string | null {
    return this.resistanceOf(this.selectedTarget);
  }

  get targetCanUncannyDodge(): boolean {
    return this.canUncannyDodge(this.selectedTarget);
  }

  get targetHasEvasion(): boolean {
    return this.hasEvasion(this.selectedTarget);
  }

  amountFor(mode: 'full' | 'half' | 'uncanny'): number {
    return this.amountForTarget(this.selectedTarget, mode);
  }

  // ── Vários alvos de uma vez (magia em área): marca os alvos, quem passou e quem se esquivou ──

  selectedKeys = signal<ReadonlySet<string>>(new Set());
  passedKeys = signal<ReadonlySet<string>>(new Set());
  uncannyKeys = signal<ReadonlySet<string>>(new Set());
  private appliedKeys = signal<ReadonlySet<string>>(new Set());

  /** Alvos ainda não aplicados nesta rolagem. */
  get pendingTargets(): ApplyTarget[] {
    const done = this.appliedKeys();
    return this.applicableTargets.filter((t) => !done.has(t.key));
  }

  private toggleIn(set: ReturnType<typeof signal<ReadonlySet<string>>>, key: string): void {
    set.update((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  isTargetSelected(key: string): boolean {
    return this.selectedKeys().has(key);
  }

  toggleTarget(key: string): void {
    this.toggleIn(this.selectedKeys, key);
  }

  selectAllTargets(): void {
    this.selectedKeys.set(new Set(this.pendingTargets.map((t) => t.key)));
  }

  isPassed(key: string): boolean {
    return this.passedKeys().has(key);
  }

  togglePassed(key: string): void {
    this.toggleIn(this.passedKeys, key);
  }

  isUncanny(key: string): boolean {
    return this.uncannyKeys().has(key);
  }

  toggleUncanny(key: string): void {
    this.toggleIn(this.uncannyKeys, key);
  }

  /** Modo do alvo na aplicação em lote: esquiva > passou > inteiro. */
  private modeOf(target: ApplyTarget): 'full' | 'half' | 'uncanny' {
    if (this.canUncannyDodge(target) && this.isUncanny(target.key)) return 'uncanny';
    if (this.saveSuccessTotal !== null && this.isPassed(target.key)) return 'half';
    return 'full';
  }

  /** O que este alvo vai receber, com as marcações dele. */
  pendingAmount(target: ApplyTarget): number {
    return this.amountForTarget(target, this.modeOf(target));
  }

  get selectedCount(): number {
    return this.pendingTargets.filter((t) => this.selectedKeys().has(t.key)).length;
  }

  /** Aplica em todos os alvos marcados, cada um com o seu valor. */
  applySelected(): void {
    if (!this.result()) return;
    const kind = this.applyKind;
    const targets = this.pendingTargets.filter((t) => this.selectedKeys().has(t.key));
    for (const target of targets) {
      const amount = this.pendingAmount(target);
      // Evasão (passou): nada a aplicar — só registra pra mesa ver.
      if (amount > 0)
        this.applyToTarget.emit({ targetKey: target.key, amount, kind, castId: this.cast?.castId });
      this.applied.update((list) => [...list, { label: target.label, amount, kind }]);
    }
    this.appliedKeys.update((done) => new Set([...done, ...targets.map((t) => t.key)]));
    this.selectedKeys.set(new Set());
    if (targets.length) this.sendCastStage('open');
  }

  private resetBatch(): void {
    this.selectedKeys.set(new Set());
    this.passedKeys.set(new Set());
    this.uncannyKeys.set(new Set());
    this.appliedKeys.set(new Set());
  }

  apply(mode: 'full' | 'half' | 'uncanny' = 'full'): void {
    const res = this.result();
    const target = this.selectedTarget;
    if (!res || !target) return;
    const amount = this.isDistributing
      ? Math.min(this.distributeAmount() ?? this.distributeRemaining, this.distributeRemaining)
      : this.amountFor(mode);
    if (amount <= 0) {
      // Evasão: passou e não sofre nada — registra pro mestre ver, sem chamar a API.
      if (!this.isDistributing) {
        this.applied.update((list) => [
          ...list,
          { label: target.label, amount: 0, kind: this.applyKind },
        ]);
        this.sendCastStage('open');
      }
      return;
    }
    this.distributeAmount.set(null);
    const kind = this.applyKind;
    this.applyToTarget.emit({ targetKey: target.key, amount, kind, castId: this.cast?.castId });
    this.applied.update((list) => [...list, { label: target.label, amount, kind }]);
    this.sendCastStage('open');
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
        ...(this.powerAttackOn() && this.powerAttackName ? [this.powerAttackName] : []),
      ];
      const label = [this.pendingDamage.label, ...extras].join(' + ');
      return this.isCritical() ? `${label} — CRÍTICO` : label;
    }
    return this.config.mode === 'ability' ? this.config.label : 'Rolagem de Dados';
  }

  get modifier(): number {
    const power = this.powerAttackOn();
    if (this.attackPhase() === 'damage' && this.pendingDamage) {
      return this.pendingDamage.modifier + this.riderFlat() + (power ? 10 : 0);
    }
    if (this.config.mode !== 'ability') return this.freeformModifier();
    return this.config.modifier - (power ? 5 : 0);
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
    this.resolveCastAttack(true);
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
    this.riderDice.set([
      ...(rider ? [rider.dice] : []),
      ...toggles.flatMap((t) => (t.dice ? [t.dice] : [])),
    ]);
    this.riderFlat.set(toggles.reduce((sum, t) => sum + (t.flat ?? 0), 0));
    this.riderNames.set([...(rider ? [rider.spellName] : []), ...toggles.map((t) => t.spellName)]);
    if (rider) this.riderSpellUsed.emit(rider);
    const oncePerTurn = toggles.filter((t) => t.oncePerTurn).map((t) => t.key);
    if (oncePerTurn.length) this.oncePerTurnUsed.emit(oncePerTurn);
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
    this.resolveCastAttack(false);
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
    this.resetBatch();
    this.result.set(null);
    this.smiteExtraDice.set(0);
    this.selectedSmiteOption.set(null);
    this.smiteTargetSpecial.set(false);
    // Destruição só vale no primeiro acerto; efeitos contínuos continuam marcados — menos as
    // somas 1×/turno (Ataque Furtivo…), que já foram usadas neste turno.
    this.selectedRider.set(null);
    this.activeToggles.update(
      (current) =>
        new Set(
          [...current].filter((key) => !this.riderToggles.find((t) => t.key === key)?.oncePerTurn),
        ),
    );
    this.riderDice.set([]);
    this.riderFlat.set(0);
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
      // Crítico: rola o dobro de todos os dados de dano (arma/magia, extras e Destruição Divina)
      // e mais os dados extras da arma (Crítico Brutal, Ataques Selvagens).
      if (!this.isCritical()) return dice;
      const brutal = Array.from({ length: this.pendingDamage.critExtraDice ?? 0 }, () => diceSides);
      return [...dice, ...dice, ...brutal];
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
      const critMin = this.config.mode === 'ability' ? (this.config.critMin ?? 20) : 20;
      this.isCritical.set(chosen.length === 1 && chosen[0] >= critMin);
      this.attackPhase.set('awaiting-hit');
      return;
    }

    this.lastRollWasDamage = this.attackPhase() === 'damage';

    if (this.attackPhase() === 'damage' && this.hasMoreInstances) {
      this.attackPhase.set('next-instance');
      return;
    }

    // Teste/resistência com Sortudo/Indomável/Inspiração pra oferecer: espera o "CONCLUIR".
    if (
      this.isAbility &&
      (this.canHalflingReroll || this.canUseLuck || this.canIndomitable || this.canUseInspiration)
    ) {
      this.awaitingLuck.set(true);
      return;
    }

    // Com alvos pra aplicar, espera o "CONCLUIR" em vez de encerrar na hora.
    if (this.attackPhase() === 'damage' && this.applyTargets.length > 0) {
      this.applied.set([]);
      this.resetBatch();
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

  private postRoll(rolls: number[], total: number, sidesList: number[], labelSuffix = '') {
    // Valor fixo (sem dado) não vai pro log — o backend exige dados na rolagem.
    if (!this.sessionId || sidesList.length === 0) return;

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
      label: this.title + labelSuffix,
      dice_notation: this.diceNotationFor(sidesList),
      rolls,
      advantage_state: this.isAbility ? this.advantageState() : 'normal',
      modifier: this.modifier,
      total,
      is_hidden: this.canHideRoll && this.config.mode === 'freeform' && this.freeformHidden(),
      ...(this.secretRequestId ? { secret_request_id: this.secretRequestId } : {}),
      ...(this.cast ? { cast_id: this.cast.castId } : {}),
    };

    this.posting.set(true);
    this.gameSessionService.postRoll(this.sessionId, payload).subscribe({
      next: (entry) => {
        this.posting.set(false);
        this.addCastRoll(entry, rollType);
      },
      error: () => {
        this.posting.set(false);
        this.postFailed.set(true);
      },
    });
  }
}
