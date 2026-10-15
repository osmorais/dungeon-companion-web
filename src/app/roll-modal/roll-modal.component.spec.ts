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
