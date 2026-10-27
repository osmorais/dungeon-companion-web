import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';

/** Só a lógica de submit/Google — sem renderizar o template nem inicializar o botão do Google. */
describe('LoginComponent', () => {
  let component: LoginComponent;
  let authService: { login: ReturnType<typeof vi.fn>; googleLogin: ReturnType<typeof vi.fn> };
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    authService = {
      login: vi.fn().mockReturnValue(of({})),
      googleLogin: vi.fn().mockReturnValue(of({})),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component = TestBed.runInInjectionContext(() => new LoginComponent());
    component.email = 'heroi@aventura.com';
    component.password = 'segredo123';
  });

  it('começa sem erro, sem carregar', () => {
    expect(component.errorMessage()).toBe('');
    expect(component.loading()).toBe(false);
  });

  it('entra com email e senha e vai pra home', () => {
    component.submit();
    expect(authService.login).toHaveBeenCalledWith('heroi@aventura.com', 'segredo123');
    expect(component.errorMessage()).toBe('');
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('mostra a mensagem de erro da API e para de carregar', () => {
    authService.login.mockReturnValue(
      throwError(() => ({ status: 401, error: { error: { message: 'Credenciais inválidas.' } } })),
    );
    component.submit();
    expect(component.errorMessage()).toBe('Credenciais inválidas.');
    expect(component.loading()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('mostra a mensagem do limite de tentativas (429) vinda da API', () => {
    authService.login.mockReturnValue(
      throwError(() => ({
        status: 429,
        error: { error: { message: 'Muitas tentativas. Tente de novo em 40 minutos.' } },
      })),
    );
    component.submit();
    expect(component.errorMessage()).toBe('Muitas tentativas. Tente de novo em 40 minutos.');
  });

  it('ignora um segundo submit enquanto o primeiro ainda está carregando (Enter repetido)', () => {
    const pending = new Subject<unknown>();
    authService.login.mockReturnValue(pending);
    component.submit();
    component.submit();
    expect(authService.login).toHaveBeenCalledTimes(1);
    pending.next({});
    pending.complete();
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('entra com Google', () => {
    component.handleGoogleCredential('id-token');
    expect(authService.googleLogin).toHaveBeenCalledWith('id-token');
    expect(component.errorMessage()).toBe('');
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('mostra erro quando o login com Google falha', () => {
    authService.googleLogin.mockReturnValue(throwError(() => ({ status: 500, error: {} })));
    component.handleGoogleCredential('id-token');
    expect(component.errorMessage()).toBe('Erro ao entrar com Google. Tente novamente.');
    expect(component.loading()).toBe(false);
  });

  it('Google com uma entrada já em andamento não começa outra', () => {
    const pending = new Subject<unknown>();
    authService.login.mockReturnValue(pending);
    component.submit();
    component.handleGoogleCredential('id-token');
    expect(authService.googleLogin).not.toHaveBeenCalled();
  });

  describe('foco no e-mail ao abrir', () => {
    const focus = vi.fn();
    // jsdom não tem matchMedia: define no teste e devolve o original depois.
    const original = window.matchMedia;
    const withPointer = (fine: boolean) => {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: vi.fn(() => ({ matches: fine })),
      });
      component.googleEnabled.set(false);
      component.emailInput = { nativeElement: { focus } } as never;
    };
    afterEach(() => {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: original,
      });
      focus.mockClear();
    });

    it('com mouse/teclado, foca o e-mail', () => {
      withPointer(true);
      component.ngAfterViewInit();
      expect(focus).toHaveBeenCalledTimes(1);
    });

    it('em tela de toque, não foca (o teclado cobriria o logo)', () => {
      withPointer(false);
      component.ngAfterViewInit();
      expect(focus).not.toHaveBeenCalled();
    });
  });
});
