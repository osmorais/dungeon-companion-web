import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, MeResponse, UserPublic, UsernameCheck } from '../models/auth.interface';

export const AUTH_TOKEN_KEY = 'auth_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private baseUrl = environment.apiUrl;

  readonly currentUser = signal<UserPublic | null>(null);
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  /** Logado mas sem nome de usuário (conta antiga ou recém-criada com o Google): precisa escolher. */
  readonly needsUsername = computed(() => {
    const user = this.currentUser();
    return user !== null && !user.username;
  });

  signup(email: string, password: string, username: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/signup`, { email, password, username })
      .pipe(tap(res => this.handleAuthResponse(res)));
  }

  /** O nome está livre? Se não, a API sugere outros. Pública (o cadastro pergunta antes da conta). */
  checkUsername(username: string): Observable<UsernameCheck> {
    return this.http.get<UsernameCheck>(`${this.baseUrl}/auth/username-available`, {
      params: { username },
    });
  }

  /** Depois de gravar o nome (escolha no primeiro acesso ou Minha Conta). */
  setCurrentUsername(username: string): void {
    this.currentUser.update((user) => (user ? { ...user, username } : user));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/login`, { email, password })
      .pipe(tap(res => this.handleAuthResponse(res)));
  }

  /**
   * SAIR leva pro login. Não pra `/`: quem sai da Home já está em `/`, o roteador ignora a
   * navegação pra mesma URL e a Home ficava na tela.
   */
  logout(): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/auth/logout`, {}).pipe(
      tap(() => this.clearSession('/login')),
    );
  }

  /**
   * Confirma o token salvo no `/auth/me`. Se falhar, limpa a sessão e vai pra `redirectTo`; `null`
   * só limpa, sem navegar (o `canMatch` de `/` deixa o roteador seguir pra tela inicial).
   */
  loadCurrentUser(redirectTo: '/login' | null = '/login'): Observable<MeResponse | null> {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) return of(null);

    return this.http.get<MeResponse>(`${this.baseUrl}/auth/me`).pipe(
      tap(me => this.currentUser.set({ id: me.id, email: me.email, username: me.username ?? null })),
      catchError(() => {
        this.clearSession(redirectTo);
        return of(null);
      }),
    );
  }

  googleLogin(idToken: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/google`, { idToken })
      .pipe(tap(res => this.handleAuthResponse(res)));
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/auth/reset-password`, {
      token,
      newPassword,
    });
  }

  /** `null` = só limpa, sem navegar. */
  clearSession(redirectTo: '/login' | null = '/login'): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    this.currentUser.set(null);
    if (redirectTo) this.router.navigate([redirectTo]);
  }

  private handleAuthResponse(res: AuthResponse): void {
    localStorage.setItem(AUTH_TOKEN_KEY, res.token);
    this.currentUser.set(res.user);
  }
}
