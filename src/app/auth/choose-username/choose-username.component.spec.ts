import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ChooseUsernameComponent } from './choose-username.component';
import { AuthService } from '../../services/auth.service';
import { AccountService } from '../../services/account.service';

describe('ChooseUsernameComponent (escolha no primeiro acesso)', () => {
  let updateUsername: ReturnType<typeof vi.fn>;
  let setCurrentUsername: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.spyOn>;
  let page: ChooseUsernameComponent;

  beforeEach(() => {
    updateUsername = vi.fn();
    setCurrentUsername = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AccountService, useValue: { updateUsername } },
        { provide: AuthService, useValue: { setCurrentUsername, logout: vi.fn(() => of({})) } },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page = TestBed.runInInjectionContext(() => new ChooseUsernameComponent());
  });

  it('só grava com o nome liberado pela conferência', () => {
    page.username.set('gorak');
    page.save();
    expect(updateUsername).not.toHaveBeenCalled();
  });

  it('grava aparado, atualiza o usuário logado e vai pra Home', () => {
    updateUsername.mockReturnValue(of({ username: 'gorak' }));
    page.username.set(' gorak ');
    page.valid.set(true);
    page.save();
    expect(updateUsername).toHaveBeenCalledWith('gorak');
    expect(setCurrentUsername).toHaveBeenCalledWith('gorak');
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('nome tomado ao gravar: mostra a mensagem e destrava', () => {
    updateUsername.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { error: { message: 'Esse nome de usuário já está em uso' } },
      })),
    );
    page.username.set('gorak');
    page.valid.set(true);
    page.save();
    expect(page.errorMessage()).toBe('Esse nome de usuário já está em uso');
    expect(page.saving()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});
