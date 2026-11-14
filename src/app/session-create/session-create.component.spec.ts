import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { SessionCreateComponent } from './session-create.component';
import { GameSessionService } from '../services/game-session.service';
import { CharacterService } from '../services/character.service';
import { AuthService } from '../services/auth.service';
import { FriendService } from '../services/friend.service';
import { SessionInviteService } from '../services/session-invite.service';

const CREATED = { game_session: { id_game_session: 's1' } };

/** Convites na criação da sessão, sem renderizar o template. */
describe('SessionCreateComponent: convidar amigos', () => {
  let sessions: { createSession: ReturnType<typeof vi.fn> };
  let friends: { getFriends: ReturnType<typeof vi.fn> };
  let invites: { send: ReturnType<typeof vi.fn> };
  let navigate: ReturnType<typeof vi.spyOn>;
  let component: SessionCreateComponent;

  function fillForm() {
    component.sessionName.set('A Mina');
    component.maxPlayers.set(4);
    component.generateCode();
  }

  beforeEach(() => {
    sessions = { createSession: vi.fn().mockReturnValue(of(CREATED)) };
    friends = {
      getFriends: vi.fn().mockReturnValue(
        of({
          items: [
            { id: 'f1', username: 'gorak', presence: 'online' },
            { id: 'f2', username: 'elora', presence: 'offline' },
          ],
          page: 1,
          pageSize: 50,
          total_count: 2,
        }),
      ),
    };
    invites = { send: vi.fn().mockReturnValue(of({})) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: GameSessionService, useValue: sessions },
        {
          provide: CharacterService,
          useValue: { getCharacters: () => of({ CharacterPagedList: [] }) },
        },
        { provide: AuthService, useValue: { currentUser: () => ({ username: 'mestre' }) } },
        { provide: FriendService, useValue: friends },
        { provide: SessionInviteService, useValue: invites },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component = TestBed.runInInjectionContext(() => new SessionCreateComponent());
    component.ngOnInit();
    fillForm();
  });

  afterEach(() => vi.restoreAllMocks());

  it('carrega os amigos para escolher', () => {
    expect(friends.getFriends).toHaveBeenCalledWith(1, 50);
    expect(component.availableFriends().map((f) => f.id)).toEqual(['f1', 'f2']);
  });

  it('marcar e desmarcar amigo', () => {
    component.toggleFriend('f1');
    expect(component.isFriendSelected('f1')).toBe(true);
    component.toggleFriend('f1');
    expect(component.isFriendSelected('f1')).toBe(false);
  });

  it('sem amigos escolhidos, não envia convite e vai pra sessão', () => {
    component.saveSession();
    expect(invites.send).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/session', 's1']);
  });

  it('envia um convite pra cada amigo escolhido, com a sessão criada', () => {
    component.toggleFriend('f1');
    component.toggleFriend('f2');
    component.saveSession();
    expect(invites.send).toHaveBeenCalledWith('s1', 'f1', '');
    expect(invites.send).toHaveBeenCalledWith('s1', 'f2', '');
    expect(navigate).toHaveBeenCalledWith(['/session', 's1']);
  });

  it('só vai pra sessão depois que os convites terminam', () => {
    const response = new Subject<object>();
    invites.send.mockReturnValue(response);
    component.toggleFriend('f1');
    component.saveSession();
    expect(navigate).not.toHaveBeenCalled();
    response.next({});
    response.complete();
    expect(navigate).toHaveBeenCalledWith(['/session', 's1']);
  });

  it('convite que falha não impede de entrar na sessão criada', () => {
    invites.send.mockImplementation((_: string, friendId: string) =>
      friendId === 'f1' ? throwError(() => new Error('x')) : of({}),
    );
    component.toggleFriend('f1');
    component.toggleFriend('f2');
    component.saveSession();
    expect(invites.send).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith(['/session', 's1']);
  });

  it('erro ao criar a sessão não envia convite', () => {
    sessions.createSession.mockReturnValue(throwError(() => new Error('x')));
    component.toggleFriend('f1');
    component.saveSession();
    expect(invites.send).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(component.saveError()).toBeTruthy();
  });

  it('erro ao carregar os amigos só deixa a lista vazia', () => {
    friends.getFriends.mockReturnValue(throwError(() => new Error('x')));
    component.ngOnInit();
    expect(component.loadingFriends()).toBe(false);
  });

  describe('número de jogadores (− e +) e código', () => {
    it('vazio: + começa em 1; − não passa de 1', () => {
      component.maxPlayers.set(null);
      component.stepPlayers(1);
      expect(component.maxPlayers()).toBe(1);
      component.stepPlayers(-1);
      expect(component.maxPlayers()).toBe(1);
    });

    it('sobe e desce de um em um, até 20', () => {
      component.maxPlayers.set(4);
      component.stepPlayers(1);
      expect(component.maxPlayers()).toBe(5);
      component.stepPlayers(-1);
      expect(component.maxPlayers()).toBe(4);
      component.maxPlayers.set(20);
      component.stepPlayers(1);
      expect(component.maxPlayers()).toBe(20);
    });

    it('casas do código: pontos antes de gerar, as 5 letras depois', () => {
      component.sessionCode.set('');
      expect(component.codeSlots()).toEqual(['·', '·', '·', '·', '·']);
      component.sessionCode.set('RX7K2');
      expect(component.codeSlots()).toEqual(['R', 'X', '7', 'K', '2']);
    });
  });
});
