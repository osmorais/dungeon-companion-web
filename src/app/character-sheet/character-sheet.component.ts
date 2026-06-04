import { Component, inject, input, effect, untracked, signal, HostListener } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { Router } from '@angular/router';
import { CharacterService } from '../services/character.service';
import { Spell, WeaponRow } from '../models/character-options.interface';
import { AvatarPreset } from '../models/avatar-preset.interface';
import { AvatarDisplayComponent } from '../avatar-display/avatar-display.component';
import { AvatarCustomizerComponent } from '../avatar-customizer/avatar-customizer.component';

type MobileTab = 'combat' | 'attrs' | 'skills' | 'traits' | 'equipment' | 'spells' | 'notes';
type DesktopPage = 'sheet' | 'notes';

const NOTES_SEPARATOR = '\n\n[ANOTAÇÕES]\n\n';

@Component({
  selector: 'app-character-sheet',
  standalone: true,
  imports: [CommonModule, KeyValuePipe, AvatarDisplayComponent, AvatarCustomizerComponent],
  templateUrl: './character-sheet.component.html',
  styleUrls: ['./character-sheet.component.scss'],
})
export class CharacterSheetComponent {
  private charService = inject(CharacterService);
  private router = inject(Router);

  id = input<string>();

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
}
