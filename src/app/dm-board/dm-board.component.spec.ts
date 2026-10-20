import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { DmBoardComponent } from './dm-board.component';
import { monsterDisplayName } from '../session-panel/monster-display-name';
import { CharacterService } from '../services/character.service';
import { GameSessionService } from '../services/game-session.service';
import { CharacterSheetResponse } from '../models/character-response.interface';
import { PartyRestResult } from '../models/game-session.interface';
import { combat, monster, npc, player, roll, sessionDetail } from '../../testing/session-fixtures';

function sheet(
  ac: number,
  passive: number,
  dc: number | null,
  effects: string[] = [],
  inspiration: { sides: number; from: string } | null = null,
): CharacterSheetResponse {
  return {
    character_sheet: {
      combat_stats: { armor_class: ac, passive_perception: passive },
      spellcasting_info: dc === null ? undefined : { spell_save_dc: dc },
      combat_features: {
        active_effects: { active: effects, turn_uses: {}, bardic_inspiration: inspiration },
      },
    },
  } as unknown as CharacterSheetResponse;
}

describe('monsterDisplayName', () => {
  it('usa o apelido do mestre quando existe', () => {
    expect(monsterDisplayName(monster('m1', { custom_name: 'Chefe Goblin' }))).toBe('Chefe Goblin');
  });

  it('sem apelido, converte o slug em "Title Case"', () => {
    expect(monsterDisplayName(monster('m1', { monster_api_slug: 'young-red-dragon' }))).toBe(
      'Young Red Dragon',
    );
  });
});

