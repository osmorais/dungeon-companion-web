import { TestBed } from '@angular/core/testing';
import { SpellCastNoticeComponent, TRIUMPH_READ_MS } from './spell-cast-notice.component';
import { CastStageRollView, CastStageView } from './spell-cast-stage.model';

const attack = (outcome: CastStageRollView['outcome']): CastStageRollView => ({
  id: 'atk',
  kind: 'attack',
  outcome,
  critical: false,
  rolls: [4],
  sides: [20],
  modifier: 2,
  total: 6,
  dropped: [false],
});

const view = (rolls: CastStageRollView[], done: boolean): CastStageView => ({
  key: 'c1',
  actorName: 'Thorin',
  verb: 'ATACOU COM',
  spellName: 'Machado',
  actor: { name: 'Thorin', imageUrl: null, avatarPreset: null, character: null },
  card: {
    title: '',
    badge: '',
    art: null,
    fallbackIcon: '',
    artBackground: null,
    ribbon: '',
    stats: [],
    text: null,
    tags: [],
  },
  rolls,
  saveNote: null,
  applied: [],
  done,
});

describe('SpellCastNoticeComponent — errou: o aviso quebra', () => {
  const create = (v: CastStageView) => {
    const notice = TestBed.runInInjectionContext(() => new SpellCastNoticeComponent());
    notice.view = v;
    return notice;
  };

  it('quebra quando terminou com o ataque errado, depois que o palco mostrou a rolagem', () => {
    const notice = create(view([attack('miss')], true));
    expect(notice.shattering).toBe(false); // palco ainda não mostrou
    notice.onRollRevealed('atk');
    expect(notice.shattering).toBe(true);
  });

  it('não quebra se acertou, se ainda não terminou ou se teve dano depois', () => {
    const hit = create(view([attack('hit')], true));
    hit.onRollRevealed('atk');
    expect(hit.shattering).toBe(false);

    const open = create(view([attack('miss')], false));
    open.onRollRevealed('atk');
    expect(open.shattering).toBe(false);

    const dmg = create(
      view([attack('miss'), { ...attack(null), id: 'dmg', kind: 'damage' }], true),
    );
    dmg.onRollRevealed('atk');
    dmg.onRollRevealed('dmg');
    expect(dmg.shattering).toBe(false);
  });

  describe('concluiu: saída de vitória', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const damage = { ...attack(null), id: 'dmg', kind: 'damage' as const };

    it('terminou com dano já mostrado: espera a leitura e toca a saída', () => {
      const notice = create(view([attack('hit'), damage], true));
      notice.ngOnChanges();
      notice.onRollRevealed('atk');
      expect(notice.triumph()).toBeNull();
      notice.onRollRevealed('dmg');
      vi.advanceTimersByTime(TRIUMPH_READ_MS);
      expect(notice.triumph()).toBe('damage');
    });

    it('cura toca a versão verde; sem terminar ou só ataque, nada', () => {
      const heal = create(view([{ ...damage, kind: 'heal' }], true));
      heal.onRollRevealed('dmg');
      vi.advanceTimersByTime(TRIUMPH_READ_MS);
      expect(heal.triumph()).toBe('heal');

      const open = create(view([damage], false));
      open.onRollRevealed('dmg');
      vi.advanceTimersByTime(TRIUMPH_READ_MS);
      expect(open.triumph()).toBeNull();

      const miss = create(view([attack('miss')], true));
      miss.onRollRevealed('atk');
      vi.advanceTimersByTime(TRIUMPH_READ_MS);
      expect(miss.triumph()).toBeNull();
    });
  });
});
