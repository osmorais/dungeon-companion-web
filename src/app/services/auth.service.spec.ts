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

  it('SAIR limpa a sessão e leva pra tela inicial', () => {
    auth.logout().subscribe();
    http.expectOne((req) => req.url.endsWith('/auth/logout')).flush({});
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(auth.isLoggedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('sessão expirada (clearSession sem destino) continua indo pro login', () => {
    auth.clearSession();
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
