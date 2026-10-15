import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AccountService } from '../services/account.service';
import { AuthService } from '../services/auth.service';
import { AccountProfile } from '../models/account.interface';
import { LEGAL_CONTACT_EMAIL, LEGAL_DOC_ROUTES } from '../legal/legal-info';
import { apiErrorMessage } from '../auth/auth-errors';

/** Nome do arquivo baixado na exportação, ex.: forja-arcana-meus-dados-2026-10-14.json */
export function exportFileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `forja-arcana-meus-dados-${day}.json`;
}

/**
 * "Minha conta": ver/corrigir o nome, baixar os dados (portabilidade) e excluir a conta —
 * direitos do titular da LGPD (art. 18).
 */
@Component({
  selector: 'app-account',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss'],
})
export class AccountComponent implements OnInit {
  private accountService = inject(AccountService);
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly contactEmail = LEGAL_CONTACT_EMAIL;
  readonly legalRoutes = LEGAL_DOC_ROUTES;

  profile = signal<AccountProfile | null>(null);
  loadError = signal(false);

  fullName = signal('');
  nameMessage = signal('');
  savingName = signal(false);

  exporting = signal(false);
  exportError = signal('');

  confirmEmail = signal('');
  password = signal('');
  acknowledged = signal(false);
  deleting = signal(false);
  deleteError = signal('');

  /** Só libera o botão com o e-mail digitado, a senha (se a conta tiver) e a ciência marcada. */
  canDelete = computed(() => {
    const profile = this.profile();
    if (!profile || this.deleting() || !this.acknowledged()) return false;
    if (this.confirmEmail().trim().toLowerCase() !== profile.email.trim().toLowerCase()) {
      return false;
    }
    return !profile.has_password || this.password().length > 0;
  });

  ngOnInit(): void {
    this.accountService.getProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.fullName.set(profile.full_name ?? '');
      },
      error: () => this.loadError.set(true),
    });
  }

  saveName(): void {
    this.nameMessage.set('');
    this.savingName.set(true);
    const name = this.fullName().trim();
    this.accountService.updateFullName(name.length ? name : null).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.fullName.set(profile.full_name ?? '');
        this.nameMessage.set('Nome salvo.');
        this.savingName.set(false);
      },
      error: (err) => {
        this.nameMessage.set(apiErrorMessage(err, 'Não foi possível salvar o nome.'));
        this.savingName.set(false);
      },
    });
  }

  exportData(): void {
    this.exportError.set('');
    this.exporting.set(true);
    this.accountService.exportData().subscribe({
      next: (data) => {
        this.downloadJson(data, exportFileName(new Date()));
        this.exporting.set(false);
      },
      error: () => {
        this.exportError.set('Não foi possível gerar o arquivo. Tente novamente.');
        this.exporting.set(false);
      },
    });
  }

  deleteAccount(): void {
    const profile = this.profile();
    if (!profile || !this.canDelete()) return;
    this.deleteError.set('');
    this.deleting.set(true);
    this.accountService
      .deleteAccount({
        confirm_email: this.confirmEmail().trim(),
        ...(profile.has_password ? { password: this.password() } : {}),
      })
      .subscribe({
        // Conta não existe mais: limpa o token local e volta pro login.
        next: () => this.authService.clearSession(),
        error: (err) => {
          this.deleteError.set(
            apiErrorMessage(err, 'Não foi possível excluir a conta. Tente novamente.'),
          );
          this.deleting.set(false);
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  private downloadJson(data: object, fileName: string): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }
}
