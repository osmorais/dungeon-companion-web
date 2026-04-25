import { Component, inject, input, effect, untracked, signal } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { Router } from '@angular/router';
import { CharacterService } from '../services/character.service';

@Component({
  selector: 'app-character-sheet',
  standalone: true,
  imports: [CommonModule, KeyValuePipe],
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

  constructor() {
    effect(() => {
      const paramId = this.id();
      untracked(() => {
        if (paramId) {
          this.loading.set(true);
          this.charService.currentCharacter.set(null);
          this.charService.getCharacterById(+paramId).subscribe({
            next: sheet => {
              this.charService.currentCharacter.set(sheet);
              this.loading.set(false);
            },
            error: () => this.loading.set(false),
          });
        }
      });
    });
  }

  goBack() {
    this.router.navigate(['/']);
  }

  formatMod(value: number): string {
    return value >= 0 ? `+${value}` : `${value}`;
  }
}
