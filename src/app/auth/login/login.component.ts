import { AfterViewInit, Component, ElementRef, HostListener, inject, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements AfterViewInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  @ViewChild('googleBtnDesktop') googleBtnDesktop!: ElementRef<HTMLDivElement>;
  @ViewChild('googleBtnMobile') googleBtnMobile!: ElementRef<HTMLDivElement>;

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  email = '';
  password = '';
  errorMessage = signal('');
  loading = signal(false);
  googleEnabled = !!environment.googleClientId;

  ngAfterViewInit(): void {
    if (!this.googleEnabled) return;
    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (res) => this.handleGoogleCredential(res.credential),
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    const opts = { theme: 'outline' as const, size: 'large' as const, width: 250 };
    if (this.googleBtnDesktop?.nativeElement) {
      google.accounts.id.renderButton(this.googleBtnDesktop.nativeElement, opts);
    }
    if (this.googleBtnMobile?.nativeElement) {
      google.accounts.id.renderButton(this.googleBtnMobile.nativeElement, opts);
    }
  }

  private handleGoogleCredential(idToken: string): void {
    this.errorMessage.set('');
    this.loading.set(true);
    this.authService.googleLogin(idToken).subscribe({
      next: () => this.router.navigate(['/']),
      error: err => {
        this.errorMessage.set(err.error?.message ?? 'Erro ao entrar com Google. Tente novamente.');
        this.loading.set(false);
      },
    });
  }

  submit() {
    this.errorMessage.set('');
    this.loading.set(true);
    this.authService.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/']),
      error: err => {
        this.errorMessage.set(err.error?.message ?? 'Erro ao entrar. Tente novamente.');
        this.loading.set(false);
      },
    });
  }
}
