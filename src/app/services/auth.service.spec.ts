import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AUTH_TOKEN_KEY, AuthService } from './auth.service';

describe('AuthService — para onde vai ao encerrar a sessão', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    localStorage.setItem(AUTH_TOKEN_KEY, 'tok');
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem(AUTH_TOKEN_KEY);
  });

  it('SAIR limpa a sessão e leva pro login', () => {
    auth.logout().subscribe();
    http.expectOne((req) => req.url.endsWith('/auth/logout')).flush({});
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(auth.isLoggedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('sessão expirada (clearSession sem destino) continua indo pro login', () => {
    auth.clearSession();
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('clearSession(null) só limpa a sessão, sem navegar', () => {
    auth.clearSession(null);
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(auth.isLoggedIn()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('/auth/me traz o nome de usuário; sem nome, precisa escolher', () => {
    auth.loadCurrentUser().subscribe();
    http
      .expectOne((req) => req.url.endsWith('/auth/me'))
      .flush({ id: 'u1', email: 'a@x.com', username: null });
    expect(auth.currentUser()).toEqual({ id: 'u1', email: 'a@x.com', username: null });
    expect(auth.needsUsername()).toBe(true);

    auth.setCurrentUsername('gorak');
    expect(auth.currentUser()?.username).toBe('gorak');
    expect(auth.needsUsername()).toBe(false);
  });

  it('cadastro manda o nome de usuário (não mais nome do herói)', () => {
    auth.signup('a@x.com', 'segredo123', 'gorak').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/auth/signup'));
    expect(req.request.body).toEqual({
      email: 'a@x.com',
      password: 'segredo123',
      username: 'gorak',
    });
    req.flush({ token: 't', user: { id: 'u1', email: 'a@x.com', username: 'gorak' } });
  });

  it('confere a disponibilidade pela query string', () => {
    auth.checkUsername('gorak').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/auth/username-available'));
    expect(req.request.params.get('username')).toBe('gorak');
    req.flush({ username: 'gorak', available: true, error: null, suggestions: [] });
  });
});
