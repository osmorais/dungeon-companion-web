import { TestBed } from '@angular/core/testing';
import { firstValueFrom, isObservable, Observable, of } from 'rxjs';
import { loggedInMatch } from './auth.guard';
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
  });
});
