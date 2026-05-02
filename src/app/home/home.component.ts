import { Component, HostListener, inject, signal } from '@angular/core';
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

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

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
