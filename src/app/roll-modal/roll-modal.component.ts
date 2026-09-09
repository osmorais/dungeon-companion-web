import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { GameSessionService } from '../services/game-session.service';
import { AdvantageState, RollLogPayload, RollType } from '../models/game-session.interface';
import { PixelDieComponent } from '../pixel-die/pixel-die.component';
import { PixelNumericDieComponent } from '../pixel-numeric-die/pixel-numeric-die.component';

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
  damage?: { diceCount: number; diceSides: number; modifier: number; label: string };
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

type AttackPhase = 'attack' | 'awaiting-hit' | 'damage';

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
  @Output() closed = new EventEmitter<void>();
  /** Emite quando a interação termina de vez (não a cada rolagem — ver finishRoll/confirmMiss). */
  @Output() rolled = new EventEmitter<{ rolls: number[]; modifier: number; total: number }>();

  readonly dieOptions = DIE_OPTIONS;

  advantageState = signal<AdvantageState>('normal');
  /** Bandeja de dados livres: quantos de cada lado (ex: {6: 3, 12: 1, ...} = 3d6 + 1d12). Começa
   *  com todos os tipos presentes (zerados, exceto 1d6) pra sempre ter valor definido no template. */
  freeformPool = signal<Record<number, number>>(
    Object.fromEntries(DIE_OPTIONS.map((d) => [d, d === 6 ? 1 : 0])),
  );
  freeformModifier = signal(0);

  /** Fase do fluxo de ataque — só avança além de 'attack' quando config.damage existe. */
  attackPhase = signal<AttackPhase>('attack');

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

  /** true só pro d20 de teste de habilidade — falso durante a sub-rolagem de dano do ataque. */
  get isAbility(): boolean {
    return this.config.mode === 'ability' && this.attackPhase() !== 'damage';
  }

  get title(): string {
    if (this.attackPhase() === 'damage' && this.pendingDamage) return this.pendingDamage.label;
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

  /** O mestre confirmou que o ataque passou da CA — rola o dado de dano da arma, no mesmo modal. */
  rollDamageNow(): void {
    if (!this.pendingDamage) return;
    this.attackPhase.set('damage');
    this.result.set(null);
    this.roll();
  }

  /** O mestre disse que não passou da CA — encerra sem rolar dano. */
  confirmMiss(): void {
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
      return Array.from({ length: diceCount }, () => diceSides);
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
