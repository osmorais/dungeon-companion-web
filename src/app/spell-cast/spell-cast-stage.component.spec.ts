import { TestBed } from '@angular/core/testing';
import {
  CAST_INTRO_MS,
  CAST_ROLL_REVEAL_MS,
  SpellCastStageComponent,
} from './spell-cast-stage.component';
import { CastStageRollView, CastStageView } from './spell-cast-stage.model';

const roll = (id: string, kind: CastStageRollView['kind']): CastStageRollView => ({
  id,
  kind,
  outcome: kind === 'attack' ? 'pending' : null,
  critical: false,
  rolls: [12],
  sides: [20],
  modifier: 5,
  total: 17,
  dropped: [false],
});

const view = (rolls: CastStageRollView[]): CastStageView => ({
  key: 'c1',
  actorName: 'Elora',
  verb: 'LANÇOU',
  spellName: 'Raio de Fogo',
  actor: { name: 'Elora', imageUrl: null, avatarPreset: null, character: null },
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
  done: false,
});

describe('SpellCastStageComponent — carta virada e rolagens com impacto', () => {
  let stage: SpellCastStageComponent;
  let revealed: string[];

  beforeEach(() => {
    vi.useFakeTimers();
    stage = TestBed.runInInjectionContext(() => new SpellCastStageComponent());
    revealed = [];
    stage.rollRevealed.subscribe((id) => revealed.push(id));
  });

  afterEach(() => {
    stage.ngOnDestroy();
    vi.useRealTimers();
  });

  function show(rolls: CastStageRollView[]) {
    stage.view = view(rolls);
    stage.ngOnChanges();
  }

  it('enquanto a carta cai virada e vira, nenhuma rolagem aparece', () => {
    stage.view = view([roll('atk', 'attack')]);
    stage.ngOnInit();
    stage.ngOnChanges();
    expect(stage.visibleRolls()).toEqual([]);
    vi.advanceTimersByTime(CAST_INTRO_MS);
    expect(stage.visibleRolls().map((r) => r.id)).toEqual(['atk']);
    expect(stage.isRevealed('atk')).toBe(false); // dados ainda rolando
    vi.advanceTimersByTime(CAST_ROLL_REVEAL_MS);
    expect(stage.isRevealed('atk')).toBe(true);
    expect(revealed).toEqual(['atk']);
    expect(stage.shaking()).toBe(false); // ataque não treme
  });

  it('o que foi aplicado aparece no aviso, só depois que a carta assenta', () => {
    stage.view = {
      ...view([roll('dmg', 'damage')]),
      applied: [{ label: 'Goblin', amount: 8, kind: 'damage' }],
    };
    stage.ngOnInit();
    stage.ngOnChanges();
    expect(stage.appliedLines()).toEqual([]);
    vi.advanceTimersByTime(CAST_INTRO_MS);
    expect(stage.appliedLines()).toEqual([{ text: '8 de dano em Goblin', kind: 'damage' }]);
  });

  it('dano chega depois: rola, bate na tela e o aviso treme', () => {
    stage.view = view([roll('atk', 'attack')]);
    stage.ngOnInit();
    stage.ngOnChanges();
    vi.advanceTimersByTime(CAST_INTRO_MS + CAST_ROLL_REVEAL_MS + 2000);
    show([roll('atk', 'attack'), roll('dmg', 'damage')]);
    expect(stage.isRevealed('dmg')).toBe(false);
    vi.advanceTimersByTime(CAST_ROLL_REVEAL_MS);
    expect(stage.isRevealed('dmg')).toBe(true);
    expect(stage.shaking()).toBe(true);
    expect(revealed).toEqual(['atk', 'dmg']);
  });

  it('várias rolagens juntas aparecem uma depois da outra', () => {
    stage.view = view([roll('a', 'attack'), roll('d', 'damage')]);
    stage.ngOnInit();
    stage.ngOnChanges();
    vi.advanceTimersByTime(CAST_INTRO_MS + CAST_ROLL_REVEAL_MS);
    expect(revealed).toEqual(['a']);
    vi.advanceTimersByTime(1100);
    expect(revealed).toEqual(['a', 'd']);
  });
});
