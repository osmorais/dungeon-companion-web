import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-session-create',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './session-create.component.html',
  styleUrls: ['./session-create.component.scss'],
})
export class SessionCreateComponent {
  private router = inject(Router);

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);

  sessionName = signal('');
  maxPlayers = signal<number | null>(null);
  masterName = signal('');
  sessionCode = signal('');

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    this.sessionCode.set(code);
  }

  canGenerate(): boolean {
    return (
      this.sessionName().trim().length > 0 &&
      (this.maxPlayers() ?? 0) > 0 &&
      this.masterName().trim().length > 0
    );
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
