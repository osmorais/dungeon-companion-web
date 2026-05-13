import { AfterViewInit, Component, ElementRef, HostListener, inject, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent implements AfterViewInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  @ViewChild('googleBtnDesktop') googleBtnDesktop!: ElementRef<HTMLDivElement>;
  @ViewChild('googleBtnMobile') googleBtnMobile!: ElementRef<HTMLDivElement>;

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
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
    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('As senhas não coincidem.');
      return;
    }
    this.errorMessage.set('');
    this.loading.set(true);
    this.authService.signup(this.email, this.password, this.fullName || undefined).subscribe({
      next: () => this.router.navigate(['/']),
      error: err => {
        this.errorMessage.set(err.error?.message ?? 'Erro ao criar conta. Tente novamente.');
        this.loading.set(false);
      },
    });
  }
}
