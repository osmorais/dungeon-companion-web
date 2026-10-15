import { AfterViewInit, Component, ElementRef, HostListener, inject, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GoogleIdentityService } from '../../services/google-identity.service';
import { environment } from '../../../environments/environment';
import { LEGAL_DOC_ROUTES, LEGAL_MINIMUM_AGE } from '../../legal/legal-info';
import { apiErrorMessage, newPasswordError } from '../auth-errors';

export const TERMS_NOT_ACCEPTED_MESSAGE = `Para criar a conta, declare ter ${LEGAL_MINIMUM_AGE} anos ou mais e aceite os Termos e a Política de Privacidade.`;

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
  private googleIdentity = inject(GoogleIdentityService);

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
  googleEnabled = signal(!!environment.googleClientId);
  acceptedTerms = signal(false);
  readonly minimumAge = LEGAL_MINIMUM_AGE;
  readonly legalRoutes = LEGAL_DOC_ROUTES;

  ngAfterViewInit(): void {
    if (!this.googleEnabled()) return;
    this.googleIdentity
      .load()
      .then(() => this.renderGoogleButtons())
      // Sem o script (rede/bloqueador), a tela continua funcionando com e-mail e senha.
      .catch(() => this.googleEnabled.set(false));
  }

  private renderGoogleButtons(): void {
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

  /** Bloqueia cadastro (e-mail ou Google) sem a declaração de idade + aceite dos termos. */
  private ensureTermsAccepted(): boolean {
    if (this.acceptedTerms()) return true;
    this.errorMessage.set(TERMS_NOT_ACCEPTED_MESSAGE);
    return false;
  }

  handleGoogleCredential(idToken: string): void {
    // O botão do Google já fica travado sem o aceite (ver google-btn-wrapper--locked); isto é a
    // segunda barreira, caso o callback dispare mesmo assim (ex.: One Tap).
    if (!this.ensureTermsAccepted()) return;
    this.errorMessage.set('');
    this.loading.set(true);
    this.authService.googleLogin(idToken).subscribe({
      next: () => this.router.navigate(['/']),
      error: err => {
        this.errorMessage.set(apiErrorMessage(err, 'Erro ao entrar com Google. Tente novamente.'));
        this.loading.set(false);
      },
    });
  }

  submit() {
    if (!this.ensureTermsAccepted()) return;
    const passwordError = newPasswordError(this.password, this.confirmPassword);
    if (passwordError) {
      this.errorMessage.set(passwordError);
      return;
    }
    this.errorMessage.set('');
    this.loading.set(true);
    this.authService.signup(this.email, this.password, this.fullName || undefined).subscribe({
      next: () => this.router.navigate(['/']),
      error: err => {
        this.errorMessage.set(apiErrorMessage(err, 'Erro ao criar conta. Tente novamente.'));
        this.loading.set(false);
      },
    });
  }
}
