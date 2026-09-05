import { Component, inject, input, effect, untracked, signal, HostListener } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { Router } from '@angular/router';
import { CharacterService, HitDieRollResult } from '../services/character.service';
import { Skill, Spell, WeaponRow } from '../models/character-options.interface';
import { CharacterSheetResponse } from '../models/character-response.interface';
import { AvatarPreset } from '../models/avatar-preset.interface';
import { AvatarDisplayComponent } from '../avatar-display/avatar-display.component';
import { AvatarCustomizerComponent } from '../avatar-customizer/avatar-customizer.component';
import { AbilityRollConfig, RollConfig, RollModalComponent } from '../roll-modal/roll-modal.component';

type MobileTab = 'combat' | 'attrs' | 'skills' | 'traits' | 'equipment' | 'spells' | 'notes';
type DesktopPage = 'sheet' | 'notes';

const NOTES_SEPARATOR = '\n\n[ANOTAÇÕES]\n\n';

@Component({
  selector: 'app-character-sheet',
  standalone: true,
  imports: [CommonModule, KeyValuePipe, AvatarDisplayComponent, AvatarCustomizerComponent, RollModalComponent],
  templateUrl: './character-sheet.component.html',
  styleUrls: ['./character-sheet.component.scss'],
})
export class CharacterSheetComponent {
  private charService = inject(CharacterService);
  private router = inject(Router);

  id = input<string>();
  /** Id da sessão ativa (opcional, vem via ?session=... quando aberto a partir do painel de sessão). */
  session = input<string>();

