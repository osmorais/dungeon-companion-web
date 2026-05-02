import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, MeResponse, UserPublic } from '../models/auth.interface';

export const AUTH_TOKEN_KEY = 'auth_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private baseUrl = environment.apiUrl;

  readonly currentUser = signal<UserPublic | null>(null);
  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  signup(email: string, password: string, fullName?: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/signup`, { email, password, full_name: fullName })
      .pipe(tap(res => this.handleAuthResponse(res)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/login`, { email, password })
      .pipe(tap(res => this.handleAuthResponse(res)));
  }

  logout(): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/auth/logout`, {}).pipe(
      tap(() => this.clearSession()),
    );
  }

  loadCurrentUser(): Observable<MeResponse | null> {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) return of(null);

    return this.http.get<MeResponse>(`${this.baseUrl}/auth/me`).pipe(
      tap(me => this.currentUser.set({ id: me.id, email: me.email })),
      catchError(() => {
        this.clearSession();
        return of(null);
      }),
    );
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

  clearSession(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private handleAuthResponse(res: AuthResponse): void {
    localStorage.setItem(AUTH_TOKEN_KEY, res.token);
    this.currentUser.set(res.user);
  }
}
