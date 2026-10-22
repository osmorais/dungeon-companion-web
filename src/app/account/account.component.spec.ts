import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AccountComponent, exportFileName } from './account.component';
import { AccountService } from '../services/account.service';
import { AuthService } from '../services/auth.service';
import { AccountProfile } from '../models/account.interface';

function profile(overrides: Partial<AccountProfile> = {}): AccountProfile {
  return {
    id: 'u1',
    email: 'Heroi@Aventura.com',
    full_name: 'Sir Aldric',
    created_at: null,
    has_password: true,
    google_linked: false,
    show_in_ranking: true,
    ...overrides,
  };
}

/** Lógica da página "Minha conta" sem renderizar o template. */
describe('AccountComponent', () => {
  let component: AccountComponent;
  let accountService: {
    getProfile: ReturnType<typeof vi.fn>;
    updateFullName: ReturnType<typeof vi.fn>;
    updateShowInRanking: ReturnType<typeof vi.fn>;
    exportData: ReturnType<typeof vi.fn>;
    deleteAccount: ReturnType<typeof vi.fn>;
  };
  let authService: { clearSession: ReturnType<typeof vi.fn> };

  function create(p: AccountProfile = profile()) {
    accountService.getProfile.mockReturnValue(of(p));
    component = TestBed.runInInjectionContext(() => new AccountComponent());
    component.ngOnInit();
  }

  beforeEach(() => {
    accountService = {
      getProfile: vi.fn(),
      updateFullName: vi.fn(),
      updateShowInRanking: vi.fn(),
      exportData: vi.fn(),
      deleteAccount: vi.fn().mockReturnValue(of({ message: 'ok' })),
    };
    authService = { clearSession: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AccountService, useValue: accountService },
        { provide: AuthService, useValue: authService },
      ],
    });
  });

  it('sair do ranking grava a preferência e avisa', () => {
    create();
    accountService.updateShowInRanking.mockReturnValue(of(profile({ show_in_ranking: false })));
    component.toggleRanking(false);
    expect(accountService.updateShowInRanking).toHaveBeenCalledWith(false);
    expect(component.profile()?.show_in_ranking).toBe(false);
    expect(component.rankingMessage()).toContain('não aparecem');
    expect(component.savingRanking()).toBe(false);
  });

  it('erro ao salvar a preferência do ranking mostra a mensagem', () => {
    create();
    accountService.updateShowInRanking.mockReturnValue(throwError(() => ({ status: 500 })));
    component.toggleRanking(false);
    expect(component.rankingMessage()).toBeTruthy();
    expect(component.profile()?.show_in_ranking).toBe(true);
  });

  it('carrega o perfil e preenche o nome', () => {
    create();
    expect(component.profile()?.email).toBe('Heroi@Aventura.com');
    expect(component.fullName()).toBe('Sir Aldric');
  });

  it('erro ao carregar o perfil', () => {
    accountService.getProfile.mockReturnValue(throwError(() => new Error('x')));
    component = TestBed.runInInjectionContext(() => new AccountComponent());
    component.ngOnInit();
    expect(component.loadError()).toBe(true);
  });

  it('salvar nome manda aparado; vazio vira null', () => {
    create();
    accountService.updateFullName.mockReturnValue(of(profile({ full_name: 'Elora' })));
    component.fullName.set('  Elora ');
    component.saveName();
    expect(accountService.updateFullName).toHaveBeenCalledWith('Elora');
    expect(component.nameMessage()).toBe('Nome salvo.');

    accountService.updateFullName.mockReturnValue(of(profile({ full_name: null })));
    component.fullName.set('   ');
    component.saveName();
    expect(accountService.updateFullName).toHaveBeenLastCalledWith(null);
    expect(component.fullName()).toBe('');
  });

  it('mostra a mensagem de erro do backend ao salvar o nome', () => {
    create();
    accountService.updateFullName.mockReturnValue(
      throwError(() => ({ error: { error: { message: 'O nome pode ter no máximo 255' } } })),
    );
    component.saveName();
    expect(component.nameMessage()).toBe('O nome pode ter no máximo 255');
    expect(component.savingName()).toBe(false);
  });

  describe('excluir conta', () => {
    it('só libera com e-mail certo, senha e ciência marcada', () => {
      create();
      expect(component.canDelete()).toBe(false);
      component.confirmEmail.set(' heroi@aventura.COM ');
      expect(component.canDelete()).toBe(false);
      component.password.set('segredo');
      expect(component.canDelete()).toBe(false);
      component.acknowledged.set(true);
      expect(component.canDelete()).toBe(true);
      component.confirmEmail.set('outro@x.com');
      expect(component.canDelete()).toBe(false);
    });

    it('conta só do Google não pede senha', () => {
      create(profile({ has_password: false, google_linked: true }));
      component.confirmEmail.set('heroi@aventura.com');
      component.acknowledged.set(true);
      expect(component.canDelete()).toBe(true);
      component.deleteAccount();
      expect(accountService.deleteAccount).toHaveBeenCalledWith({
        confirm_email: 'heroi@aventura.com',
      });
    });

    it('sem a confirmação não chama o backend', () => {
      create();
      component.deleteAccount();
      expect(accountService.deleteAccount).not.toHaveBeenCalled();
    });

    it('com sucesso, encerra a sessão local (volta pro login)', () => {
      create();
      component.confirmEmail.set('heroi@aventura.com');
      component.password.set('segredo');
      component.acknowledged.set(true);
      component.deleteAccount();
      expect(accountService.deleteAccount).toHaveBeenCalledWith({
        confirm_email: 'heroi@aventura.com',
        password: 'segredo',
      });
      expect(authService.clearSession).toHaveBeenCalled();
    });

    it('senha errada mostra o erro e libera de novo', () => {
      create();
      accountService.deleteAccount.mockReturnValue(
        throwError(() => ({ status: 422, error: { error: { message: 'Senha incorreta' } } })),
      );
      component.confirmEmail.set('heroi@aventura.com');
      component.password.set('errada');
      component.acknowledged.set(true);
      component.deleteAccount();
      expect(component.deleteError()).toBe('Senha incorreta');
      expect(component.deleting()).toBe(false);
      expect(authService.clearSession).not.toHaveBeenCalled();
    });
  });

  it('nome do arquivo de exportação usa a data local', () => {
    expect(exportFileName(new Date(2026, 9, 4))).toBe('forja-arcana-meus-dados-2026-10-04.json');
  });
});
