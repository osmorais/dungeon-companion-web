import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { SessionPanelComponent } from './session-panel.component';
import { GameSessionService } from '../services/game-session.service';
import { SessionStateService } from '../services/session-state.service';
import { CharacterService } from '../services/character.service';
import { AuthService } from '../services/auth.service';
import {
  GameSessionDetail,
  MonsterSession,
  NpcSession,
  PlayerSession,
} from '../models/game-session.interface';
import {
  combat,
  monster,
  npc,
  participant,
  player,
  roll,
  sessionDetail,
} from '../../testing/session-fixtures';
import { DamageImpactService } from '../services/damage-impact.service';
import { LoadingOverlayService } from '../loading-overlay/loading-overlay.service';
import { RollLogEntry } from '../models/game-session.interface';
import { CharacterSheetResponse } from '../models/character-response.interface';
import { Spell } from '../models/character-options.interface';

/**
 * Lógica do painel de sessão sem renderizar o template: sem `id` de entrada o componente não
 * busca a sessão nem conecta no socket, então só o estado (signals) e os serviços mockados contam.
 */
describe('SessionPanelComponent', () => {
  let component: SessionPanelComponent;
  let detail: ReturnType<typeof signal<GameSessionDetail | null>>;
  let gameSessionService: {
    updatePlayerHp: ReturnType<typeof vi.fn>;
    updateNpcHp: ReturnType<typeof vi.fn>;
    updateMonsterHp: ReturnType<typeof vi.fn>;
    applyAmount: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    detail = signal<GameSessionDetail | null>(sessionDetail());
    gameSessionService = {
      updatePlayerHp: vi.fn(() => of({})),
      updateNpcHp: vi.fn(() => of({})),
      updateMonsterHp: vi.fn(() => of({})),
      applyAmount: vi.fn(() => of({})),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: GameSessionService, useValue: gameSessionService },
        {
          provide: SessionStateService,
          useValue: {
            detail,
            patch: (fn: (d: GameSessionDetail) => GameSessionDetail) =>
              detail.update((d) => (d ? fn(d) : d)),
          },
        },
        { provide: CharacterService, useValue: {} },
        { provide: AuthService, useValue: { currentUser: signal({ id: 'dm', email: 'dm@x' }) } },
      ],
    });
    component = TestBed.runInInjectionContext(() => new SessionPanelComponent());
  });

  function typeDamage(target: PlayerSession | NpcSession | MonsterSession, value: number) {
    const event = { target: { value: String(value) } } as unknown as Event;
    if ('id_npc_session' in target) component.setNpcDamageInput(target, event);
    else if ('id_player_session' in target) component.setPlayerDamageInput(target, event);
    else component.setMonsterDamageInput(target, event);
  }

  describe('reação do Tom às rolagens', () => {
    const d20 = (id: string, actor: string, natural: number) =>
      ({
        ...roll(id),
        roll_type: 'attack',
        actor_name: actor,
        rolls: [natural],
        modifier: 0,
        total: natural,
        created_at: `2026-01-01T00:00:0${id.length}Z`,
      }) as RollLogEntry;

    it('só comenta quando o aviso da rolagem aparece na tela, não quando chega na fila', () => {
      detail.set(sessionDetail({ recent_rolls: [] }));
      TestBed.tick();
      // Duas rolagens chegam juntas: a primeira vira aviso; a segunda fica na fila.
      detail.set(sessionDetail({ recent_rolls: [d20('bb', 'Bia', 1), d20('a', 'Ana', 20)] }));
      TestBed.tick();
      expect(component.activeRollToast()?.actor_name).toBe('Ana');
      expect(component.tomState().message).toContain('Ana');
      expect(component.tomState().message).not.toContain('Bia');

      component.closeRollToast();
      expect(component.activeRollToast()?.actor_name).toBe('Bia');
      expect(component.tomState().message).toContain('Bia');
    });
  });

  describe('magias preparadas antes da luta', () => {
    const spell = (id: number, prepared: boolean) =>
      ({ id_spell: id, name: `Magia ${id}`, spellLevel: 1, is_prepared: prepared }) as Spell;
    function openWith(spells: Spell[], max: number) {
      component['battlePrepareSheet'].set({
        character_sheet: {
          id_character: 7,
          spells,
          spellcasting_info: { max_prepared_spells: max },
        },
      } as unknown as CharacterSheetResponse);
    }
    const checkbox = (checked: boolean) =>
      ({ target: { checked } }) as unknown as Event & { target: { checked: boolean } };

    it('API recusa (ex.: já rolou a iniciativa): o checkbox volta e a mensagem aparece', () => {
      const charService = TestBed.inject(CharacterService) as unknown as Record<string, unknown>;
      charService['setSpellPrepared'] = vi.fn(() =>
        throwError(() => ({
          error: { error: { message: 'Não é possível preparar magias durante o combate' } },
        })),
      );
      openWith([spell(1, false)], 3);
      const event = checkbox(true);
      component.battleTogglePrepared(spell(1, false), event);
      expect(event.target.checked).toBe(false);
      expect(component.battlePreparedCount()).toBe(0);
      expect(component.battlePrepareError()).toBe(
        'Não é possível preparar magias durante o combate',
      );
    });

    it('limite atingido: não chama a API e o checkbox volta', () => {
      const setSpellPrepared = vi.fn();
      (TestBed.inject(CharacterService) as unknown as Record<string, unknown>)['setSpellPrepared'] =
        setSpellPrepared;
      openWith([spell(1, true), spell(2, false)], 1);
      const event = checkbox(true);
      component.battleTogglePrepared(spell(2, false), event);
      expect(event.target.checked).toBe(false);
      expect(setSpellPrepared).not.toHaveBeenCalled();
    });

    it('API aceita: conta a nova preparada', () => {
      (TestBed.inject(CharacterService) as unknown as Record<string, unknown>)['setSpellPrepared'] =
        vi.fn(() => of({ success: true }));
      openWith([spell(1, false)], 3);
      component.battleTogglePrepared(spell(1, false), checkbox(true));
      expect(component.battlePreparedCount()).toBe(1);
    });
  });

  describe('faixa da vez no combate', () => {
    it('mestre na vez de um NPC: precisa agir (com o d20); na vez de um jogador: só aguarda', () => {
      detail.set(sessionDetail({ players: [player('p1')], npcs: [npc('n1')] }));
      expect(
        component.turnBanner(participant('c1', { participant_type: 'npc', id_npc_session: 'n1' })),
      ).toEqual({ text: 'TURNO DE Personagem n1 — AJA PELO NPC!', action: true });
      expect(component.turnBanner(participant('c2', { id_player_session: 'p1' }))).toEqual({
        text: 'AGUARDANDO Personagem p1...',
        action: false,
      });
    });
  });

  describe('carregamento por skeleton', () => {
    it('com a sessão aberta o overlay do dragão fica desligado; ao sair volta', () => {
      const overlay = TestBed.inject(LoadingOverlayService);
      expect(overlay.httpSuppressed).toBe(true);
      component.ngOnDestroy();
      expect(overlay.httpSuppressed).toBe(false);
    });
  });

  describe('sessão apagada pelo mestre', () => {
    it('jogador vê o aviso de sessão encerrada', () => {
      detail.set(
        sessionDetail({ game_session: { ...sessionDetail().game_session, user_id: 'outro' } }),
      );
      component.onSessionDeleted();
      expect(component.sessionEnded()).toBe(true);
    });

    it('o próprio mestre não vê o aviso (ele já está saindo)', () => {
      component.onSessionDeleted();
      expect(component.sessionEnded()).toBe(false);
    });
  });

  describe('dano/cura em área (quadro do mestre)', () => {
    function withArea() {
      const p1 = player('p1', {
        character: { ...player('p1').character!, current_hit_points: 15, temporary_hit_points: 4 },
      });
      const n1 = npc('n1', {
        character: { ...player('n1').character!, current_hit_points: 10 },
      });
      const m1 = monster('m1', { hp_current: 7, hp_max: 7 });
      detail.set(sessionDetail({ players: [p1], npcs: [n1], monsters: [m1] }));
    }

    it('dano: cada alvo com o próprio valor, pelo mesmo caminho do card (temporária primeiro)', () => {
      withArea();
      component.applyAreaAmount({
        kind: 'damage',
        targets: [
          { type: 'player', id: 'p1', amount: 10 },
          { type: 'npc', id: 'n1', amount: 5 },
          { type: 'monster', id: 'm1', amount: 20 },
        ],
      });
      expect(gameSessionService.updatePlayerHp).toHaveBeenCalledWith('p1', 9, 0);
      expect(gameSessionService.updateNpcHp).toHaveBeenCalledWith('n1', 5);
      expect(gameSessionService.updateMonsterHp).toHaveBeenCalledWith('m1', 0);
    });

    it('cura em jogador para no máximo sem virar vida temporária', () => {
      withArea();
      component.applyAreaAmount({
        kind: 'heal',
        targets: [{ type: 'player', id: 'p1', amount: 50 }],
      });
      expect(gameSessionService.updatePlayerHp).toHaveBeenCalledWith('p1', 20, 4);
      expect(component.pendingTempHp()).toBeNull();
    });

    it('alvo que saiu da sessão é ignorado', () => {
      withArea();
      component.applyAreaAmount({
        kind: 'damage',
        targets: [{ type: 'monster', id: 'x', amount: 3 }],
      });
      expect(gameSessionService.updateMonsterHp).not.toHaveBeenCalled();
    });
  });

  describe('PV de jogador', () => {
    const withHp = (current: number, temp: number) =>
      player('p1', {
        character: {
          ...player('p1').character!,
          current_hit_points: current,
          temporary_hit_points: temp,
        },
      });

    it('dano consome primeiro a vida temporária', () => {
      const p = withHp(15, 5);
      typeDamage(p, 8);
      component.applyPlayerDamage(p);
      expect(gameSessionService.updatePlayerHp).toHaveBeenCalledWith('p1', 12, 0);
    });

    it('dano menor que a vida temporária não toca no PV', () => {
      const p = withHp(15, 5);
      typeDamage(p, 3);
      component.applyPlayerDamage(p);
      expect(gameSessionService.updatePlayerHp).toHaveBeenCalledWith('p1', 15, 2);
    });

    it('PV não fica negativo', () => {
      const p = withHp(4, 0);
      typeDamage(p, 50);
      component.applyPlayerDamage(p);
      expect(gameSessionService.updatePlayerHp).toHaveBeenCalledWith('p1', 0, 0);
    });

    it('valor zero, negativo ou vazio não faz nada', () => {
      const p = withHp(10, 0);
      typeDamage(p, 0);
      component.applyPlayerDamage(p);
      typeDamage(p, -5);
      component.applyPlayerHeal(p);
      expect(gameSessionService.updatePlayerHp).not.toHaveBeenCalled();
    });

    it('cura até o máximo aplica direto e mantém a vida temporária', () => {
      const p = withHp(10, 3);
      typeDamage(p, 10);
      component.applyPlayerHeal(p);
      expect(gameSessionService.updatePlayerHp).toHaveBeenCalledWith('p1', 20, 3);
      expect(component.pendingTempHp()).toBeNull();
    });

    it('cura acima do máximo pede confirmação de vida temporária (não acumula)', () => {
      const p = withHp(18, 2);
      typeDamage(p, 7);
      component.applyPlayerHeal(p);
      expect(gameSessionService.updatePlayerHp).not.toHaveBeenCalled();
      expect(component.pendingTempHp()).toMatchObject({ newAmount: 5, existingAmount: 2 });

      component.confirmTempHp(true);
      expect(gameSessionService.updatePlayerHp).toHaveBeenCalledWith('p1', 20, 5);
    });

    it('recusar a vida temporária nova cura até o máximo e mantém a antiga', () => {
      const p = withHp(18, 2);
      typeDamage(p, 7);
      component.applyPlayerHeal(p);
      component.declineTempHp();
      expect(gameSessionService.updatePlayerHp).toHaveBeenCalledWith('p1', 20, 2);
    });

    it('depois de salvar, o estado da sessão é atualizado', () => {
      const p = withHp(15, 0);
      detail.set(sessionDetail({ players: [p] }));
      typeDamage(p, 5);
      component.applyPlayerDamage(p);
      expect(detail()!.players[0].character).toMatchObject({
        current_hit_points: 10,
        temporary_hit_points: 0,
      });
    });
  });

  describe('PV de NPC e monstro (limitados entre 0 e o máximo)', () => {
    it('NPC', () => {
      const n = npc('n1', { character: { ...player('n1').character!, current_hit_points: 5 } });
      typeDamage(n, 9);
      component.applyNpcDamage(n);
      expect(gameSessionService.updateNpcHp).toHaveBeenLastCalledWith('n1', 0);
      typeDamage(n, 100);
      component.applyNpcHeal(n);
      expect(gameSessionService.updateNpcHp).toHaveBeenLastCalledWith('n1', 20);
    });

    it('monstro', () => {
      const m = monster('m1', { hp_current: 3, hp_max: 30 });
      typeDamage(m, 10);
      component.applyMonsterHeal(m);
      expect(gameSessionService.updateMonsterHp).toHaveBeenLastCalledWith('m1', 13);
      typeDamage(m, 99);
      component.applyMonsterDamage(m);
      expect(gameSessionService.updateMonsterHp).toHaveBeenLastCalledWith('m1', 0);
    });
  });

  describe('monstro em destaque no combate', () => {
    const revealed = [
      { id_monster_session: 'm1', name: 'Goblin', image_url: null },
      { id_monster_session: 'm2', name: 'Orc', image_url: null },
    ];
    const order = (current: string) =>
      combat([
        participant('pm2', {
          participant_type: 'monster',
          id_monster_session: 'm2',
          is_current_turn: current === 'pm2',
        }),
        participant('pp', {
          participant_type: 'player',
          id_player_session: 'p1',
          is_current_turn: current === 'pp',
        }),
        participant('pm1', {
          participant_type: 'monster',
          id_monster_session: 'm1',
          is_current_turn: current === 'pm1',
        }),
      ]);

    it('sem revelados não mostra nada; sem combate mostra o primeiro revelado', () => {
      expect(component.spotlightMonster()).toBeNull();
      detail.set(sessionDetail({ revealed_monsters: revealed }));
      expect(component.spotlightMonster()!.id_monster_session).toBe('m1');
    });

    it('por padrão mostra o monstro de melhor iniciativa', () => {
      detail.set(sessionDetail({ revealed_monsters: revealed, combat: order('pp') }));
      expect(component.spotlightMonster()!.id_monster_session).toBe('m2');
    });

    it('troca pro monstro da vez e mantém durante o turno de jogador', () => {
      detail.set(sessionDetail({ revealed_monsters: revealed, combat: order('pm1') }));
      TestBed.tick();
      expect(component.spotlightMonster()!.id_monster_session).toBe('m1');

      detail.set(sessionDetail({ revealed_monsters: revealed, combat: order('pp') }));
      TestBed.tick();
      expect(component.spotlightMonster()!.id_monster_session).toBe('m1');

      detail.set(sessionDetail({ revealed_monsters: revealed, combat: order('pm2') }));
      TestBed.tick();
      expect(component.spotlightMonster()!.id_monster_session).toBe('m2');
    });

    it('turno atual só existe com combate ativo', () => {
      detail.set(sessionDetail({ combat: order('pp') }));
      expect(component.currentTurnParticipant()!.id_combat_participant).toBe('pp');
      detail.set(
        sessionDetail({
          combat: {
            ...order('pp'),
            encounter: { ...order('pp').encounter, status: 'rolling_initiative' },
          },
        }),
      );
      expect(component.currentTurnParticipant()).toBeNull();
    });
  });

  describe('impacto de dano junto com o toast de rolagem', () => {
    let trigger: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      trigger = vi.spyOn(TestBed.inject(DamageImpactService), 'trigger');
      // Primeira carga: rolagens existentes só viram "vistas", sem toast nem impacto.
      detail.set(sessionDetail({ recent_rolls: [roll('antiga')] }));
      TestBed.tick();
    });

    afterEach(() => component.ngOnDestroy());

    function arrive(...rolls: RollLogEntry[]) {
      detail.set(sessionDetail({ recent_rolls: [...rolls, roll('antiga')] }));
      TestBed.tick();
    }

    const damage = (
      id: string,
      total: number,
      overrides: Partial<RollLogEntry> = {},
    ): RollLogEntry => ({
      ...roll(id),
      roll_type: 'damage',
      dice_notation: '2d6',
      modifier: 2,
      total,
      ...overrides,
    });

    it('rolagem antiga (primeira carga) não dispara', () => {
      expect(trigger).not.toHaveBeenCalled();
    });

    it('dano de outro jogador dispara junto com o toast', () => {
      arrive(damage('d1', 14));
      expect(component.activeRollToast()?.id_roll).toBe('d1');
      expect(trigger).toHaveBeenCalledTimes(1);
      expect(trigger.mock.calls[0][0]).toMatchObject({
        dice_notation: '2d6',
        modifier: 2,
        total: 14,
      });
    });

    it('ataque, perícia e dados livres não disparam', () => {
      arrive(
        { ...roll('a'), roll_type: 'attack' },
        { ...roll('b'), roll_type: 'skill' },
        { ...roll('c'), roll_type: 'dice' },
      );
      expect(trigger).not.toHaveBeenCalled();
    });

    it('cura de magia de outro jogador também dispara (névoa), com tipo e rótulo da rolagem', () => {
      arrive({ ...damage('h1', 9), roll_type: 'heal', label: 'Cura: Curar Ferimentos' });
      expect(trigger).toHaveBeenCalledTimes(1);
      expect(trigger.mock.calls[0][0]).toMatchObject({
        roll_type: 'heal',
        label: 'Cura: Curar Ferimentos',
        total: 9,
      });
    });

    it('vários danos seguidos: cada um dispara quando o seu toast aparece', () => {
      arrive(
        damage('d1', 5, { created_at: '2026-01-01T00:00:01Z' }),
        damage('d2', 9, { created_at: '2026-01-01T00:00:02Z' }),
      );
      expect(trigger).toHaveBeenCalledTimes(1);
      component.closeRollToast();
      expect(trigger).toHaveBeenCalledTimes(2);
      expect(trigger.mock.calls[1][0].total).toBe(9);
    });
  });

  describe('aplicar resultado de rolagem no alvo (opcional)', () => {
    const p1 = player('p1', {
      id_character: 10,
      user_id: 'dm',
      character: { ...player('p1').character!, current_hit_points: 15, temporary_hit_points: 4 },
    });
    const p2 = player('p2', { id_character: 20 });
    const n1 = npc('n1', { id_character: 30 });
    const m1 = monster('m1', { hp_current: 7, hp_max: 7 });

    it('mestre: todos os jogadores, NPCs e monstros; só jogador aceita PV temporários', () => {
      detail.set(sessionDetail({ players: [p1, p2], npcs: [n1], monsters: [m1] }));
      expect(component.applyTargetsFor(10)).toEqual([
        { key: 'player:p1', label: 'Personagem p1', allowsTempHp: true },
        { key: 'player:p2', label: 'Personagem p2', allowsTempHp: true },
        { key: 'npc:n1', label: 'Personagem n1', allowsTempHp: false },
        { key: 'monster:m1', label: 'Goblin', allowsTempHp: false },
      ]);
    });

    describe('jogador (não é o mestre)', () => {
      const asPlayer = () =>
        detail.set(
          sessionDetail({
            game_session: { ...sessionDetail().game_session, user_id: 'outro-mestre' },
            players: [p1, p2],
            npcs: [n1],
            monsters: [m1],
            revealed_monsters: [
              { id_monster_session: 'm1', name: 'Goblin Chefe', image_url: null },
            ],
          }),
        );

      it('alcança aliados, NPCs e só monstros revelados (só dano), com quem rolou primeiro', () => {
        asPlayer();
        const targets = component.applyTargetsFor(20);
        expect(targets.map((t) => t.key)).toEqual([
          'player:p2',
          'player:p1',
          'npc:n1',
          'monster:m1',
        ]);
        expect(targets.find((t) => t.key === 'monster:m1')).toEqual({
          key: 'monster:m1',
          label: 'Goblin Chefe',
          allowsTempHp: false,
          damageOnly: true,
        });
      });

      it('aplicar manda só a quantidade pro servidor e usa o PV que ele devolve', () => {
        asPlayer();
        component.activeActionsCharacter.set({ id: 20, name: 'Personagem p2' });
        gameSessionService.applyAmount.mockReturnValue(
          of({ current_hit_points: 12, temporary_hit_points: 0 }),
        );
        component.applyRollToTarget({ targetKey: 'player:p1', amount: 7, kind: 'damage' });
        expect(gameSessionService.applyAmount).toHaveBeenCalledWith('gs', {
          id_character: 20,
          target_kind: 'player',
          target_id: 'p1',
          amount: 7,
          kind: 'damage',
        });
        expect(gameSessionService.updatePlayerHp).not.toHaveBeenCalled();
        const updated = detail()!.players.find((p) => p.id_player_session === 'p1')!;
        expect(updated.character!.current_hit_points).toBe(12);
        expect(updated.character!.temporary_hit_points).toBe(0);
      });

      it('dano em monstro: nada de PV volta pro jogador', () => {
        asPlayer();
        component.activeActionsCharacter.set({ id: 20, name: 'Personagem p2' });
        gameSessionService.applyAmount.mockReturnValue(of({}));
        component.applyRollToTarget({ targetKey: 'monster:m1', amount: 3, kind: 'damage' });
        expect(gameSessionService.applyAmount.mock.calls[0][1]).toMatchObject({
          target_kind: 'monster',
          target_id: 'm1',
        });
        expect(gameSessionService.updateMonsterHp).not.toHaveBeenCalled();
      });
    });

    it('dano no jogador consome a vida temporária primeiro', () => {
      detail.set(sessionDetail({ players: [p1] }));
      component.applyRollToTarget({ targetKey: 'player:p1', amount: 10, kind: 'damage' });
      expect(gameSessionService.updatePlayerHp).toHaveBeenCalledWith('p1', 9, 0);
    });

    it('cura de magia no jogador vai só até o máximo, sem virar PV temporário', () => {
      detail.set(sessionDetail({ players: [p1] }));
      component.applyRollToTarget({ targetKey: 'player:p1', amount: 50, kind: 'heal' });
      expect(gameSessionService.updatePlayerHp).toHaveBeenCalledWith('p1', 20, 4);
      expect(component.pendingTempHp()).toBeNull();
    });

    it('PV temporários não acumulam: fica o maior', () => {
      detail.set(sessionDetail({ players: [p1] }));
      component.applyRollToTarget({ targetKey: 'player:p1', amount: 2, kind: 'temp_hp' });
      expect(gameSessionService.updatePlayerHp).toHaveBeenLastCalledWith('p1', 15, 4);
      component.applyRollToTarget({ targetKey: 'player:p1', amount: 9, kind: 'temp_hp' });
      expect(gameSessionService.updatePlayerHp).toHaveBeenLastCalledWith('p1', 15, 9);
    });

    it('NPC e monstro: dano e cura limitados entre 0 e o máximo', () => {
      detail.set(sessionDetail({ npcs: [n1], monsters: [m1] }));
      component.applyRollToTarget({ targetKey: 'monster:m1', amount: 30, kind: 'damage' });
      expect(gameSessionService.updateMonsterHp).toHaveBeenCalledWith('m1', 0);
      component.applyRollToTarget({ targetKey: 'npc:n1', amount: 5, kind: 'heal' });
      expect(gameSessionService.updateNpcHp).toHaveBeenCalledWith('n1', 20);
    });

    it('alvo inexistente ou valor zero não faz nada', () => {
      detail.set(sessionDetail({ players: [p1] }));
      component.applyRollToTarget({ targetKey: 'player:xx', amount: 5, kind: 'damage' });
      component.applyRollToTarget({ targetKey: 'player:p1', amount: 0, kind: 'damage' });
      expect(gameSessionService.updatePlayerHp).not.toHaveBeenCalled();
    });
  });

  describe('teste secreto (jogador)', () => {
    const request = (id: string) => ({
      request_id: id,
      id_character: 10,
      label: 'Percepção',
      check: { kind: 'skill' as const, id_skill: 13 },
    });

    it('pedidos entram numa fila, um de cada vez, sem repetir', () => {
      component.receiveSecretRoll(request('a'));
      component.receiveSecretRoll(request('b'));
      component.receiveSecretRoll(request('a'));
      expect(component.pendingSecretRolls().map((r) => r.request_id)).toEqual(['a', 'b']);
      component.finishSecretRoll();
      expect(component.pendingSecretRolls().map((r) => r.request_id)).toEqual(['b']);
    });
  });

  describe('vez do combate (trava das somas 1×/turno)', () => {
    it('sem combate ativo não trava; com combate ativo usa combate:rodada:participante', () => {
      expect(component.combatTurnKey()).toBeNull();
      detail.set(
        sessionDetail({
          combat: combat([participant('a', { is_current_turn: true }), participant('b')]),
        }),
      );
      expect(component.combatTurnKey()).toBe('enc:1:a');
      detail.set(sessionDetail({ combat: combat([participant('a')], 'rolling_initiative') }));
      expect(component.combatTurnKey()).toBeNull();
    });
  });

  describe('Resistência Implacável (PV que a API grava)', () => {
    it('a sessão usa o PV devolvido pela API (1 em vez de 0)', () => {
      const p1 = player('p1', {
        character: { ...player('p1').character!, current_hit_points: 6, temporary_hit_points: 0 },
      });
      detail.set(sessionDetail({ players: [p1] }));
      gameSessionService.updatePlayerHp.mockReturnValue(of({ current_hit_points: 1 }));
      component.applyRollToTarget({ targetKey: 'player:p1', amount: 20, kind: 'damage' });
      expect(gameSessionService.updatePlayerHp).toHaveBeenCalledWith('p1', 0, 0);
      expect(detail()!.players[0].character!.current_hit_points).toBe(1);
    });
  });

  describe('aliados e defesas', () => {
    it('aliados são os outros jogadores com personagem; alvos levam as defesas', () => {
      const defenses = { resistances: ['fogo'], uncanny_dodge: false, evasion: false };
      const p1 = player('p1', { id_character: 10 });
      const p2 = player('p2', {
        id_character: 20,
        character: { ...player('p2').character!, defenses },
      });
      detail.set(sessionDetail({ players: [p1, p2, player('p3', { character: null })] }));
      expect(component.alliesFor(10)).toEqual([{ id_player_session: 'p2', name: 'Personagem p2' }]);
      expect(component.applyTargetsFor(10).find((t) => t.key === 'player:p2')!.defenses).toEqual(
        defenses,
      );
    });
  });

  describe('imagem de referência em tela cheia', () => {
    const image = { id_reference_image: 'img1', image_url: 'https://cdn/a.png', title: null };

    it('aparece quando o mestre mostra; fechar só some nesta tela', () => {
      expect(component.visibleReferenceImage()).toBeNull();
      detail.set(sessionDetail({ shown_reference_image: image }));
      expect(component.visibleReferenceImage()).toEqual(image);
      component.dismissReferenceImage();
      expect(component.visibleReferenceImage()).toBeNull();
      // outra imagem aparece mesmo depois de fechar a anterior
      const other = { ...image, id_reference_image: 'img2' };
      detail.set(sessionDetail({ shown_reference_image: other }));
      expect(component.visibleReferenceImage()).toEqual(other);
    });

    it('depois que o mestre fecha, mostrar a mesma imagem de novo volta a aparecer', () => {
      detail.set(sessionDetail({ shown_reference_image: image }));
      component.dismissReferenceImage();
      detail.set(sessionDetail({ shown_reference_image: null }));
      TestBed.tick();
      detail.set(sessionDetail({ shown_reference_image: image }));
      expect(component.visibleReferenceImage()).toEqual(image);
    });
  });

  describe('DANO/CURA na gaveta de ações (1.7.2)', () => {
    it('dano no próprio personagem consome os temporários primeiro e grava o PV', () => {
      detail.set(
        sessionDetail({
          players: [
            player('p1', {
              id_character: 5,
              character: {
                ...player('p1').character!,
                current_hit_points: 15,
                temporary_hit_points: 3,
              },
            }),
          ],
        }),
      );
      expect(component.canAdjustHpFor(5)).toBe(true); // mestre (dono da sessão)
      component.adjustHpFor(5, { kind: 'damage', amount: 5 });
      expect(gameSessionService.updatePlayerHp).toHaveBeenCalledWith('p1', 13, 0);
      // e toca o impacto de dano em tela cheia, como nas rolagens
      expect(TestBed.inject(DamageImpactService).current()?.effect).toBeNull();
    });

    it('cura vai até o máximo; personagem fora da mesa não pode', () => {
      detail.set(
        sessionDetail({
          players: [
            player('p1', {
              id_character: 5,
              character: { ...player('p1').character!, current_hit_points: 10 },
            }),
          ],
        }),
      );
      component.adjustHpFor(5, { kind: 'heal', amount: 4 });
      expect(gameSessionService.updatePlayerHp).toHaveBeenCalledWith('p1', 14, 0);
      expect(component.canAdjustHpFor(99)).toBe(false);
    });
  });

  describe('aviso "aplicou"', () => {
    it('junta vários alvos do mesmo valor num aviso só', () => {
      component.showAmountAppliedToast(20, 'Ana', 8, 'damage', 'Goblin');
      component.showAmountAppliedToast(20, 'Ana', 8, 'damage', 'Orc');
      expect(component.activeSpellCastToast()).toMatchObject({
        actorName: 'Ana',
        verb: 'APLICOU',
        spellName: '8 de dano',
        saveNote: 'em Goblin, Orc',
      });
      component.showAmountAppliedToast(20, 'Ana', 5, 'heal', 'Thorin');
      expect(component.activeSpellCastToast()).toMatchObject({
        spellName: '5 de cura',
        saveNote: 'em Thorin',
      });
    });
  });

  describe('aviso de troca de vez (tela cheia)', () => {
    afterEach(() => vi.useRealTimers());

    const setup = (dmId = 'dm') => {
      const me = player('p1', {
        id_character: 10,
        user_id: 'dm',
        character: { ...player('p1').character!, image_url: 'https://cdn/eu.png' },
      });
      const other = player('p2', { id_character: 20, user_id: 'outro' });
      const goblin = monster('m1', { image_url: 'https://cdn/goblin.png' });
      const parts = [
        participant('c1', { id_player_session: 'p1' }),
        participant('c2', { id_player_session: 'p2' }),
        participant('c3', { participant_type: 'monster', id_monster_session: 'm1' }),
      ];
      detail.set(
        sessionDetail({
          game_session: { ...sessionDetail().game_session, user_id: dmId },
          players: [me, other],
          monsters: [goblin],
          combat: combat(parts),
        }),
      );
      return parts;
    };

    it('card do jogador com a foto; monstro escondido aparece como misterioso pro jogador', () => {
      const parts = setup('outro-mestre');
      expect(component.turnCardFor(parts[0])).toMatchObject({
        imageUrl: 'https://cdn/eu.png',
      });
      expect(component.turnCardFor(parts[2])).toEqual({
        name: 'Monstro misterioso',
        imageUrl: 'assets/monster.png',
        avatarPreset: null,
      });
    });

    it('jogador vem com os dados do card inteiro (jogador, classe, raça, nível, PV)', () => {
      const parts = setup('outro-mestre');
      expect(component.turnCardFor(parts[1]).character).toEqual({
        playerName: 'Jogador p2',
        className: 'Guerreiro',
        race: 'Humano',
        level: 1,
        hp: { current: 20, max: 20, temp: 0 },
        xp: 0,
        nextLevelXp: undefined,
      });
    });

    it('mestre vê o monstro com a imagem dele', () => {
      const parts = setup('dm');
      expect(component.turnCardFor(parts[2])).toMatchObject({ imageUrl: 'https://cdn/goblin.png' });
    });

    it('"É A SUA VEZ" só pra quem é dono do personagem; some sozinho', () => {
      vi.useFakeTimers();
      setup('outro-mestre'); // usuário logado é 'dm', dono do p1
      component.showTurnChangeToast('c2', 'c1');
      expect(component.turnChangeToast()).toMatchObject({ isMine: true, round: 1 });
      expect(component.turnChangeToast()!.from!.name).toBe('Personagem p2');
      component.showTurnChangeToast('c1', 'c2');
      expect(component.turnChangeToast()).toMatchObject({ isMine: false });
      vi.advanceTimersByTime(3000);
      expect(component.turnChangeToast()).toBeNull();
    });
  });

  describe('aviso de subir de nível', () => {
    afterEach(() => vi.useRealTimers());

    it('XP pra vários de uma vez: um aviso só com todos os nomes, sem repetir', () => {
      vi.useFakeTimers();
      component.showLevelUpEligibleToast('Thorin', null);
      const key = component.activeLevelUpEligibleToast()!.key;
      component.showLevelUpEligibleToast('Ana', null);
      component.showLevelUpEligibleToast('Ana', null);
      component.showLevelUpEligibleToast('Lyra', null);
      const toast = component.activeLevelUpEligibleToast()!;
      expect(toast.entries.map((e) => e.name)).toEqual(['Thorin', 'Ana', 'Lyra']);
      expect(toast.key).toBe(key); // não refaz a explosão
      expect(component.levelUpEligibleText(toast.entries)).toBe(
        'Thorin, Ana E Lyra SUBIRAM DE NÍVEL!',
      );
      vi.advanceTimersByTime(6_000);
      expect(component.activeLevelUpEligibleToast()).toBeNull();
    });

    it('um só: "SUBIU"; depois de fechar, o próximo abre um aviso novo', () => {
      component.showLevelUpEligibleToast('Thorin', null);
      expect(component.levelUpEligibleText(component.activeLevelUpEligibleToast()!.entries)).toBe(
        'Thorin SUBIU DE NÍVEL!',
      );
      const key = component.activeLevelUpEligibleToast()!.key;
      component.closeLevelUpEligibleToast();
      component.showLevelUpEligibleToast('Ana', null);
      expect(component.activeLevelUpEligibleToast()!.entries.map((e) => e.name)).toEqual(['Ana']);
      expect(component.activeLevelUpEligibleToast()!.key).toBe(key + 1);
    });
  });

  describe('celular: gaveta AÇÕES DE PERSONAGEM e rolagens', () => {
    const loginAs = (id: string) =>
      (
        TestBed.inject(AuthService).currentUser as ReturnType<
          typeof signal<{ id: string; email: string }>
        >
      ).set({
        id,
        email: `${id}@x`,
      });

    it('mestre não tem gaveta de personagem (os botões ficam nos cards)', () => {
      detail.set(sessionDetail({ players: [player('p1')] }));
      expect(component.myPlayer()).toBeNull();
    });

    it('jogador: a gaveta é do próprio personagem', () => {
      detail.set(sessionDetail({ players: [player('p1'), player('p2')] }));
      loginAs('user-p2');
      expect(component.myPlayer()?.id_player_session).toBe('p2');
    });

    it('jogador sem personagem na sessão fica sem gaveta', () => {
      detail.set(sessionDetail({ players: [player('p1', { character: null })] }));
      loginAs('user-p1');
      expect(component.myPlayer()).toBeNull();
    });

    it('rolagens começam recolhidas', () => {
      expect(component.mobileRollsOpen()).toBe(false);
    });
  });

  describe('gaveta de ações: destaque', () => {
    it('PV ao vivo do jogador dono do personagem (com o PV temporário)', () => {
      const p = player('p1', { id_character: 7 });
      p.character!.current_hit_points = 12;
      p.character!.temporary_hit_points = 3;
      detail.set(sessionDetail({ players: [p] }));
      expect(component.liveHpFor(7)).toEqual({ current: 12, max: 20, temp: 3 });
    });

    it('personagem sem jogador (NPC) usa o PV da ficha', () => {
      detail.set(sessionDetail({ players: [player('p1', { id_character: 7 })] }));
      expect(component.liveHpFor(99)).toBeNull();
    });

    it('sabe se o personagem é o da vez', () => {
      detail.set(
        sessionDetail({
          players: [player('p1', { id_character: 7 }), player('p2', { id_character: 8 })],
          combat: combat([
            participant('a', { id_player_session: 'p1', is_current_turn: true }),
            participant('b', { id_player_session: 'p2' }),
          ]),
        }),
      );
      expect(component.isCharacterCurrentTurn(7)).toBe(true);
      expect(component.isCharacterCurrentTurn(8)).toBe(false);
    });

    it('ITENS abre o inventário do próprio personagem', () => {
      detail.set(sessionDetail({ players: [player('p1', { id_character: 7 })] }));
      (
        TestBed.inject(AuthService).currentUser as ReturnType<
          typeof signal<{ id: string; email: string }>
        >
      ).set({ id: 'user-p1', email: 'p1@x' });
      component.openMyInventory();
      expect(component.activeInventoryPlayer()).toEqual({
        idPlayerSession: 'p1',
        idCharacter: 7,
        playerName: 'Personagem p1',
      });
    });
  });

  describe('volta da ficha aberta pelas ações', () => {
    it('ficha aberta pela gaveta leva o personagem em fromActions', () => {
      const router = TestBed.inject(Router);
      const nav = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      component.viewCharacterSheet(7, true);
      expect(nav).toHaveBeenCalledWith(['/character-sheet', 7], {
        queryParams: { sessionId: undefined, fromActions: 7 },
      });
    });

    it('reabre as ações do personagem quando a sessão carrega e limpa a URL', () => {
      const router = TestBed.inject(Router);
      const nav = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      TestBed.runInInjectionContext(() => {
        component = new SessionPanelComponent();
      });
      (component as unknown as { reopenActions: () => string }).reopenActions = () => '7';
      detail.set(sessionDetail({ players: [player('p1', { id_character: 7 })] }));
      TestBed.tick();
      expect(component.activeActionsCharacter()).toEqual({ id: 7, name: 'Personagem p1' });
      expect(nav).toHaveBeenCalledWith(['/session', undefined], { replaceUrl: true });
    });
  });

  describe('aviso do lançamento de magia (1.5.0)', () => {
    const SPELL = {
      id_spell: 9,
      name: 'Raio de Fogo',
      casting_time: '1 ação',
      range_distance: 36,
      duration: 'Instantânea',
      is_verbal: true,
      is_somatic: true,
      is_material: false,
      spellLevel: 0,
      school: 'Evocação',
    };
    const stage = (castId: string, extra: Record<string, unknown> = {}) => ({
      cast_id: castId,
      user_id: 'u-outro',
      id_character: 7,
      actor_name: 'Elora',
      spell: SPELL,
      phase: 'open' as 'open' | 'done',
      rolls: [] as {
        id_roll: string;
        kind: 'attack' | 'damage' | 'heal';
        outcome: 'pending' | 'hit' | 'miss' | null;
        critical: boolean;
      }[],
      save_dc: null,
      save_ability: null,
      ...extra,
    });
    const attack = {
      ...roll('atk'),
      roll_type: 'attack' as const,
      rolls: [15],
      modifier: 5,
      total: 20,
      cast_id: 'c1',
    };

    beforeEach(() => {
      vi.useFakeTimers();
      detail.set(sessionDetail({ recent_rolls: [] }));
      TestBed.tick();
    });

    afterEach(() => {
      component.ngOnDestroy();
      vi.useRealTimers();
    });

    it('rolagem do lançamento não vira aviso avulso; o aviso mostra a rolagem achada no histórico', () => {
      detail.set(sessionDetail({ recent_rolls: [attack] }));
      TestBed.tick();
      expect(component.activeRollToast()).toBeNull();
      expect(component.visibleRecentRolls().map((r) => r.id_roll)).toEqual(['atk']);

      component.onSpellCastStage(
        stage('c1', {
          rolls: [{ id_roll: 'atk', kind: 'attack', outcome: 'pending', critical: false }],
        }),
      );
      const view = component.activeCastView()!;
      expect(view.spellName).toBe('Raio de Fogo');
      expect(view.card.badge).toBe('T');
      expect(view.rolls).toEqual([
        expect.objectContaining({ id: 'atk', total: 20, outcome: 'pending' }),
      ]);
      expect(view.done).toBe(false);
    });

    it('o que foi aplicado vai no aviso do lançamento, sem o aviso "aplicou" por cima', () => {
      component.onSpellCastStage(
        stage('c1', { applied: [{ label: 'Goblin', amount: 8, kind: 'damage' }] }),
      );
      expect(component.activeCastView()?.applied).toEqual([
        { label: 'Goblin', amount: 8, kind: 'damage' },
      ]);
      const applied = {
        id_character: 20,
        actor_name: 'Ana',
        target_label: 'Goblin',
        amount: 8,
        kind: 'damage' as const,
      };
      component.onAmountApplied({ ...applied, cast_id: 'c1' });
      expect(component.activeSpellCastToast()).toBeNull();
      component.onAmountApplied(applied);
      expect(component.activeSpellCastToast()).toMatchObject({ verb: 'APLICOU' });
    });

    it('terminou: some depois de 8 s; etapa atrasada desse lançamento não reabre', () => {
      component.onSpellCastStage(stage('c1', { phase: 'done' }));
      expect(component.activeCastId()).toBe('c1');
      vi.advanceTimersByTime(8000);
      expect(component.activeCastId()).toBeNull();
      component.onSpellCastStage(stage('c1'));
      expect(component.activeCastId()).toBeNull();
    });

    it('etapa "em andamento" que chega depois do "terminou" não volta atrás', () => {
      component.onSpellCastStage(stage('c1', { phase: 'done' }));
      component.onSpellCastStage(stage('c1', { phase: 'open' }));
      expect(component.activeCastView()?.done).toBe(true);
    });

    it('cancelou (fechou sem rolar): o aviso some na hora e sai da fila', () => {
      component.onSpellCastStage(stage('c1'));
      component.onSpellCastStage(stage('c2', { actor_name: 'Bram' }));
      component.onSpellCastStage(stage('c2', { phase: 'cancel' }));
      component.onSpellCastStage(stage('c1', { phase: 'cancel' }));
      expect(component.activeCastId()).toBeNull();
      component.onSpellCastStage(stage('c1'));
      expect(component.activeCastId()).toBeNull(); // etapa atrasada não reabre
    });

    it('vários lançamentos entram em fila', () => {
      component.onSpellCastStage(stage('c1'));
      component.onSpellCastStage(stage('c2', { actor_name: 'Bram' }));
      expect(component.activeCastId()).toBe('c1');
      component.closeCastNotice();
      expect(component.activeCastView()?.actorName).toBe('Bram');
    });

    it('quem lançou com rolagem não vê o aviso da mesa (acompanha no modal)', () => {
      component.markOwnCast('c1');
      component.onSpellCastStage(stage('c1', { user_id: 'dm' }));
      expect(component.activeCastId()).toBeNull();
      // ...mas o painel dele lê este mesmo estado (mesmo evento pra todos, ao mesmo tempo)
      expect(component.castViewFor('c1')?.key).toBe('c1');
    });

    it('sem notícia de quem lança, o aviso some sozinho depois do tempo máximo', () => {
      component.onSpellCastStage(stage('c1'));
      vi.advanceTimersByTime(component.CAST_NOTICE_SAFETY_MS);
      expect(component.activeCastId()).toBeNull();
    });
  });

  describe('aviso de ataque com arma (1.6.1)', () => {
    it('monta a carta da arma do evento e diz ATACOU COM', () => {
      component.onSpellCastStage({
        cast_id: 'w1',
        user_id: 'u-outro',
        id_character: 7,
        actor_name: 'Thorin',
        spell: null,
        weapon: {
          id_weapon: 20,
          name: 'Espada Longa',
          attack_bonus: 5,
          damage_modifier: 3,
          damage_die: '1d8',
          damage_type: 'cortante',
          properties: null,
          weight: 1.5,
          is_ranged: false,
        },
        phase: 'open',
        rolls: [],
        save_dc: null,
        save_ability: null,
      });
      const view = component.activeCastView()!;
      expect(view.verb).toBe('ATACOU COM');
      expect(view.spellName).toBe('Espada Longa');
      expect(view.card.badge).toBe('+5');
      expect(view.card.art).toBe('assets/cards/weapon-20.webp');
      component.ngOnDestroy();
    });
  });

  describe('impacto junto com o número na tela (aviso de lançamento)', () => {
    it('dano revelado no palco toca o impacto uma vez; ataque só o Tom', () => {
      const trigger = vi.spyOn(TestBed.inject(DamageImpactService), 'trigger');
      const dmg = { ...roll('dmg'), roll_type: 'damage' as const, cast_id: 'c1' };
      const atk = { ...roll('atk'), roll_type: 'attack' as const, cast_id: 'c1' };
      detail.set(sessionDetail({ recent_rolls: [atk, dmg] }));
      component.onCastRollRevealed('atk');
      expect(trigger).not.toHaveBeenCalled();
      component.onCastRollRevealed('dmg');
      component.onCastRollRevealed('dmg');
      expect(trigger).toHaveBeenCalledTimes(1);
      component.ngOnDestroy();
    });
  });
});
