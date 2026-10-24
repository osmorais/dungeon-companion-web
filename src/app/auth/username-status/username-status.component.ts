import { Component, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { usernameFormatError } from '../username';

export type UsernameState =
  | 'empty'
  | 'checking'
  | 'available'
  | 'current'
  | 'taken'
  | 'invalid'
  | 'unknown';

/** Espera depois da última tecla antes de perguntar à API. */
export const USERNAME_CHECK_DEBOUNCE_MS = 400;

/**
 * Situação do nome de usuário digitado, logo abaixo do campo (o `<input>` fica na tela, com o
 * estilo dela): confere na API enquanto a pessoa digita, mostra o erro de formato e as sugestões
 * quando o nome está em uso (clicar numa troca o valor). Usado no cadastro, na escolha do
 * primeiro acesso e em Minha Conta. A API confere de novo ao gravar.
 */
@Component({
  selector: 'app-username-status',
  standalone: true,
  templateUrl: './username-status.component.html',
  styleUrls: ['./username-status.component.scss'],
})
export class UsernameStatusComponent {
  private auth = inject(AuthService);

  /** O que está no campo. */
  readonly username = input('');
  /** Nome atual da própria pessoa (Minha Conta): conta como válido, sem perguntar à API. */
  readonly current = input<string | null>(null);
  /** Clicou numa sugestão. */
  readonly pick = output<string>();
  /** Pode gravar? (livre, o nome atual, ou não deu pra conferir — a API decide no fim). */
  readonly validChange = output<boolean>();

  readonly state = signal<UsernameState>('empty');
  readonly formatError = signal<string | null>(null);
  readonly suggestions = signal<string[]>([]);

  constructor() {
    toObservable(this.username)
      .pipe(
        map((raw) => raw.trim()),
        distinctUntilChanged(),
        tap((name) => this.applyLocal(name)),
        debounceTime(USERNAME_CHECK_DEBOUNCE_MS),
        switchMap((name) => {
          if (this.state() !== 'checking' && this.state() !== 'invalid') return of(null);
          return this.auth.checkUsername(name).pipe(catchError(() => of(undefined)));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (result === null) return;
        if (result === undefined) {
          // Sem resposta (rede, limite de tentativas): não trava; a API confere ao gravar.
          if (this.state() === 'checking') this.setState('unknown');
          return;
        }
        if (result.username !== this.username().trim()) return;
        this.suggestions.set(result.suggestions);
        if (this.state() === 'checking') this.setState(result.available ? 'available' : 'taken');
      });
  }

  /** O que dá pra decidir sem a API: vazio, formato e o próprio nome atual. */
  private applyLocal(name: string): void {
    this.suggestions.set([]);
    const error = name ? usernameFormatError(name) : null;
    this.formatError.set(error);
    if (!name) this.setState('empty');
    else if (error) this.setState('invalid');
    else if (name.toLowerCase() === (this.current() ?? '').toLowerCase()) this.setState('current');
    else this.setState('checking');
  }

  private setState(state: UsernameState): void {
    this.state.set(state);
    this.validChange.emit(state === 'available' || state === 'current' || state === 'unknown');
  }

  /** Sugestões que a tela recebeu num 409 ao gravar (outra pessoa pegou o nome antes). */
  showTaken(suggestions: string[]): void {
    this.suggestions.set(suggestions);
    this.setState('taken');
  }
}
