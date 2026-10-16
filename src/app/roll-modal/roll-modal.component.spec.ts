import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RollModalComponent, AbilityRollConfig } from './roll-modal.component';
import { GameSessionService } from '../services/game-session.service';
import { DamageImpactService } from '../services/damage-impact.service';

/** Fluxo de ataque com dano: d20 → mestre confirma o acerto → rola o dano no mesmo modal. */
describe('RollModalComponent — impacto de dano', () => {
  let trigger: ReturnType<typeof vi.fn>;

  const attack: AbilityRollConfig = {
    mode: 'ability',
    rollType: 'attack',
    label: 'Espada Longa',
    modifier: 5,
    damage: { diceCount: 1, diceSides: 8, modifier: 3, label: 'Dano: Espada Longa' },
  };

  beforeEach(() => {
    vi.useFakeTimers();
    trigger = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: GameSessionService, useValue: { postRoll: vi.fn(() => of({})) } },
        { provide: DamageImpactService, useValue: { trigger } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  function create(sessionId: string | undefined, config: AbilityRollConfig = attack) {
    const component = TestBed.runInInjectionContext(() => new RollModalComponent());
    component.config = config;
    component.sessionId = sessionId;
    return component;
  }

  /** Espera a animação dos dados (10 ticks de 80 ms). */
  const settle = () => vi.advanceTimersByTime(1000);

  it('dispara ao terminar a rolagem de dano, com notação, modificador e total', () => {
    const modal = create('gs');
    modal.roll();
    settle();
    expect(trigger).not.toHaveBeenCalled(); // d20 do ataque não é dano

    modal.rollDamageNow();
    settle();
    expect(trigger).toHaveBeenCalledTimes(1);
    const [arg] = trigger.mock.calls[0];
    expect(arg).toMatchObject({ dice_notation: '1d8', modifier: 3 });
    expect(arg.total).toBe(modal.result()!.total);
  });

  it('errou o ataque: sem impacto', () => {
    const modal = create('gs');
    modal.roll();
    settle();
    modal.confirmMiss();
    expect(trigger).not.toHaveBeenCalled();
  });

  it('fora da sessão (ficha isolada) não dispara', () => {
    const modal = create(undefined);
    modal.roll();
    settle();
    modal.rollDamageNow();
    settle();
    expect(trigger).not.toHaveBeenCalled();
  });

  it('teste de perícia/resistência não dispara', () => {
    const modal = create('gs', {
      mode: 'ability',
      rollType: 'skill',
      label: 'Atletismo',
      modifier: 2,
    });
    modal.roll();
    settle();
    expect(trigger).not.toHaveBeenCalled();
  });

  it('Destruição Divina soma os d8 extras na notação', () => {
    const modal = create('gs', {
      ...attack,
      damage: {
        ...attack.damage!,
        smite: [{ slotKey: 'level_1', levelLabel: '1º círculo', bonusDice: 2 }],
      },
    });
    modal.roll();
    settle();
    modal.rollDamageNow();
    modal.selectSmiteOption(modal.smiteOptions[0]);
    modal.confirmSmiteChoice();
    settle();
    expect(trigger.mock.calls[0][0].dice_notation).toBe('3d8');
  });
});

/** Magias: acerto automático (Mísseis Mágicos) e vários ataques na mesma ação (Raio Ardente). */
describe('RollModalComponent — magias', () => {
  const rays: AbilityRollConfig = {
    mode: 'ability',
    rollType: 'attack',
    label: 'Magia: Raio Ardente',
    modifier: 5,
    damage: { diceCount: 2, diceSides: 6, modifier: 0, label: 'Dano: Raio Ardente (fogo)' },
    instances: { count: 3, label: 'raio' },
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        { provide: GameSessionService, useValue: { postRoll: vi.fn(() => of({})) } },
        { provide: DamageImpactService, useValue: { trigger: vi.fn() } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  function create(config: AbilityRollConfig) {
    const component = TestBed.runInInjectionContext(() => new RollModalComponent());
    component.config = config;
    component.sessionId = 'gs';
    component.ngOnInit();
    const rolled = vi.fn();
    component.rolled.subscribe(rolled);
    return { modal: component, rolled };
  }

  const settle = () => vi.advanceTimersByTime(1000);

  it('acerto automático já abre no dano e rola todos os dardos de uma vez', () => {
    const { modal, rolled } = create({
      mode: 'ability',
      rollType: 'attack',
      label: 'Magia: Mísseis Mágicos',
      modifier: 0,
      autoHit: true,
      damage: {
        diceCount: 3,
        diceSides: 4,
        modifier: 3,
        label: 'Dano: Mísseis Mágicos — 3 dardos',
      },
    });
    expect(modal.isAbility).toBe(false);
    expect(modal.title).toBe('Dano: Mísseis Mágicos — 3 dardos');
    expect(modal.diceCount).toBe(3);
    modal.roll();
    settle();
    expect(modal.result()!.rolls).toHaveLength(3);
    expect(rolled).toHaveBeenCalledTimes(1);
  });

  it('vários raios: um ataque e um dano por raio, título mostra o progresso', () => {
    const { modal, rolled } = create(rays);
    expect(modal.title).toBe('Magia: Raio Ardente (raio 1 de 3)');

    modal.roll();
    settle();
    modal.rollDamageNow();
    settle();
    expect(modal.isOfferingNextInstance).toBe(true);
    expect(modal.nextInstanceLabel).toBe('raio 2 de 3');
    expect(rolled).not.toHaveBeenCalled();

    modal.nextInstance();
    expect(modal.title).toBe('Magia: Raio Ardente (raio 2 de 3)');
    expect(modal.isAbility).toBe(true);
    expect(modal.result()).toBeNull();

    // raio 2 erra → oferece o 3º
    modal.roll();
    settle();
    modal.confirmMiss();
    expect(modal.isOfferingNextInstance).toBe(true);
    expect(rolled).not.toHaveBeenCalled();

    // raio 3 acerta → acabou
    modal.nextInstance();
    modal.roll();
    settle();
    modal.rollDamageNow();
    settle();
    expect(modal.isOfferingNextInstance).toBe(false);
    expect(rolled).toHaveBeenCalledTimes(1);
  });

  it('dá pra encerrar antes de usar todos os raios', () => {
    const { modal, rolled } = create(rays);
    modal.roll();
    settle();
    modal.confirmMiss();
    modal.finishInstances();
    expect(rolled).toHaveBeenCalledTimes(1);
  });

  it('um ataque só não mostra progresso', () => {
    const { modal } = create({ ...rays, instances: undefined });
    expect(modal.title).toBe('Magia: Raio Ardente');
  });
});
