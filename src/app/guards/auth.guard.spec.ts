import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { firstValueFrom, isObservable, Observable, of } from 'rxjs';
import { authGuard, loggedInMatch } from './auth.guard';
import { AUTH_TOKEN_KEY, AuthService } from '../services/auth.service';

/** `/`: logado → Home; senão o roteador segue pra tela inicial. */
describe('loggedInMatch (quem vê a Home em /)', () => {
  let auth: { isLoggedIn: () => boolean; loadCurrentUser: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    auth = { isLoggedIn: () => false, loadCurrentUser: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: auth }] });
  });

  afterEach(() => localStorage.removeItem(AUTH_TOKEN_KEY));

  const run = async (): Promise<boolean> => {
    const result = TestBed.runInInjectionContext(() => loggedInMatch({} as never, []));
    return isObservable(result)
      ? firstValueFrom(result as Observable<boolean>)
      : (result as boolean);
  };

  it('usuário já carregado vê a Home, sem chamar a API', async () => {
    auth.isLoggedIn = () => true;
    expect(await run()).toBe(true);
    expect(auth.loadCurrentUser).not.toHaveBeenCalled();
  });

  it('sem token vai pra tela inicial, sem chamar a API', async () => {
    expect(await run()).toBe(false);
    expect(auth.loadCurrentUser).not.toHaveBeenCalled();
  });

  it('com token válido confirma no servidor e vê a Home', async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'tok');
    auth.loadCurrentUser.mockReturnValue(of({ id: 1 }));
    expect(await run()).toBe(true);
  });

  it('com token expirado/inválido vai pra tela inicial', async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'tok');
    auth.loadCurrentUser.mockReturnValue(of(null));
    expect(await run()).toBe(false);
    expect(auth.loadCurrentUser).toHaveBeenCalledWith(null);
  });
});

/** Token vencido de verdade: `AuthService` real, com o `/auth/me` respondendo erro. */
describe('sessão expirada (AuthService real)', () => {
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    localStorage.setItem(AUTH_TOKEN_KEY, 'vencido');
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem(AUTH_TOKEN_KEY);
  });

  const runGuard = <T>(guard: () => unknown): Promise<T> => {
    const result = TestBed.runInInjectionContext(guard);
    return firstValueFrom(result as Observable<T>);
  };
  const respondMe = (status: number) =>
    http.expectOne((req) => req.url.endsWith('/auth/me')).flush({}, { status, statusText: 'erro' });

  it.each([401, 500])(
    'em / com o /auth/me respondendo %i: limpa o token e segue pra tela inicial, sem ir pro login',
    async (status) => {
      const result = runGuard<boolean>(() => loggedInMatch({} as never, []));
      respondMe(status);
      expect(await result).toBe(false);
      expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
      expect(navigate).not.toHaveBeenCalled();
    },
  );

  it('em rota protegida com o /auth/me respondendo 401: continua indo pro login', async () => {
    const result = runGuard<UrlTree>(() => authGuard({} as never, {} as never));
    respondMe(401);
    expect(String(await result)).toBe('/login');
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });
});
