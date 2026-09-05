import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { CharacterService, HitDieRollResult } from '../services/character.service';
import { CharacterSheetResponse } from '../models/character-response.interface';
import { Skill, Spell, WeaponRow } from '../models/character-options.interface';
import {
  AbilityRollConfig,
  RollConfig,
  RollModalComponent,
} from '../roll-modal/roll-modal.component';

@Component({
  selector: 'app-player-actions-modal',
  standalone: true,
  imports: [CommonModule, KeyValuePipe, RollModalComponent],
  templateUrl: './player-actions-modal.component.html',
  styleUrls: ['./player-actions-modal.component.scss'],
})
export class PlayerActionsModalComponent implements OnInit {
  private charService = inject(CharacterService);

  @Input({ required: true }) idCharacter!: number;
  @Input() fallbackName = 'Personagem';
  @Input() sessionId: string | undefined;
  @Output() closed = new EventEmitter<void>();

  loading = signal(true);
  error = signal(false);
  sheet = signal<CharacterSheetResponse | null>(null);
  activeRoll = signal<RollConfig | null>(null);

  expendingSlot = signal(false);
  restingLong = signal(false);

  ngOnInit(): void {
    this.charService.getCharacterById(this.idCharacter).subscribe({
      next: (sheet) => {
        this.sheet.set(sheet);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  get actorName(): string {
    return this.sheet()?.character_sheet.header.name ?? this.fallbackName;
  }

  close(): void {
    this.closed.emit();
  }

  /** ========================= ROLAGENS ========================= */

  rollSkill(skill: Skill): void {
    const config: AbilityRollConfig = {
      mode: 'ability',
      rollType: 'skill',
      label: `Perícia: ${skill.name}`,
      modifier: skill.total_skill_value,
    };
    this.activeRoll.set(config);
  }

  rollSave(attrKey: string, save: number): void {
    const config: AbilityRollConfig = {
      mode: 'ability',
      rollType: 'save',
      label: `Resistência: ${attrKey}`,
      modifier: save,
    };
    this.activeRoll.set(config);
  }

  rollAttack(weapon: WeaponRow): void {
    const config: AbilityRollConfig = {
      mode: 'ability',
      rollType: 'attack',
      label: `Ataque: ${weapon.name}`,
      modifier: weapon.attack_bonus,
    };
    this.activeRoll.set(config);
  }

  openFreeformRoll(): void {
    this.activeRoll.set({ mode: 'freeform' });
  }

  closeRoll(): void {
    this.activeRoll.set(null);
  }

  /** Ao executar a rolagem (ação concluída), fecha a rolagem e a própria tela de ações. */
  onRolled(): void {
    this.activeRoll.set(null);
    this.closed.emit();
  }

  formatMod(value: number): string {
    return value >= 0 ? `+${value}` : `${value}`;
  }

  sortedSkills(): Skill[] {
    return [...(this.sheet()?.character_sheet.skills ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR'),
    );
  }

  /** ========================= ESPAÇOS DE MAGIA ========================= */

  slotLevels(): string[] {
    const slots = this.sheet()?.character_sheet.spellcasting_info?.slots_total;
    return slots ? Object.keys(slots).sort() : [];
  }

  slotLevelNumber(key: string): number {
    return parseInt(key.replace('level_', ''), 10);
  }

  slotsTotal(key: string): number {
    return this.sheet()?.character_sheet.spellcasting_info?.slots_total?.[key] ?? 0;
  }

  slotsAvailable(key: string): number {
    const info = this.sheet()?.character_sheet.spellcasting_info;
    const total = info?.slots_total?.[key] ?? 0;
    const expended = info?.slots_expended?.[key] ?? 0;
    return Math.max(0, total - expended);
  }

  pipsFor(key: string): number[] {
    return Array.from({ length: this.slotsTotal(key) }, (_, i) => i);
  }

  expendSlot(level: number, delta: number): void {
    if (this.expendingSlot()) return;
    this.expendingSlot.set(true);
    this.charService.updateSpellSlots(this.idCharacter, level, delta).subscribe({
      next: ({ slots_expended }) => {
        this.patchSpellcasting({ slots_expended });
        this.expendingSlot.set(false);
        this.closed.emit();
      },
      error: () => this.expendingSlot.set(false),
    });
  }

  longRestNow(): void {
    if (this.restingLong()) return;
    this.restingLong.set(true);
    this.charService.longRest(this.idCharacter).subscribe({
      next: ({ slots_expended, current_hit_points, hit_dice_spent }) => {
        this.patchSpellcasting({ slots_expended });
        this.patchCombatStats({ hit_dice_spent }, current_hit_points);
        this.lastHitDieResult.set(null);
        this.restingLong.set(false);
        this.closed.emit();
      },
      error: () => this.restingLong.set(false),
    });
  }

  private patchSpellcasting(
    patch: Partial<NonNullable<CharacterSheetResponse['character_sheet']['spellcasting_info']>>,
  ): void {
    const sheet = this.sheet();
    if (!sheet?.character_sheet.spellcasting_info) return;
    this.sheet.set({
      ...sheet,
      character_sheet: {
        ...sheet.character_sheet,
        spellcasting_info: { ...sheet.character_sheet.spellcasting_info, ...patch },
      },
    });
  }

  private patchCombatStats(
    patch: Partial<CharacterSheetResponse['character_sheet']['combat_stats']>,
    currentHp?: number,
  ): void {
    const sheet = this.sheet();
    if (!sheet) return;
    const combat = sheet.character_sheet.combat_stats;
    this.sheet.set({
      ...sheet,
      character_sheet: {
        ...sheet.character_sheet,
        combat_stats: {
          ...combat,
          ...patch,
          hit_points:
            currentHp !== undefined
              ? { ...combat.hit_points, current: currentHp }
              : combat.hit_points,
        },
      },
    });
  }

  /** ========================= DESCANSO CURTO (DADOS DE VIDA) ========================= */

  rollingHitDie = signal(false);
  lastHitDieResult = signal<HitDieRollResult | null>(null);

  hitDiceTotal(): number {
    return this.sheet()?.character_sheet.combat_stats.hit_dice_total ?? 0;
  }

  hitDiceAvailable(): number {
    const stats = this.sheet()?.character_sheet.combat_stats;
    if (!stats) return 0;
    return Math.max(0, stats.hit_dice_total - stats.hit_dice_spent);
  }

  hitDicePips(): number[] {
    return Array.from({ length: this.hitDiceTotal() }, (_, i) => i);
  }

  isAtMaxHp(): boolean {
    const hp = this.sheet()?.character_sheet.combat_stats.hit_points;
    return !!hp && hp.current >= hp.max;
  }

  rollHitDieNow(): void {
    if (this.rollingHitDie()) return;
    this.rollingHitDie.set(true);
    this.charService.rollHitDie(this.idCharacter).subscribe({
      next: (result) => {
        this.lastHitDieResult.set(result);
        this.patchCombatStats({ hit_dice_spent: result.hit_dice_spent }, result.current_hit_points);
        this.rollingHitDie.set(false);
        this.closed.emit();
      },
      error: () => this.rollingHitDie.set(false),
    });
  }

  /** ========================= PREPARAR / CONJURAR MAGIAS ========================= */

  preparedCount(): number {
    return (this.sheet()?.character_sheet.spells ?? []).filter((s) => s.is_prepared).length;
  }

  maxPrepared(): number {
    return this.sheet()?.character_sheet.spellcasting_info?.max_prepared_spells ?? 0;
  }

  canPrepareMore(): boolean {
    return this.preparedCount() < this.maxPrepared();
  }

  togglePrepared(spell: Spell): void {
    const next = !spell.is_prepared;
    if (next && !this.canPrepareMore()) return;
    this.charService.setSpellPrepared(this.idCharacter, spell.id_spell, next).subscribe({
      next: () => this.applyPreparedLocally(spell.id_spell, next),
    });
  }

  private applyPreparedLocally(idSpell: number, isPrepared: boolean): void {
    const sheet = this.sheet();
    if (!sheet) return;
    this.sheet.set({
      ...sheet,
      character_sheet: {
        ...sheet.character_sheet,
        spells: (sheet.character_sheet.spells ?? []).map((s) =>
          s.id_spell === idSpell ? { ...s, is_prepared: isPrepared } : s,
        ),
      },
    });
  }

  isCastable(spell: Spell): boolean {
    if (spell.spellLevel === 0) return false;
    const prepares = this.sheet()?.character_sheet.spellcasting_info?.prepares_spells;
    return !prepares || !!spell.is_prepared;
  }

  availableSlotLevelsFor(spell: Spell): number[] {
    const info = this.sheet()?.character_sheet.spellcasting_info;
    if (!info?.slots_total) return [];
    return Object.keys(info.slots_total)
      .map((k) => this.slotLevelNumber(k))
      .filter((lvl) => lvl >= spell.spellLevel && this.slotsAvailable(`level_${lvl}`) > 0)
      .sort((a, b) => a - b);
  }

  castSpell(spell: Spell, slotLevel: number): void {
    this.expendSlot(slotLevel, 1);
  }
}
