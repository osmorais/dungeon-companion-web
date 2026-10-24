import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
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
    component.username.set('gorak');
    component.usernameValid.set(true);
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

  it('com o aceite, recusa senha com menos de 8 caracteres', () => {
    component.acceptedTerms.set(true);
    component.password = '1234567';
    component.confirmPassword = '1234567';
    component.submit();
    expect(authService.signup).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('A senha precisa ter pelo menos 8 caracteres.');
  });

  it('mostra a mensagem do limite de tentativas (429) vinda da API', () => {
    authService.signup.mockReturnValue(
      throwError(() => ({
        status: 429,
        error: { error: { message: 'Muitas tentativas. Tente de novo em 40 minutos.' } },
      })),
    );
    component.acceptedTerms.set(true);
    component.submit();
    expect(component.errorMessage()).toBe('Muitas tentativas. Tente de novo em 40 minutos.');
    expect(component.loading()).toBe(false);
  });

  it('sem nome de usuário não cria a conta', () => {
    component.acceptedTerms.set(true);
    component.username.set('  ');
    component.submit();
    expect(authService.signup).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('Escolha um nome de usuário.');
  });

  it('nome de usuário com formato inválido não cria a conta', () => {
    component.acceptedTerms.set(true);
    component.username.set('gorak dente');
    component.submit();
    expect(authService.signup).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('letras sem acento');
  });

  it('nome em uso (ainda não confirmado livre) não cria a conta', () => {
    component.acceptedTerms.set(true);
    component.usernameValid.set(false);
    component.submit();
    expect(authService.signup).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('Escolha um nome de usuário que esteja livre.');
  });

  it('com o aceite, cria a conta com o nome de usuário e vai pra home', () => {
    component.acceptedTerms.set(true);
    component.username.set(' gorak ');
    component.submit();
    expect(authService.signup).toHaveBeenCalledWith('heroi@aventura.com', 'segredo123', 'gorak');
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
