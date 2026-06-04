import { Component, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CharacterService } from '../services/character.service';

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

  createSession() {
    this.router.navigate(['/session-create']);
  }

  listSessions() {
    this.router.navigate(['/sessions']);
  }

  joinSession() {
    this.router.navigate(['/session-join']);
  }

  mySessions() {
    this.router.navigate(['/my-sessions']);
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
}
