import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { CharacterService } from '../services/character.service';
import { GameSessionService } from '../services/game-session.service';
import { CharacterListComponent } from '../character-list/character-list.component';
import { SessionJoinComponent } from '../session-join/session-join.component';
import { SessionCreateComponent } from '../session-create/session-create.component';
import { HomeComponent } from '../home/home.component';

/**
 * Sem o overlay que bloqueava a tela, cada página mostra skeleton enquanto carrega e trava os
 * próprios botões enquanto grava — estes testes cobrem os estados novos (1.3.1).
 */
describe('estados de carregamento sem overlay bloqueante', () => {
  function setup(charService: object, gameSessionService: object = {}) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CharacterService, useValue: charService },
        { provide: GameSessionService, useValue: gameSessionService },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  }

  it('lista de personagens: skeleton até a página chegar', () => {
    const page = new Subject<{ CharacterPagedList: []; total_count: number }>();
    setup({ getCharacters: vi.fn(() => page) });
    const list = TestBed.runInInjectionContext(() => new CharacterListComponent());
    list.ngOnInit();
    expect(list.loading()).toBe(true);
    page.next({ CharacterPagedList: [], total_count: 0 });
    page.complete();
    expect(list.loading()).toBe(false);
  });

  it('lista de personagens com erro: sai do skeleton e mostra o erro', () => {
    setup({ getCharacters: vi.fn(() => throwError(() => new Error('500'))) });
    const list = TestBed.runInInjectionContext(() => new CharacterListComponent());
    list.ngOnInit();
    expect(list.loading()).toBe(false);
    expect(list.error()).toBe(true);
  });

  it('entrar em sessão: skeleton dos personagens e botão travado enquanto entra; erro destrava', () => {
    const join = new Subject<{ id_game_session: string }>();
    const joinSession = vi.fn(() => join);
    setup(
      { getCharacters: vi.fn(() => of({ CharacterPagedList: [], total_count: 0 })) },
      { joinSession },
    );
    const page = TestBed.runInInjectionContext(() => new SessionJoinComponent());
    expect(page.loadingCharacters()).toBe(true);
    page.ngOnInit();
    expect(page.loadingCharacters()).toBe(false);

    page.sessionCode.set('ABC12');
    page.playerName.set('Ana');
    page.selectCharacter({ id_character: 1 } as never);
    page.join();
    page.join();
    expect(joinSession).toHaveBeenCalledTimes(1);
    expect(page.joining()).toBe(true);

    join.error({ status: 404 });
    expect(page.joining()).toBe(false);
    expect(page.joinError()).toBe('SESSÃO NÃO ENCONTRADA. VERIFIQUE O CÓDIGO.');
  });

  it('criar sessão: segundo clique em SALVAR não cria outra; erro destrava', () => {
    const create = new Subject<never>();
    const createSession = vi.fn(() => create);
    setup(
      { getCharacters: vi.fn(() => of({ CharacterPagedList: [], total_count: 0 })) },
      { createSession },
    );
    const page = TestBed.runInInjectionContext(() => new SessionCreateComponent());
    vi.spyOn(page, 'canSave').mockReturnValue(true);
    page.maxPlayers.set(4);
    page.saveSession();
    page.saveSession();
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(page.saving()).toBe(true);
    create.error(new Error('500'));
    expect(page.saving()).toBe(false);
  });

  it('início: CRIAR PERSONAGEM busca as opções uma vez só', () => {
    const options = new Subject<object>();
    const getCharacterOptions = vi.fn(() => options);
    setup({ getCharacterOptions, cachedOptions: { set: vi.fn() } });
    const home = TestBed.runInInjectionContext(() => new HomeComponent());
    home.createCharacter();
    home.createCharacter();
    expect(getCharacterOptions).toHaveBeenCalledTimes(1);
    expect(home.openingCreate()).toBe(true);
  });
});
