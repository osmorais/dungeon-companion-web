import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SessionInviteModalComponent } from './session-invite-modal.component';
import { InviteAcceptModalComponent } from './invite-accept-modal.component';
import { GameSessionService } from '../services/game-session.service';
import { CharacterService } from '../services/character.service';
import { SessionInviteService } from '../services/session-invite.service';
import { SessionInviteView } from '../models/friend.interface';

const SESSION = {
  id_game_session: 's1',
  session_name: 'A Mina Perdida',
  session_code: 'ABCDE',
  max_player_quantity: 4,
  dm_name: 'mestre',
  created_at: new Date(0),
  total_count: 1,
};

const INVITE: SessionInviteView = {
  id_session_invite: 'i1',
  id_game_session: 's1',
  session_name: 'A Mina Perdida',
  message: null,
  created_at: '2026-11-03T00:00:00Z',
  expires_at: '2026-11-10T00:00:00Z',
  user: { id: 'dm1', username: 'mestre' },
};

describe('SessionInviteModalComponent', () => {
  let gameSessions: { getMySessions: ReturnType<typeof vi.fn> };
  let invites: { send: ReturnType<typeof vi.fn> };
  let modal: SessionInviteModalComponent;

  function create() {
    TestBed.configureTestingModule({
      providers: [
        { provide: GameSessionService, useValue: gameSessions },
        { provide: SessionInviteService, useValue: invites },
      ],
    });
    const fixture = TestBed.createComponent(SessionInviteModalComponent);
    fixture.componentRef.setInput('friend', { id: 'f1', username: 'gorak' });
    modal = fixture.componentInstance;
    modal.ngOnInit();
  }

  beforeEach(() => {
    gameSessions = {
      getMySessions: vi.fn().mockReturnValue(of({ GameSessionPagedList: [SESSION] })),
    };
    invites = { send: vi.fn().mockReturnValue(of({})) };
  });

  it('lista só as mesas em que o usuário é mestre; com uma só, já vem escolhida', () => {
    create();
    expect(gameSessions.getMySessions).toHaveBeenCalledWith(1, 50, 'dm');
    expect(modal.selected()).toBe('s1');
    expect(modal.canSend()).toBe(true);
  });

  it('envia com o recado e avisa com o nome da mesa', () => {
    create();
    const sent = vi.fn();
    modal.sent.subscribe(sent);
    modal.message.set('Bora?');
    modal.send();
    expect(invites.send).toHaveBeenCalledWith('s1', 'f1', 'Bora?');
    expect(sent).toHaveBeenCalledWith('A Mina Perdida');
  });

  it('sem mesa escolhida não envia', () => {
    gameSessions.getMySessions.mockReturnValue(
      of({ GameSessionPagedList: [SESSION, { ...SESSION, id_game_session: 's2' }] }),
    );
    create();
    expect(modal.canSend()).toBe(false);
    modal.send();
    expect(invites.send).not.toHaveBeenCalled();
  });

  it('erro da API vira mensagem e libera o botão', () => {
    invites.send.mockReturnValue(
      throwError(() => ({ error: { error: { message: 'A mesa já está cheia' } } })),
    );
    create();
    modal.send();
    expect(modal.error()).toBe('A mesa já está cheia');
    expect(modal.sending()).toBe(false);
  });
});

describe('InviteAcceptModalComponent', () => {
  let characters: { getCharacters: ReturnType<typeof vi.fn> };
  let invites: { accept: ReturnType<typeof vi.fn> };
  let modal: InviteAcceptModalComponent;

  function create() {
    TestBed.configureTestingModule({
      providers: [
        { provide: CharacterService, useValue: characters },
        { provide: SessionInviteService, useValue: invites },
      ],
    });
    const fixture = TestBed.createComponent(InviteAcceptModalComponent);
    fixture.componentRef.setInput('invite', INVITE);
    modal = fixture.componentInstance;
    modal.ngOnInit();
  }

  beforeEach(() => {
    characters = {
      getCharacters: vi.fn().mockReturnValue(
        of({
          CharacterPagedList: [
            { id_character: 7, name: 'Thorin', level: 3, race: 'Anão', class: 'Guerreiro' },
            { id_character: 8, name: 'Elora', level: 2, race: 'Elfa', class: 'Maga' },
          ],
        }),
      ),
    };
    invites = { accept: vi.fn().mockReturnValue(of({ id_game_session: 's1', player: {} })) };
  });

  it('precisa escolher o personagem antes de entrar', () => {
    create();
    expect(modal.canAccept()).toBe(false);
    modal.accept();
    expect(invites.accept).not.toHaveBeenCalled();
  });

  it('entra com o personagem escolhido e avisa a mesa', () => {
    create();
    const joined = vi.fn();
    modal.joined.subscribe(joined);
    modal.selected.set(8);
    modal.accept();
    expect(invites.accept).toHaveBeenCalledWith('i1', 8);
    expect(joined).toHaveBeenCalledWith('s1');
  });

  it('erro (convite expirado, sem vaga) vira mensagem', () => {
    invites.accept.mockReturnValue(
      throwError(() => ({ error: { error: { message: 'Esse convite expirou' } } })),
    );
    create();
    modal.selected.set(7);
    modal.accept();
    expect(modal.error()).toBe('Esse convite expirou');
    expect(modal.accepting()).toBe(false);
  });
});
