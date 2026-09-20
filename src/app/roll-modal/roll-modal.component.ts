import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { GameSessionService } from '../services/game-session.service';
import { AdvantageState, RollLogPayload, RollType } from '../models/game-session.interface';
import { PixelDieComponent } from '../pixel-die/pixel-die.component';
import { PixelNumericDieComponent } from '../pixel-numeric-die/pixel-numeric-die.component';

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
    /** Só ataque corpo a corpo de Paladino nv2+ com espaço de magia disponível: antes de rolar
     *  o dano, o modal pergunta se quer gastar um espaço em Destruição Divina. */
    smite?: SmiteOption[];
  };
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

type AttackPhase = 'attack' | 'awaiting-hit' | 'smite-choice' | 'damage';

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
export class RollModalComponent {
  private gameSessionService = inject(GameSessionService);

  @Input({ required: true }) config!: RollConfig;
  @Input() idCharacter: number | null = null;
  @Input() actorName = 'Aventureiro';
  @Input() sessionId: string | undefined;
  /** Só o mestre pode rolar oculto — mostra o alternador PÚBLICO/OCULTO no modo freeform. */
  @Input() canHideRoll = false;
  @Output() closed = new EventEmitter<void>();
  /** Emite quando a interação termina de vez (não a cada rolagem — ver finishRoll/confirmMiss). */
  @Output() rolled = new EventEmitter<{ rolls: number[]; modifier: number; total: number }>();
  /** Só emite pro fluxo de ataque com dano (`config.damage` presente): `true` quando o mestre
   *  confirma que passou da CA (rollDamageNow), `false` quando confirma que não acertou (confirmMiss). */
  @Output() attackResolved = new EventEmitter<boolean>();
  /** Emite quando o jogador escolhe um espaço de magia em Destruição Divina — o pai é
   *  responsável por debitar o espaço (`slotKey`), o modal só cuida do dado extra. */
  @Output() smiteUsed = new EventEmitter<{ slotKey: string }>();

  readonly dieOptions = DIE_OPTIONS;

  advantageState = signal<AdvantageState>('normal');
  /** Bandeja de dados livres: quantos de cada lado (ex: {6: 3, 12: 1, ...} = 3d6 + 1d12). Começa
   *  zerada (o jogador escolhe) — todos os tipos presentes só pra ter valor definido no template. */
  freeformPool = signal<Record<number, number>>(
    Object.fromEntries(DIE_OPTIONS.map((d) => [d, 0])),
  );
  freeformModifier = signal(0);
  /** Só tem efeito se canHideRoll — ver comentário no @Input. */
  freeformHidden = signal(false);

  /** Fase do fluxo de ataque — só avança além de 'attack' quando config.damage existe. */
  attackPhase = signal<AttackPhase>('attack');

  /** Estado da escolha de Destruição Divina (fase 'smite-choice'). */
  selectedSmiteOption = signal<SmiteOption | null>(null);
  smiteTargetSpecial = signal(false);
  /** Quantos d8 extras somar à rolagem de dano — 0 se Destruição Divina não foi usada. */
  private smiteExtraDice = signal(0);

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

  get isChoosingSmite(): boolean {
    return this.attackPhase() === 'smite-choice';
  }

  get smiteOptions(): SmiteOption[] {
    return this.pendingDamage?.smite ?? [];
  }

  /** true só pro d20 de teste de habilidade — falso durante a sub-rolagem de dano do ataque
   *  e durante a escolha de Destruição Divina. */
  get isAbility(): boolean {
    return (
      this.config.mode === 'ability' &&
      this.attackPhase() !== 'damage' &&
      this.attackPhase() !== 'smite-choice'
    );
  }

  get title(): string {
    if (this.attackPhase() === 'smite-choice') return 'Destruição Divina';
    if (this.attackPhase() === 'damage' && this.pendingDamage) {
      return this.smiteExtraDice() > 0
        ? `${this.pendingDamage.label} + Destruição Divina`
        : this.pendingDamage.label;
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
    if (this.pendingDamage.smite?.length) {
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

  /** Fecha a escolha de Destruição Divina e rola o dano (arma + d8s extras, se usada). */
  confirmSmiteChoice(): void {
    const option = this.selectedSmiteOption();
    this.smiteExtraDice.set(option ? option.bonusDice + (this.smiteTargetSpecial() ? 1 : 0) : 0);
    if (option) this.smiteUsed.emit({ slotKey: option.slotKey });
    this.beginDamageRoll();
  }

  private beginDamageRoll(): void {
    this.attackPhase.set('damage');
    this.result.set(null);
    this.roll();
  }

  /** O mestre disse que não passou da CA — encerra sem rolar dano. */
  confirmMiss(): void {
    this.attackResolved.emit(false);
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
      const smiteDice = Array.from({ length: this.smiteExtraDice() }, () => 8);
      return [...weaponDice, ...smiteDice];
    }
    if (this.config.mode === 'ability') {
      const count = this.advantageState() === 'normal' ? 1 : 2;
      return Array.from({ length: count }, () => 20);
    }
    const pool = this.freeformPool();
    return this.dieOptions.flatMap((sides) => Array(pool[sides] ?? 0).fill(sides));
  }

  private finishRoll(sidesList: number[]) {
    const rolls = sidesList.map((s) => this.rollDie(s));
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

    if (this.pendingDamage && this.attackPhase() === 'attack') {
      // Terminou o d20 do ataque — espera a decisão do mestre antes de sinalizar
      // "interação concluída" (rolled) pro componente pai, senão ele fecharia tudo agora.
      this.attackPhase.set('awaiting-hit');
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
        ? 'damage'
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
