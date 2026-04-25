import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CharacterService } from '../services/character.service';
import { CharacterSummary } from '../models/character-summary.interface';

@Component({
  selector: 'app-character-list',
  standalone: true,
  templateUrl: './character-list.component.html',
  styleUrls: ['./character-list.component.scss'],
})
export class CharacterListComponent implements OnInit {
  private router = inject(Router);
  private charService = inject(CharacterService);

  characters = signal<CharacterSummary[]>([]);
  error = signal(false);

  ngOnInit() {
    this.charService.getCharacters().subscribe({
      next: list => this.characters.set(list),
      error: () => this.error.set(true),
    });
  }

  openSheet(id: number) {
    this.router.navigate(['/character-sheet', id]);
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
