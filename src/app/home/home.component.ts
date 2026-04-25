import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CharacterService } from '../services/character.service';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  private router = inject(Router);
  private charService = inject(CharacterService);

  createCharacter() {
    this.charService.getCharacterOptions().subscribe({
      next: options => {
        this.charService.cachedOptions.set(options);
        this.router.navigate(['/create']);
      },
      error: () => this.router.navigate(['/create']),
    });
  }

  listCharacters() {
    this.router.navigate(['/characters']);
  }
}
