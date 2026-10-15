import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { SignupComponent, TERMS_NOT_ACCEPTED_MESSAGE } from './signup.component';
import { AuthService } from '../../services/auth.service';

/** Só a lógica de submit/aceite — sem renderizar o template nem inicializar o botão do Google. */
describe('SignupComponent', () => {
  let component: SignupComponent;
  let authService: { signup: ReturnType<typeof vi.fn>; googleLogin: ReturnType<typeof vi.fn> };
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    authService = {
      signup: vi.fn().mockReturnValue(of({})),
      googleLogin: vi.fn().mockReturnValue(of({})),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component = TestBed.runInInjectionContext(() => new SignupComponent());
    component.email = 'heroi@aventura.com';
    component.password = 'segredo123';
    component.confirmPassword = 'segredo123';
  });

  it('começa sem o aceite marcado', () => {
    expect(component.acceptedTerms()).toBe(false);
  });

  it('não cria a conta sem o aceite dos termos e da idade', () => {
    component.submit();
    expect(authService.signup).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe(TERMS_NOT_ACCEPTED_MESSAGE);
  });

  it('não entra com Google sem o aceite', () => {
    component.handleGoogleCredential('id-token');
    expect(authService.googleLogin).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe(TERMS_NOT_ACCEPTED_MESSAGE);
  });

  it('com o aceite, ainda valida a confirmação de senha', () => {
    component.acceptedTerms.set(true);
    component.confirmPassword = 'outra';
    component.submit();
    expect(authService.signup).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('As senhas não coincidem.');
  });

  it('com o aceite, cria a conta e vai pra home', () => {
    component.acceptedTerms.set(true);
    component.fullName = 'Sir Aldric';
    component.submit();
    expect(authService.signup).toHaveBeenCalledWith(
      'heroi@aventura.com',
      'segredo123',
      'Sir Aldric',
    );
    expect(component.errorMessage()).toBe('');
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('com o aceite, entra com Google', () => {
    component.acceptedTerms.set(true);
    component.handleGoogleCredential('id-token');
    expect(authService.googleLogin).toHaveBeenCalledWith('id-token');
    expect(navigate).toHaveBeenCalledWith(['/']);
  });
});
