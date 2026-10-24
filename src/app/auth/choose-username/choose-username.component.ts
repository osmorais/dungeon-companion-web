import { Component, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AccountService } from '../../services/account.service';
import { apiErrorMessage } from '../auth-errors';
import { suggestionsFromError } from '../username';
import { UsernameStatusComponent } from '../username-status/username-status.component';

/**
 * Escolha do nome de usuário de quem entrou sem um (1.9.0): conta antiga ou criada com o Google.
 * As guardas mandam pra cá antes de qualquer tela logada; ao gravar, segue pra Home.
 */
@Component({
  selector: 'app-choose-username',
  standalone: true,
  imports: [FormsModule, UsernameStatusComponent],
  templateUrl: './choose-username.component.html',
  // Mesmo quadro das telas de acesso (painel centralizado).
  styleUrls: ['../forgot-password/forgot-password.component.scss'],
})
export class ChooseUsernameComponent {
  private auth = inject(AuthService);
  private account = inject(AccountService);
  private router = inject(Router);
  private status = viewChild(UsernameStatusComponent);

  readonly username = signal('');
  readonly valid = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  save(): void {
    if (!this.valid() || this.saving()) return;
    this.errorMessage.set('');
    this.saving.set(true);
    this.account.updateUsername(this.username().trim()).subscribe({
      next: (profile) => {
        this.auth.setCurrentUsername(profile.username ?? this.username().trim());
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.saving.set(false);
        if (err?.status === 409) this.status()?.showTaken(suggestionsFromError(err));
        this.errorMessage.set(apiErrorMessage(err, 'Não foi possível salvar. Tente novamente.'));
      },
    });
  }

  logout(): void {
    this.auth.logout().subscribe();
  }
}
