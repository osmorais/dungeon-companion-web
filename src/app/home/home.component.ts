import { Component, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CharacterService } from '../services/character.service';
import { AuthService } from '../services/auth.service';

type HomeView = 'select' | 'player' | 'master';

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
  view = signal<HomeView>('select');

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  selectPlayer() {
    this.view.set('player');
  }

  selectMaster() {
    this.view.set('master');
  }

  goBack() {
    this.view.set('select');
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
