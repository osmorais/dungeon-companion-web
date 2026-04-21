import { Component, inject } from '@angular/core';
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

  sheetData = this.charService.currentCharacter;
  avatarUrl = this.charService.avatarUrl;

  goBack() {
    this.router.navigate(['/']);
  }

  formatMod(value: number): string {
    return value >= 0 ? `+${value}` : `${value}`;
  }
}
