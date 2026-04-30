import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, MeResponse, UserPublic } from '../models/auth.interface';

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
      .pipe(tap(res => this.currentUser.set(res.user)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/login`, { email, password })
      .pipe(tap(res => this.currentUser.set(res.user)));
  }

  logout(): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/auth/logout`, {}).pipe(
      tap(() => {
        this.currentUser.set(null);
        this.router.navigate(['/login']);
      }),
    );
  }

  loadCurrentUser(): Observable<MeResponse | null> {
    return this.http.get<MeResponse>(`${this.baseUrl}/auth/me`).pipe(
      tap(me => this.currentUser.set({ id: me.id, email: me.email })),
      catchError(() => {
        this.currentUser.set(null);
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
}
