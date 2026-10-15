import { applySessionEvent } from './session-event.reducer';
import { SessionEvent } from '../models/session-event.interface';
import {
  combat,
  monster,
  npc,
  participant,
  player,
  roll,
  sessionDetail,
} from '../../testing/session-fixtures';

const base = { id_game_session: 'gs' } as const;

/** `Omit` distributivo — mantém a união discriminada por `type`. */
type EventInput = SessionEvent extends infer E
  ? E extends SessionEvent
    ? Omit<E, 'id_game_session'>
    : never
  : never;

function apply(detail: ReturnType<typeof sessionDetail>, event: EventInput) {
  return applySessionEvent(detail, { ...base, ...event } as SessionEvent);
}

describe('applySessionEvent', () => {
  it('não muta o estado anterior', () => {
    const detail = sessionDetail({ players: [player('p1')] });
    const snapshot = structuredClone(detail);
    apply(detail, {
      type: 'player_hp_updated',
      id_player_session: 'p1',
      current_hit_points: 3,
      temporary_hit_points: 0,
    });
    expect(detail).toEqual(snapshot);
  });

  describe('jogadores e NPCs', () => {
    it('adiciona e remove jogador', () => {
      let detail = apply(sessionDetail(), { type: 'player_added', player: player('p1') });
      detail = apply(detail, { type: 'player_added', player: player('p2') });
      detail = apply(detail, { type: 'player_removed', id_player_session: 'p1' });
      expect(detail.players.map((p) => p.id_player_session)).toEqual(['p2']);
    });

    it('adiciona e remove NPC', () => {
      let detail = apply(sessionDetail(), { type: 'npc_added', npc: npc('n1') });
      expect(detail.npcs.length).toBe(1);
      detail = apply(detail, { type: 'npc_removed', id_npc_session: 'n1' });
      expect(detail.npcs).toEqual([]);
    });

    it('atualiza PV e PV temporário só do jogador certo', () => {
      const detail = apply(sessionDetail({ players: [player('p1'), player('p2')] }), {
        type: 'player_hp_updated',
        id_player_session: 'p2',
        current_hit_points: 5,
        temporary_hit_points: 4,
      });
      expect(detail.players[0].character).toMatchObject({
        current_hit_points: 20,
        temporary_hit_points: 0,
      });
      expect(detail.players[1].character).toMatchObject({
        current_hit_points: 5,
        temporary_hit_points: 4,
      });
    });

    it('jogador sem personagem é ignorado', () => {
      const detail = apply(sessionDetail({ players: [player('p1', { character: null })] }), {
        type: 'player_hp_updated',
        id_player_session: 'p1',
        current_hit_points: 5,
        temporary_hit_points: 0,
      });
      expect(detail.players[0].character).toBeNull();
    });

    it('XP de jogador e de NPC', () => {
      let detail = sessionDetail({ players: [player('p1')], npcs: [npc('n1')] });
      detail = apply(detail, {
        type: 'player_xp_granted',
        id_player_session: 'p1',
        character_name: 'A',
        xp_amount: 50,
        xp_points: 350,
        can_level_up: true,
      });
      detail = apply(detail, {
        type: 'npc_xp_granted',
        id_npc_session: 'n1',
        character_name: 'B',
        xp_amount: 50,
        xp_points: 60,
        can_level_up: false,
      });
      expect(detail.players[0].character!.experience_points).toBe(350);
      expect(detail.npcs[0].character!.experience_points).toBe(60);
    });

    it('PV de NPC', () => {
      const detail = apply(sessionDetail({ npcs: [npc('n1')] }), {
        type: 'npc_hp_updated',
        id_npc_session: 'n1',
        current_hit_points: 2,
      });
      expect(detail.npcs[0].character!.current_hit_points).toBe(2);
    });
  });

  describe('monstros', () => {
    it('adiciona, atualiza PV/imagem e edita status mesclando atributos', () => {
      let detail = apply(sessionDetail(), { type: 'monster_added', monster: monster('m1') });
      detail = apply(detail, {
        type: 'monster_hp_updated',
        id_monster_session: 'm1',
        hp_current: 3,
      });
      detail = apply(detail, {
        type: 'monster_image_updated',
        id_monster_session: 'm1',
        image_url: 'g.png',
      });
      detail = apply(detail, {
        type: 'monster_stats_updated',
        id_monster_session: 'm1',
        custom_name: null,
        hp_current: 10,
        hp_max: 12,
        ac: 16,
        abilities: { dexterity: 18 },
      });
      const m = detail.monsters[0];
      expect(m).toMatchObject({
        hp_current: 10,
        hp_max: 12,
        ac: 16,
        image_url: 'g.png',
        custom_name: undefined,
      });
      expect(m.data_snapshot).toMatchObject({ name: 'Goblin', strength: 8, dexterity: 18 });
    });

    it('revelar adiciona aos revelados (sem duplicar) e esconder remove', () => {
      let detail = sessionDetail({ monsters: [monster('m1')] });
      const reveal = {
        type: 'monster_revealed',
        id_monster_session: 'm1',
        name: 'Goblin',
        image_url: null,
      } as const;
      detail = apply(detail, reveal);
      detail = apply(detail, reveal);
      expect(detail.monsters[0].is_revealed).toBe(true);
      expect(detail.revealed_monsters).toEqual([
        { id_monster_session: 'm1', name: 'Goblin', image_url: null },
      ]);

      detail = apply(detail, { type: 'monster_hidden', id_monster_session: 'm1' });
      expect(detail.monsters[0].is_revealed).toBe(false);
      expect(detail.revealed_monsters).toEqual([]);
    });

    it('jogador (sem lista de monstros) também recebe o revelado', () => {
      const detail = apply(sessionDetail(), {
        type: 'monster_revealed',
        id_monster_session: 'm9',
        name: 'Dragão',
        image_url: 'd.png',
      });
      expect(detail.monsters).toEqual([]);
      expect(detail.revealed_monsters).toEqual([
        { id_monster_session: 'm9', name: 'Dragão', image_url: 'd.png' },
      ]);
    });

    it.each(['monster_removed', 'monster_defeated'] as const)(
      '%s tira da lista e dos revelados',
      (type) => {
        const detail = apply(
          sessionDetail({
            monsters: [monster('m1', { is_revealed: true }), monster('m2')],
            revealed_monsters: [{ id_monster_session: 'm1', name: 'Goblin', image_url: null }],
          }),
          { type, id_monster_session: 'm1', name: 'Goblin', image_url: null },
        );
        expect(detail.monsters.map((m) => m.id_monster_session)).toEqual(['m2']);
        expect(detail.revealed_monsters).toEqual([]);
      },
    );
  });

  describe('rolagens', () => {
    it('nova rolagem entra no topo e o log fica limitado a 30', () => {
      const old = Array.from({ length: 30 }, (_, i) => roll(`r${i}`));
      const detail = apply(sessionDetail({ recent_rolls: old }), {
        type: 'roll_added',
        roll: roll('novo'),
      });
      expect(detail.recent_rolls.length).toBe(30);
      expect(detail.recent_rolls[0].id_roll).toBe('novo');
      expect(detail.recent_rolls.at(-1)!.id_roll).toBe('r28');
    });

    it('magia lançada não altera o estado', () => {
      const detail = sessionDetail();
      expect(
        apply(detail, { type: 'spell_cast', id_character: 1, actor_name: 'A', spell_name: 'Luz' }),
      ).toBe(detail);
    });
  });

  describe('combate', () => {
    it.each([
      'combat_started',
      'combat_participants_added',
      'initiative_submitted',
      'turn_ended',
      'turn_order_changed',
      'turn_delayed',
    ] as const)('%s substitui o combate inteiro', (type) => {
      const next = combat([participant('a', { is_current_turn: true })]);
      const detail = apply(sessionDetail(), { type, combat: next });
      expect(detail.combat).toBe(next);
    });

    it('fim do combate limpa o combate e esconde só os monstros indicados', () => {
      const detail = apply(
        sessionDetail({
          combat: combat([participant('a')]),
          monsters: [monster('m1', { is_revealed: true }), monster('m2', { is_revealed: true })],
          revealed_monsters: [
            { id_monster_session: 'm1', name: 'A', image_url: null },
            { id_monster_session: 'm2', name: 'B', image_url: null },
          ],
        }),
        { type: 'combat_ended', id_combat_encounter: 'enc', hidden_monster_ids: ['m1'] },
      );
      expect(detail.combat).toBeNull();
      expect(detail.monsters.map((m) => m.is_revealed)).toEqual([false, true]);
      expect(detail.revealed_monsters.map((r) => r.id_monster_session)).toEqual(['m2']);
    });
  });
});