  sheetData = this.charService.currentCharacter;
  avatarUrl = this.charService.avatarUrl;
  loading = signal(false);
  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);
  activeTab = signal<MobileTab>('combat');
  desktopPage = signal<DesktopPage>('sheet');

  historyText = signal('');
  notesText = signal('');
  savingNotes = signal(false);
  notesSaved = signal(false);
  savingHp = signal(false);
  hpSaved = signal(false);
  printingSheet = signal(false);

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  setTab(tab: MobileTab) {
    this.activeTab.set(tab);
  }

  constructor() {
    effect(() => {
      const paramId = this.id();
      untracked(() => {
        if (paramId) {
          this.loading.set(true);
          this.charService.currentCharacter.set(null);
          const id = +paramId;
          forkJoin({
            sheet: this.charService.getCharacterById(id),
            background: this.charService.getCharacterBackground(id).pipe(catchError(() => of(null))),
          }).subscribe({
            next: ({ sheet, background }) => {
              this.charService.currentCharacter.set(sheet);
              this.initNotesFields(background?.full_history ?? '');
              this.loading.set(false);
            },
            error: () => this.loading.set(false),
          });
        }
      });
    });
  }

  private initNotesFields(fullHistory: string): void {
    const parts = fullHistory.split(NOTES_SEPARATOR);
    this.historyText.set(parts[0] ?? '');
    this.notesText.set(parts[1] ?? '');
  }

  saveNotes(): void {
    const idCharacter = this.sheetData()?.character_sheet.id_character;
    if (!idCharacter) return;

    this.savingNotes.set(true);
    const fullHistory = this.historyText() + NOTES_SEPARATOR + this.notesText();

    this.charService.updateNotes({ id_character: idCharacter, full_history: fullHistory }).subscribe({
      next: () => {
        this.savingNotes.set(false);
        this.notesSaved.set(true);
        setTimeout(() => this.notesSaved.set(false), 3000);
      },
      error: () => this.savingNotes.set(false),
    });
  }

  printSheet(): void {
    const id = this.sheetData()?.character_sheet.id_character;
    if (!id) return;

    this.printingSheet.set(true);
    this.charService.printCharacter(id).subscribe({
      next: html => {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        if (!win) alert('Permita pop-ups para abrir a ficha de impressão.');
        this.printingSheet.set(false);
      },
      error: () => this.printingSheet.set(false),
    });
  }

  goBack() {
    this.router.navigate(['/characters']);
  }

  changeHp(delta: number) {
    const sheet = this.sheetData();
    if (!sheet) return;
    const hp = sheet.character_sheet.combat_stats.hit_points;
    const next = Math.min(hp.max, Math.max(0, hp.current + delta));
    this.charService.currentCharacter.set({
      ...sheet,
      character_sheet: {
        ...sheet.character_sheet,
        combat_stats: {
          ...sheet.character_sheet.combat_stats,
          hit_points: { ...hp, current: next },
        },
      },
    });
  }

  saveHp(): void {
    const sheet = this.sheetData();
    const id = sheet?.character_sheet.id_character;
    if (!sheet || !id) return;
    const currentHp = sheet.character_sheet.combat_stats.hit_points.current;

    this.savingHp.set(true);
    this.charService.updateHp(id, currentHp).subscribe({
      next: () => {
        this.savingHp.set(false);
        this.hpSaved.set(true);
        setTimeout(() => this.hpSaved.set(false), 3000);
      },
      error: () => this.savingHp.set(false),
    });
  }

  formatMod(value: number): string {
    return value >= 0 ? `+${value}` : `${value}`;
  }

  sortedSkills(): Skill[] {
    return [...(this.sheetData()?.character_sheet.skills ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR'),
    );
  }

  spellComponents(spell: Spell): string {
    return [spell.is_verbal ? 'V' : '', spell.is_somatic ? 'S' : '', spell.is_material ? 'M' : '']
      .filter(Boolean)
      .join(', ') || '—';
  }

  selectedSpell: Spell | null = null;

  openSpellModal(spell: Spell) {
    this.selectedSpell = spell;
  }

  closeSpellModal() {
    this.selectedSpell = null;
  }

  selectedWeapon: WeaponRow | null = null;

  openWeaponModal(weapon: WeaponRow) {
    this.selectedWeapon = weapon;
  }

  closeWeaponModal() {
    this.selectedWeapon = null;
  }

  /** ========================= ESPAÇOS DE MAGIA ========================= */

  expendingSlot = signal(false);
  restingLong = signal(false);

  slotLevels(): string[] {
    const slots = this.sheetData()?.character_sheet.spellcasting_info?.slots_total;
    return slots ? Object.keys(slots).sort() : [];
  }

  slotLevelNumber(key: string): number {
    return parseInt(key.replace('level_', ''), 10);
  }

  slotsTotal(key: string): number {
    return this.sheetData()?.character_sheet.spellcasting_info?.slots_total?.[key] ?? 0;
  }

  slotsAvailable(key: string): number {
    const info = this.sheetData()?.character_sheet.spellcasting_info;
    const total = info?.slots_total?.[key] ?? 0;
    const expended = info?.slots_expended?.[key] ?? 0;
    return Math.max(0, total - expended);
  }

  pipsFor(key: string): number[] {
    return Array.from({ length: this.slotsTotal(key) }, (_, i) => i);
  }

  expendSlot(level: number, delta: number): void {
    const id = this.sheetData()?.character_sheet.id_character;
    if (!id || this.expendingSlot()) return;
    this.expendingSlot.set(true);
    this.charService.updateSpellSlots(id, level, delta).subscribe({
      next: ({ slots_expended }) => {
        this.patchSpellcastingInfo({ slots_expended });
        this.expendingSlot.set(false);
      },
      error: () => this.expendingSlot.set(false),
    });
  }

  longRestNow(): void {
    const id = this.sheetData()?.character_sheet.id_character;
    if (!id || this.restingLong()) return;
    this.restingLong.set(true);
    this.charService.longRest(id).subscribe({
      next: ({ slots_expended, current_hit_points, hit_dice_spent }) => {
        this.patchSpellcastingInfo({ slots_expended });
        this.patchCombatStats({ hit_dice_spent }, current_hit_points);
        this.lastHitDieResult.set(null);
        this.restingLong.set(false);
      },
      error: () => this.restingLong.set(false),
    });
  }

  private patchSpellcastingInfo(
    patch: Partial<NonNullable<CharacterSheetResponse['character_sheet']['spellcasting_info']>>,
  ): void {
    const sheet = this.sheetData();
    if (!sheet?.character_sheet.spellcasting_info) return;
    this.charService.currentCharacter.set({
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
    const sheet = this.sheetData();
    if (!sheet) return;
    const combat = sheet.character_sheet.combat_stats;
    this.charService.currentCharacter.set({
      ...sheet,
      character_sheet: {
        ...sheet.character_sheet,
        combat_stats: {
          ...combat,
          ...patch,
          hit_points: currentHp !== undefined ? { ...combat.hit_points, current: currentHp } : combat.hit_points,
        },
      },
    });
  }

  /** ========================= DESCANSO CURTO (DADOS DE VIDA) ========================= */

  rollingHitDie = signal(false);
  lastHitDieResult = signal<HitDieRollResult | null>(null);

  hitDiceTotal(): number {
    return this.sheetData()?.character_sheet.combat_stats.hit_dice_total ?? 0;
  }

  hitDiceAvailable(): number {
    const stats = this.sheetData()?.character_sheet.combat_stats;
    if (!stats) return 0;
    return Math.max(0, stats.hit_dice_total - stats.hit_dice_spent);
  }

  hitDicePips(): number[] {
    return Array.from({ length: this.hitDiceTotal() }, (_, i) => i);
  }

  isAtMaxHp(): boolean {
    const hp = this.sheetData()?.character_sheet.combat_stats.hit_points;
    return !!hp && hp.current >= hp.max;
  }

  rollHitDieNow(): void {
    const id = this.sheetData()?.character_sheet.id_character;
    if (!id || this.rollingHitDie()) return;
    this.rollingHitDie.set(true);
    this.charService.rollHitDie(id).subscribe({
      next: result => {
        this.lastHitDieResult.set(result);
        this.patchCombatStats({ hit_dice_spent: result.hit_dice_spent }, result.current_hit_points);
        this.rollingHitDie.set(false);
      },
      error: () => this.rollingHitDie.set(false),
    });
  }

  /** ========================= PREPARAR / CONJURAR MAGIAS ========================= */

  preparedCount(): number {
    return (this.sheetData()?.character_sheet.spells ?? []).filter(s => s.is_prepared).length;
  }

  maxPrepared(): number {
    return this.sheetData()?.character_sheet.spellcasting_info?.max_prepared_spells ?? 0;
  }

  canPrepareMore(): boolean {
    return this.preparedCount() < this.maxPrepared();
  }

  togglePrepared(spell: Spell): void {
    const id = this.sheetData()?.character_sheet.id_character;
    if (!id) return;
    const next = !spell.is_prepared;
    if (next && !this.canPrepareMore()) return;

    this.charService.setSpellPrepared(id, spell.id_spell, next).subscribe({
      next: () => this.applySpellPreparedLocally(spell.id_spell, next),
    });
  }

  private applySpellPreparedLocally(idSpell: number, isPrepared: boolean): void {
    const sheet = this.sheetData();
    if (!sheet) return;
    this.charService.currentCharacter.set({
      ...sheet,
      character_sheet: {
        ...sheet.character_sheet,
        spells: (sheet.character_sheet.spells ?? []).map(s =>
          s.id_spell === idSpell ? { ...s, is_prepared: isPrepared } : s,
        ),
      },
    });
    if (this.selectedSpell?.id_spell === idSpell) {
      this.selectedSpell = { ...this.selectedSpell, is_prepared: isPrepared };
    }
  }

  isCastable(spell: Spell): boolean {
    if (spell.spellLevel === 0) return false;
    const prepares = this.sheetData()?.character_sheet.spellcasting_info?.prepares_spells;
    return !prepares || !!spell.is_prepared;
  }

  availableSlotLevelsFor(spell: Spell): number[] {
    const info = this.sheetData()?.character_sheet.spellcasting_info;
    if (!info?.slots_total) return [];
    return Object.keys(info.slots_total)
      .map(k => this.slotLevelNumber(k))
      .filter(lvl => lvl >= spell.spellLevel && this.slotsAvailable(`level_${lvl}`) > 0)
      .sort((a, b) => a - b);
  }

  castSpell(spell: Spell, slotLevel: number): void {
    this.expendSlot(slotLevel, 1);
  }

  /** ========================= AVATAR EDITOR ========================= */

  showAvatarEditor = signal(false);
  editingPreset = signal<AvatarPreset | null>(null);
  savingAvatar = signal(false);

  openAvatarEditor(): void {
    const preset = this.sheetData()?.character_sheet.avatar_preset;
    if (!preset) return;
    this.editingPreset.set({ ...preset });
    this.showAvatarEditor.set(true);
  }

  onEditPresetChange(preset: AvatarPreset): void {
    this.editingPreset.set(preset);
  }

  saveAvatarPreset(): void {
    const preset = this.editingPreset();
    const id = this.sheetData()?.character_sheet.id_character;
    if (!preset || !id) return;

    this.savingAvatar.set(true);
    this.charService.updateAvatarPreset(id, preset).subscribe({
      next: () => {
        const sheet = this.sheetData();
        if (sheet) {
          this.charService.currentCharacter.set({
            ...sheet,
            character_sheet: { ...sheet.character_sheet, avatar_preset: preset },
          });
        }
        this.showAvatarEditor.set(false);
        this.savingAvatar.set(false);
      },
      error: () => this.savingAvatar.set(false),
    });
  }

  closeAvatarEditor(): void {
    this.showAvatarEditor.set(false);
    this.editingPreset.set(null);
  }

  /** ========================= ROLAGENS ========================= */

  activeRoll = signal<RollConfig | null>(null);

  get actorName(): string {
    return this.sheetData()?.character_sheet.header.name ?? 'Aventureiro';
  }

  get idCharacterForRoll(): number | null {
    return this.sheetData()?.character_sheet.id_character ?? null;
  }

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
}