describe('DmBoardComponent (quadro do mestre)', () => {
  let getCharacterById: (id: number) => Observable<CharacterSheetResponse>;
  let partyRest: (...args: unknown[]) => Observable<PartyRestResult>;
  let getDmNotes: (id: string) => Observable<{ notes: string }>;
  let updateDmNotes: (id: string, notes: string) => Observable<{ notes: string }>;
  let deleteSession: (id: string) => Observable<void>;

  function create(detail = sessionDetail()) {
    const board = TestBed.runInInjectionContext(() => new DmBoardComponent());
    board.detail = detail;
    return board;
  }

  beforeEach(() => {
    getCharacterById = vi.fn(() => of(sheet(10, 10, null)));
    partyRest = vi.fn(() => of({ rested: ['Personagem p1'], skipped: [] }));
    getDmNotes = vi.fn(() => of({ notes: 'Goblins na ponte' }));
    updateDmNotes = vi.fn((_id: string, notes: string) => of({ notes }));
    deleteSession = vi.fn(() => of(undefined));
    // Repassa pro mock da vez — alguns testes trocam getCharacterById depois do beforeEach.
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CharacterService,
          useValue: { getCharacterById: (id: number) => getCharacterById(id) },
        },
        {
          provide: GameSessionService,
          useValue: {
            partyRest: (...args: unknown[]) => partyRest(...args),
            getDmNotes: (id: string) => getDmNotes(id),
            updateDmNotes: (id: string, notes: string) => updateDmNotes(id, notes),
            deleteSession: (id: string) => deleteSession(id),
          },
        },
      ],
    });
  });

  it('status do combate: sem combate, aguardando iniciativa e ronda atual', () => {
    expect(create().combatLabel).toBe('NENHUM COMBATE EM ANDAMENTO.');
    expect(create(sessionDetail({ combat: combat([], 'rolling_initiative') })).combatLabel).toBe(
      'AGUARDANDO INICIATIVA...',
    );
    const active = combat([]);
    active.encounter.round_number = 3;
    expect(create(sessionDetail({ combat: active })).combatLabel).toBe('RONDA 3');
  });

  it('conta quantos monstros da sessão estão visíveis aos jogadores', () => {
    const board = create(
      sessionDetail({
        monsters: [
          monster('m1', { is_revealed: true }),
          monster('m2'),
          monster('m3', { is_revealed: true }),
        ],
      }),
    );
    expect(board.revealedCount).toBe(2);
  });

  it('fechar (botão, fundo ou Esc) emite closed', () => {
    const board = create();
    const closed = vi.fn();
    board.closed.subscribe(closed);
    board.close();
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('rolagens ocultas: só as is_hidden, marcando o que é resposta a teste secreto', () => {
    const own = { ...roll('r1'), is_hidden: true };
    const secret = { ...roll('r2'), is_hidden: true, id_character: 7, actor_name: 'Lyra' };
    const board = create(sessionDetail({ recent_rolls: [secret, roll('r3'), own] }));
    expect(board.hiddenRolls.map((r) => r.id_roll)).toEqual(['r2', 'r1']);
    expect(board.isSecretAnswer(secret)).toBe(true);
    expect(board.isSecretAnswer(own)).toBe(false);
  });

  it('visão do grupo: PV da sessão, CA/PP/CD e efeitos da ficha, sem jogador sem personagem', () => {
    getCharacterById = vi.fn((id: number) =>
      of(
        id === 1
          ? sheet(18, 13, null, ['Fúria'])
          : sheet(12, 11, 14, [], { sides: 6, from: 'Bardo' }),
      ),
    );
    const board = create(
      sessionDetail({
        players: [
          player('p1'),
          player('p2', {
            id_character: 2,
            character: {
              ...player('p2').character!,
              current_hit_points: 5,
              temporary_hit_points: 3,
            },
          }),
          player('p3', { character: null }),
        ],
      }),
    );
    board.ngOnInit();

    expect(getCharacterById).toHaveBeenCalledTimes(2);
    expect(board.groupRows).toEqual([
      {
        idPlayerSession: 'p1',
        name: 'Personagem p1',
        hp: '20/20',
        ac: 18,
        passivePerception: 13,
        spellSaveDc: null,
        effects: ['Fúria'],
      },
      {
        idPlayerSession: 'p2',
        name: 'Personagem p2',
        hp: '5/20 +3',
        ac: 12,
        passivePerception: 11,
        spellSaveDc: 14,
        effects: ['Inspiração Bárdica (d6)'],
      },
    ]);
    expect(board.loadingSheets()).toBe(false);
  });

  it('ficha que falha fica com "—" sem derrubar as outras', () => {
    getCharacterById = vi.fn((id: number) =>
      id === 1 ? throwError(() => new Error('500')) : of(sheet(15, 12, null)),
    );
    const board = create(
      sessionDetail({ players: [player('p1'), player('p2', { id_character: 2 })] }),
    );
    board.ngOnInit();
    expect(board.groupRows.map((r) => r.ac)).toEqual([null, 15]);
  });

  it('sem jogador com personagem não busca ficha nenhuma', () => {
    const board = create(sessionDetail({ players: [player('p1', { character: null })] }));
    board.ngOnInit();
    expect(getCharacterById).not.toHaveBeenCalled();
    expect(board.groupRows).toEqual([]);
  });

  describe('descanso do grupo', () => {
    const party = () =>
      sessionDetail({
        players: [player('p1'), player('p2', { character: null })],
        npcs: [npc('n1')],
      });

    it('abre com todo o grupo com personagem marcado e manda jogadores e NPCs separados', () => {
      const board = create(party());
      board.startRest('long');
      expect([...board.restSelected()]).toEqual(['player:p1', 'npc:n1']);
      board.confirmRest();
      expect(partyRest).toHaveBeenCalledWith('gs', {
        rest_type: 'long',
        id_player_sessions: ['p1'],
        id_npc_sessions: ['n1'],
      });
      expect(board.restType()).toBeNull();
      expect(board.restMessage()).toBe('DESCANSARAM: Personagem p1.');
    });

    it('desmarcado fica fora; quem foi pulado aparece com o motivo', () => {
      partyRest = vi.fn(() =>
        of({ rested: [], skipped: [{ name: 'Personagem p1', reason: 'sem pontos de vida' }] }),
      );
      const board = create(party());
      board.startRest('short');
      board.toggleRestTarget('npc:n1');
      board.confirmRest();
      expect(partyRest).toHaveBeenCalledWith('gs', {
        rest_type: 'short',
        id_player_sessions: ['p1'],
        id_npc_sessions: [],
      });
      expect(board.restMessage()).toBe('FICARAM DE FORA: Personagem p1 (sem pontos de vida).');
    });

    it('erro da API fica na confirmação, sem fechar', () => {
      partyRest = vi.fn(() =>
        throwError(() => ({
          error: { error: { message: 'Apenas o mestre pode declarar um descanso' } },
        })),
      );
      const board = create(party());
      board.startRest('long');
      board.confirmRest();
      expect(board.restError()).toBe('Apenas o mestre pode declarar um descanso');
      expect(board.restType()).toBe('long');
      expect(board.resting()).toBe(false);
    });

    it('sem ninguém marcado não chama a API', () => {
      const board = create(party());
      board.startRest('long');
      board.toggleRestTarget('player:p1');
      board.toggleRestTarget('npc:n1');
      board.confirmRest();
      expect(partyRest).not.toHaveBeenCalled();
    });
  });

  describe('dano/cura em área', () => {
    const scene = () =>
      sessionDetail({
        players: [player('p1')],
        npcs: [npc('n1')],
        monsters: [monster('m1', { custom_name: 'Chefe' })],
      });

    it('lista grupo e monstros; metade arredonda pra baixo e quem ficaria com 0 sai', () => {
      const board = create(scene());
      expect(board.areaTargets.map((t) => t.name)).toEqual([
        'Personagem p1',
        'Personagem n1',
        'Chefe',
      ]);
      board.setAreaAmount({ target: { value: '7' } } as unknown as Event);
      board.toggleAreaTarget('player:p1');
      board.toggleAreaTarget('monster:m1');
      board.toggleAreaHalf('monster:m1');
      expect(board.buildAreaRequest('damage')).toEqual({
        kind: 'damage',
        targets: [
          { type: 'player', id: 'p1', amount: 7 },
          { type: 'monster', id: 'm1', amount: 3 },
        ],
      });
      board.setAreaAmount({ target: { value: '1' } } as unknown as Event);
      expect(board.buildAreaRequest('damage').targets).toEqual([
        { type: 'player', id: 'p1', amount: 1 },
      ]);
    });

    it('aplicar emite e limpa valor e seleção; sem alvo não emite', () => {
      const board = create(scene());
      const applied = vi.fn();
      board.applyArea.subscribe(applied);
      board.setAreaAmount({ target: { value: '4' } } as unknown as Event);
      board.applyAreaAmount('heal');
      expect(applied).not.toHaveBeenCalled();

      board.toggleAreaTarget('npc:n1');
      board.applyAreaAmount('heal');
      expect(applied).toHaveBeenCalledWith({
        kind: 'heal',
        targets: [{ type: 'npc', id: 'n1', amount: 4 }],
      });
      expect(board.areaAmount()).toBe(0);
      expect(board.areaSelected().size).toBe(0);
    });

    it('valor inválido vira 0', () => {
      const board = create(scene());
      board.setAreaAmount({ target: { value: '-3' } } as unknown as Event);
      expect(board.areaAmount()).toBe(0);
      board.setAreaAmount({ target: { value: 'abc' } } as unknown as Event);
      expect(board.areaAmount()).toBe(0);
    });
  });

  describe('anotações do mestre', () => {
    const typeNotes = (board: DmBoardComponent, value: string) =>
      board.setNotes({ target: { value } } as unknown as Event);

    it('carrega ao abrir; editar marca pendente e voltar ao texto salvo desmarca', () => {
      const board = create();
      board.ngOnInit();
      expect(getDmNotes).toHaveBeenCalledWith('gs');
      expect(board.notes()).toBe('Goblins na ponte');
      typeNotes(board, 'Goblins na ponte e um ogro');
      expect(board.notesDirty()).toBe(true);
      typeNotes(board, 'Goblins na ponte');
      expect(board.notesDirty()).toBe(false);
    });

    it('salvar grava e limpa o pendente; fechar a gaveta salva o que ficou pendente', () => {
      const board = create();
      board.ngOnInit();
      typeNotes(board, 'Ogro na caverna');
      board.saveNotes();
      expect(updateDmNotes).toHaveBeenCalledWith('gs', 'Ogro na caverna');
      expect(board.notesDirty()).toBe(false);

      typeNotes(board, 'Ogro morto');
      board.ngOnDestroy();
      expect(updateDmNotes).toHaveBeenLastCalledWith('gs', 'Ogro morto');
    });

    it('sem nada pendente, fechar não grava', () => {
      const board = create();
      board.ngOnInit();
      board.ngOnDestroy();
      expect(updateDmNotes).not.toHaveBeenCalled();
    });

    it('se o carregamento falhar, não deixa salvar por cima das anotações existentes', () => {
      getDmNotes = vi.fn(() => throwError(() => ({ status: 500 })));
      const board = create();
      board.ngOnInit();
      expect(board.notesLoaded()).toBe(false);
      expect(board.notesError()).toBe('Não foi possível carregar as anotações.');
      typeNotes(board, 'texto novo');
      board.ngOnDestroy();
      expect(updateDmNotes).not.toHaveBeenCalled();
    });
  });

  describe('apagar sessão', () => {
    const typeCode = (board: DmBoardComponent, value: string) =>
      board.setDeleteCode({ target: { value } } as unknown as Event);

    it('só apaga com o código certo (sem diferenciar maiúsculas) e avisa o painel', () => {
      const board = create();
      const deleted = vi.fn();
      board.sessionDeleted.subscribe(deleted);
      board.startDelete();
      typeCode(board, 'ABC12');
      board.confirmDelete();
      expect(deleteSession).not.toHaveBeenCalled();

      typeCode(board, ' abc123 ');
      board.confirmDelete();
      expect(deleteSession).toHaveBeenCalledWith('gs');
      expect(deleted).toHaveBeenCalledTimes(1);
    });

    it('erro da API fica na confirmação', () => {
      deleteSession = vi.fn(() =>
        throwError(() => ({
          error: { error: { message: 'Apenas o mestre pode excluir a sessão' } },
        })),
      );
      const board = create();
      const deleted = vi.fn();
      board.sessionDeleted.subscribe(deleted);
      board.startDelete();
      typeCode(board, 'ABC123');
      board.confirmDelete();
      expect(board.deleteError()).toBe('Apenas o mestre pode excluir a sessão');
      expect(board.deleting()).toBe(false);
      expect(deleted).not.toHaveBeenCalled();
    });

    it('apagou com anotação pendente: não tenta salvar numa sessão que não existe mais', () => {
      const board = create();
      board.ngOnInit();
      board.setNotes({ target: { value: 'pendente' } } as unknown as Event);
      board.startDelete();
      typeCode(board, 'ABC123');
      board.confirmDelete();
      board.ngOnDestroy();
      expect(updateDmNotes).not.toHaveBeenCalled();
    });
  });
});
