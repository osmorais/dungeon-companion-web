import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
  ViewChild,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GoogleIdentityService } from '../../services/google-identity.service';
import { environment } from '../../../environments/environment';
import { LEGAL_DOC_ROUTES, LEGAL_MINIMUM_AGE } from '../../legal/legal-info';
import { apiErrorMessage, newPasswordError } from '../auth-errors';
import { suggestionsFromError, usernameFormatError } from '../username';
import { UsernameStatusComponent } from '../username-status/username-status.component';

export const TERMS_NOT_ACCEPTED_MESSAGE = `Para criar a conta, declare ter ${LEGAL_MINIMUM_AGE} anos ou mais e aceite os Termos e a Política de Privacidade.`;

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, RouterLink, UsernameStatusComponent],
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

  private usernameStatus = viewChild(UsernameStatusComponent);

  /** Nome de usuário (1.9.0): obrigatório, único — aparece pra mesa e no ranking. */
  username = signal('');
  usernameValid = signal(false);
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
    // Já tem um cadastro/entrada em andamento: não começa outro em paralelo.
    if (this.loading()) return;
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
    // Enter repetido no último campo (o keyup não respeita o botão desabilitado): um envio só.
    if (this.loading()) return;
    if (!this.ensureTermsAccepted()) return;
    const username = this.username().trim();
    const usernameError = username
      ? usernameFormatError(username)
      : 'Escolha um nome de usuário.';
    if (usernameError || !this.usernameValid()) {
      this.errorMessage.set(usernameError ?? 'Escolha um nome de usuário que esteja livre.');
      return;
    }
    const passwordError = newPasswordError(this.password, this.confirmPassword);
    if (passwordError) {
      this.errorMessage.set(passwordError);
      return;
    }
    this.errorMessage.set('');
    this.loading.set(true);
    this.authService.signup(this.email, this.password, username).subscribe({
      next: () => this.router.navigate(['/']),
      error: err => {
        // Outra pessoa pegou o nome entre a conferência e o envio: mostra as sugestões.
        if (err?.status === 409 && suggestionsFromError(err).length) {
          this.usernameStatus()?.showTaken(suggestionsFromError(err));
        }
        this.errorMessage.set(apiErrorMessage(err, 'Erro ao criar conta. Tente novamente.'));
        this.loading.set(false);
      },
    });
  }
}
