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

const DIE_OPTIONS = [4, 6, 8, 10, 12, 20, 100];
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
  /** Emite o resultado bruto assim que a rolagem termina, independente de ser postada na sessão. */
  @Output() rolled = new EventEmitter<{ rolls: number[]; modifier: number; total: number }>();

  readonly dieOptions = DIE_OPTIONS;

  advantageState = signal<AdvantageState>('normal');
  freeformSides = signal(6);
  freeformCount = signal(1);
  freeformModifier = signal(0);

  isRolling = signal(false);
  displayValues = signal<number[]>([]);
  result = signal<RollResult | null>(null);
  posting = signal(false);
  postFailed = signal(false);

  get isAbility(): boolean {
    return this.config.mode === 'ability';
  }

  get title(): string {
    return this.config.mode === 'ability' ? this.config.label : 'Rolagem de Dados';
  }

  get sides(): number {
    return this.config.mode === 'ability' ? 20 : this.freeformSides();
  }

  get diceCount(): number {
    if (this.config.mode === 'ability') {
      return this.advantageState() === 'normal' ? 1 : 2;
    }
    return this.freeformCount();
  }

  get modifier(): number {
    return this.config.mode === 'ability' ? this.config.modifier : this.freeformModifier();
  }

  placeholderIndexes(): number[] {
    return Array.from({ length: this.diceCount }, (_, i) => i);
  }

  setAdvantage(state: AdvantageState) {
    if (this.isRolling()) return;
    this.advantageState.set(state);
    this.result.set(null);
  }

  setFreeformSides(sides: number) {
    if (this.isRolling()) return;
    this.freeformSides.set(sides);
    this.result.set(null);
  }

  changeFreeformCount(delta: number) {
    if (this.isRolling()) return;
    this.freeformCount.update((c) => Math.min(4, Math.max(1, c + delta)));
    this.result.set(null);
  }

  changeFreeformModifier(delta: number) {
    if (this.isRolling()) return;
    this.freeformModifier.update((m) => m + delta);
    this.result.set(null);
  }

  roll() {
    if (this.isRolling()) return;
    this.result.set(null);
    this.postFailed.set(false);
    this.isRolling.set(true);

    const sides = this.sides;
    const count = this.diceCount;
    this.displayValues.set(Array.from({ length: count }, () => 1));

    let ticks = 0;
    const interval = setInterval(() => {
      this.displayValues.set(Array.from({ length: count }, () => this.rollDie(sides)));
      ticks++;
      if (ticks >= ROLL_TICKS) {
        clearInterval(interval);
        this.finishRoll(sides, count);
      }
    }, ROLL_TICK_MS);
  }

  isDropped(value: number): boolean {
    const res = this.result();
    if (!res || !this.isAbility || res.rolls.length < 2) return false;
    return !res.chosen.includes(value);
  }

  criticalFor(value: number): 'high' | 'low' | null {
    if (!this.isAbility) return null;
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

  private finishRoll(sides: number, count: number) {
    const rolls = Array.from({ length: count }, () => this.rollDie(sides));
    this.displayValues.set(rolls);

    let chosen: number[];
    if (this.config.mode === 'ability') {
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
    this.rolled.emit({ rolls, modifier: this.modifier, total });
    this.postRoll(rolls, total);
  }

  private rollDie(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
  }

  private postRoll(rolls: number[], total: number) {
    if (!this.sessionId) return;

    const rollType: RollType = this.config.mode === 'ability' ? this.config.rollType : 'dice';
    const label = this.title;
    const diceNotation =
      this.config.mode === 'ability' ? '1d20' : `${this.diceCount}d${this.sides}`;

    const payload: RollLogPayload = {
      id_character: this.idCharacter,
      actor_name: this.actorName,
      roll_type: rollType,
      label,
      dice_notation: diceNotation,
      rolls,
      advantage_state: this.config.mode === 'ability' ? this.advantageState() : 'normal',
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
