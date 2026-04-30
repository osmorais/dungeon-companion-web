import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CharacterService } from '../services/character.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  private router = inject(Router);
  private charService = inject(CharacterService);
  protected authService = inject(AuthService);

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

  logout() {
    this.authService.logout().subscribe();
  }
}
