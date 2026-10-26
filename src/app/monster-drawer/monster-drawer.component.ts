import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameCardComponent } from '../game-card/game-card.component';
import { monsterToCard } from '../game-card/monster-card';
import {
  MonsterAbilityKey,
  MonsterActionOp,
  MonsterActionState,
  MonsterSession,
  RechargeRoll,
} from '../models/game-session.interface';
import {
  MonsterActionsComponent,
  MonsterRollRequest,
} from '../monster-actions/monster-actions.component';
import { isMechanicalStatBlock } from '../monster-actions/monster-actions';
import { challengeRatingText, monsterSpeedText } from '../services/monster-format';
import { monsterDisplayName } from '../session-panel/monster-display-name';

/** Rascunho do EDITAR STATUS (o mesmo da sessão, que salva). */
export type MonsterStatsDraft = {
  custom_name: string;
  hp_current: number;
  hp_max: number;
  ac: number;
} & Record<MonsterAbilityKey, number>;

const ABILITY_FIELDS: { key: MonsterAbilityKey; label: string }[] = [
  { key: 'strength', label: 'FOR' },
  { key: 'dexterity', label: 'DES' },
  { key: 'constitution', label: 'CON' },
  { key: 'intelligence', label: 'INT' },
  { key: 'wisdom', label: 'SAB' },
  { key: 'charisma', label: 'CAR' },
];

/**
 * Ficha do monstro na gaveta de baixo (1.13.0), só do mestre — no lugar do modal, com o mesmo
 * visual da gaveta de ações dos personagens (estilos de player-actions-modal e bottom-drawer):
 * barra com a imagem, faixa da vez, destaque (PV, CA, ND, deslocamento, dano/cura, finalizar
 * turno, revelar, editar) e três colunas — MONSTRO (carta com a descrição, imagem, atributos,
 * defesas), AÇÕES e TESTES. Só desenha: quem grava é a sessão.
 */
@Component({
  selector: 'app-monster-drawer',
  standalone: true,
  imports: [FormsModule, GameCardComponent, MonsterActionsComponent],
  templateUrl: './monster-drawer.component.html',
  styleUrls: [
    '../bottom-drawer/bottom-drawer.scss',
    '../player-actions-modal/player-actions-modal.component.scss',
    './monster-drawer.component.scss',
  ],
})
export class MonsterDrawerComponent {
  @Input({ required: true }) set monster(value: MonsterSession) {
    this.monsterSig.set(value);
  }
  get monster(): MonsterSession {
    return this.monsterSig()!;
  }
  @Input() isTurn = false;
  @Input() canEndTurn = false;
  @Input() endingTurn = false;
  @Input() revealing = false;
  @Input() defeating = false;
  @Input() actionState: MonsterActionState | null = null;
  @Input() rechargeRolls: RechargeRoll[] | null = null;
  @Input() actionError: string | null = null;
  @Input() editing = false;
  @Input() draft: MonsterStatsDraft | null = null;
  @Input() saving = false;
  @Input() statsError: string | null = null;
  @Input() uploadingImage = false;
  @Input() imageError: string | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() endTurn = new EventEmitter<void>();
  @Output() toggleReveal = new EventEmitter<Event>();
  /** DERROTAR: a sessão abre a distribuição de XP e só então tira o monstro. */
  @Output() defeat = new EventEmitter<void>();
  @Output() roll = new EventEmitter<MonsterRollRequest>();
  @Output() op = new EventEmitter<MonsterActionOp>();
  @Output() hp = new EventEmitter<{ kind: 'damage' | 'heal'; amount: number }>();
  @Output() startEdit = new EventEmitter<void>();
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() draftName = new EventEmitter<string>();
  @Output() draftNumber = new EventEmitter<{
    field: 'hp_current' | 'hp_max' | 'ac';
    value: string | number;
  }>();
  @Output() draftAbility = new EventEmitter<{ field: MonsterAbilityKey; value: string | number }>();
  @Output() saveStats = new EventEmitter<void>();
  @Output() imageSelected = new EventEmitter<Event>();

  private readonly monsterSig = signal<MonsterSession | null>(null);
  readonly abilityFields = ABILITY_FIELDS;
  readonly crText = challengeRatingText;
  readonly speedText = monsterSpeedText;

  readonly name = computed(() => monsterDisplayName(this.monsterSig()!));
  readonly card = computed(() => {
    const m = this.monsterSig()!;
    return monsterToCard({
      name: monsterDisplayName(m),
      imageUrl: m.image_url,
      monsterType: m.data_snapshot.type,
      size: m.data_snapshot.size,
      lore: m.lore,
    });
  });
  readonly mechanical = computed(() => isMechanicalStatBlock(this.monsterSig()!.data_snapshot));

  /** Quantidade digitada pro DANO/CURA no PV do monstro. */
  readonly hpAmount = signal(0);

  setHpAmount(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    this.hpAmount.set(Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : 0);
  }

  submitHp(kind: 'damage' | 'heal', amount = this.hpAmount()): void {
    if (amount <= 0) return;
    this.hp.emit({ kind, amount });
    this.hpAmount.set(0);
  }

  abilityScore(key: MonsterAbilityKey): number {
    return this.monster.data_snapshot[key];
  }

  modifier(score: number): string {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }
}
