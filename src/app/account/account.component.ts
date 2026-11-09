import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { SkeletonRowsComponent } from '../skeleton/skeleton-rows.component';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AccountService } from '../services/account.service';
import { AuthService } from '../services/auth.service';
import { AccountProfile, FriendPrivacyPreference } from '../models/account.interface';
import { LEGAL_CONTACT_EMAIL, LEGAL_DOC_ROUTES } from '../legal/legal-info';
import { apiErrorMessage } from '../auth/auth-errors';
import { suggestionsFromError } from '../auth/username';
import { UsernameStatusComponent } from '../auth/username-status/username-status.component';

/** Nome do arquivo baixado na exportação, ex.: forja-arcana-meus-dados-2026-10-14.json */
export function exportFileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `forja-arcana-meus-dados-${day}.json`;
}

/**
 * "Minha conta": ver/trocar o nome de usuário, baixar os dados (portabilidade) e excluir a conta —
 * direitos do titular da LGPD (art. 18).
 */
@Component({
  selector: 'app-account',
  standalone: true,
  imports: [FormsModule, RouterLink, SkeletonRowsComponent, UsernameStatusComponent],
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

  private usernameStatus = viewChild(UsernameStatusComponent);
  username = signal('');
  usernameValid = signal(false);
  nameMessage = signal('');
  savingName = signal(false);
  /** Botão só com um nome válido e diferente do atual. */
  canSaveName = computed(() => {
    const current = this.profile()?.username ?? '';
    const typed = this.username().trim();
    return this.usernameValid() && !this.savingName() && typed !== current;
  });

  savingRanking = signal(false);
  rankingMessage = signal('');

  savingFriendPrivacy = signal(false);
  friendPrivacyMessage = signal('');

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
        this.username.set(profile.username ?? '');
      },
      error: () => this.loadError.set(true),
    });
  }

  saveName(): void {
    if (!this.canSaveName()) return;
    this.nameMessage.set('');
    this.savingName.set(true);
    this.accountService.updateUsername(this.username().trim()).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.username.set(profile.username ?? '');
        if (profile.username) this.authService.setCurrentUsername(profile.username);
        this.nameMessage.set('Nome de usuário salvo.');
        this.savingName.set(false);
      },
      error: (err) => {
        if (err?.status === 409) this.usernameStatus()?.showTaken(suggestionsFromError(err));
        this.nameMessage.set(apiErrorMessage(err, 'Não foi possível salvar o nome.'));
        this.savingName.set(false);
      },
    });
  }

  toggleRanking(show: boolean): void {
    this.savePreference(
      'show_in_ranking',
      show,
      this.accountService.updateShowInRanking(show),
      { saving: this.savingRanking, message: this.rankingMessage },
      (profile) =>
        profile.show_in_ranking
          ? 'Seus personagens aparecem no ranking.'
          : 'Seus personagens não aparecem mais no ranking.',
    );
  }

  toggleFriendPrivacy(key: FriendPrivacyPreference, value: boolean): void {
    this.savePreference(
      key,
      value,
      this.accountService.updateFriendPrivacy(key, value),
      { saving: this.savingFriendPrivacy, message: this.friendPrivacyMessage },
      () => 'Preferência salva.',
    );
  }

  togglePresenceVisibility(visible: boolean): void {
    this.savePreference(
      'presence_visibility',
      visible ? 'friends' : 'nobody',
      this.accountService.updatePresenceVisibility(visible),
      { saving: this.savingFriendPrivacy, message: this.friendPrivacyMessage },
      () => 'Preferência salva.',
    );
  }

  /**
   * Aplica a escolha no perfil já no clique e desfaz se salvar falhar. Sem isso o `[ngModel]` não
   * recebe valor novo no erro e a caixa continuaria mostrando o que não foi salvo.
   */
  private savePreference<K extends keyof AccountProfile>(
    key: K,
    value: AccountProfile[K],
    save: Observable<AccountProfile>,
    ui: { saving: WritableSignal<boolean>; message: WritableSignal<string> },
    savedMessage: (profile: AccountProfile) => string,
  ): void {
    const current = this.profile();
    if (!current) return;
    const previous = current[key];
    const setField = (field: AccountProfile[K]) =>
      this.profile.update((profile) => profile && { ...profile, [key]: field });

    ui.message.set('');
    ui.saving.set(true);
    setField(value);
    save.subscribe({
      next: (profile) => {
        this.profile.set(profile);
        ui.message.set(savedMessage(profile));
        ui.saving.set(false);
      },
      error: (err) => {
        setField(previous);
        ui.message.set(apiErrorMessage(err, 'Não foi possível salvar a preferência.'));
        ui.saving.set(false);
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
