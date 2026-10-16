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

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function create(sessionId: string | undefined, config: AbilityRollConfig = attack) {
    const component = TestBed.runInInjectionContext(() => new RollModalComponent());
    component.config = config;
    component.sessionId = sessionId;
    return component;
  }

  /** Espera a animação dos dados (10 ticks de 80 ms). */
  const settle = () => vi.advanceTimersByTime(1000);

  it('dano manda o tipo e o rótulo (o efeito de magia sai do rótulo)', () => {
    const modal = create('gs');
    modal.roll();
    settle();
    modal.rollDamageNow();
    settle();
    expect(trigger.mock.calls[0][0]).toMatchObject({
      roll_type: 'damage',
      label: 'Dano: Espada Longa',
    });
  });

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
    // d20 fixo em 11: sem crítico (no 20 natural os dados dobrariam)
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
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

  it('resistência: abre no dano, mostra a CD e o dano de quem passa', () => {
    const { modal, rolled } = create({
      mode: 'ability',
      rollType: 'attack',
      label: 'Magia: Tempestade de Gelo',
      modifier: 0,
      autoHit: true,
      save: { note: 'CD 15 de Destreza', onSuccess: 'half' },
      damage: {
        diceCount: 2,
        diceSides: 8,
        modifier: 0,
        label: 'Dano: Tempestade de Gelo',
        extraDice: [{ count: 4, sides: 6 }],
      },
    });
    expect(modal.saveLine).toBe('CD 15 de Destreza — metade do dano se passar');
    expect(modal.diceCount).toBe(6); // 2d8 + 4d6
    expect(modal.saveSuccessTotal).toBeNull();
    modal.roll();
    settle();
    expect(modal.saveSuccessTotal).toBe(Math.floor(modal.result()!.total / 2));
    expect(rolled).toHaveBeenCalledTimes(1);
  });

  it('resistência sem metade: não mostra o dano de quem passa', () => {
    const { modal } = create({
      mode: 'ability',
      rollType: 'attack',
      label: 'Magia: Chama Sagrada',
      modifier: 0,
      autoHit: true,
      save: { note: 'CD 13 de Destreza', onSuccess: 'none' },
      damage: { diceCount: 1, diceSides: 8, modifier: 0, label: 'Dano: Chama Sagrada' },
    });
    expect(modal.saveLine).toBe('CD 13 de Destreza — sem dano se passar');
    modal.roll();
    settle();
    expect(modal.saveSuccessTotal).toBeNull();
  });

  it('ataque comum não tem linha de resistência', () => {
    expect(create(rays).modal.saveLine).toBeNull();
  });

  it('um ataque só não mostra progresso', () => {
    const { modal } = create({ ...rays, instances: undefined });
    expect(modal.title).toBe('Magia: Raio Ardente');
  });
});

/** Magias de cura: rolagem registrada como `heal`, sem impacto de dano; Cura Suprema usa o máximo. */
describe('RollModalComponent — cura', () => {
  let postRoll: ReturnType<typeof vi.fn>;
  let trigger: ReturnType<typeof vi.fn>;

  const cure: AbilityRollConfig = {
    mode: 'ability',
    rollType: 'attack',
    label: 'Magia: Curar Ferimentos',
    modifier: 0,
    autoHit: true,
    healing: { tempHp: false },
    damage: { diceCount: 2, diceSides: 8, modifier: 3, label: 'Cura: Curar Ferimentos' },
  };

  beforeEach(() => {
    vi.useFakeTimers();
    postRoll = vi.fn(() => of({}));
    trigger = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: GameSessionService, useValue: { postRoll } },
        { provide: DamageImpactService, useValue: { trigger } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  function create(config: AbilityRollConfig) {
    const component = TestBed.runInInjectionContext(() => new RollModalComponent());
    component.config = config;
    component.sessionId = 'gs';
    component.ngOnInit();
    return component;
  }

  const settle = () => vi.advanceTimersByTime(1000);

  it('abre na cura, registra como heal e dispara a névoa de cura (não o golpe)', () => {
    const modal = create(cure);
    expect(modal.title).toBe('Cura: Curar Ferimentos');
    modal.roll();
    settle();
    expect(postRoll).toHaveBeenCalledTimes(1);
    expect(postRoll.mock.calls[0][1]).toMatchObject({
      roll_type: 'heal',
      dice_notation: '2d8',
      modifier: 3,
    });
    expect(trigger).toHaveBeenCalledTimes(1);
    expect(trigger.mock.calls[0][0]).toMatchObject({
      roll_type: 'heal',
      label: 'Cura: Curar Ferimentos',
    });
  });

  it('Cura Suprema: todos os dados no valor máximo', () => {
    const modal = create({ ...cure, damage: { ...cure.damage!, maximize: true } });
    modal.roll();
    settle();
    expect(modal.result()!.rolls).toEqual([8, 8]);
    expect(modal.result()!.total).toBe(19);
  });
});

describe('RollModalComponent — fase 4', () => {
  const sword: AbilityRollConfig = {
    mode: 'ability',
    rollType: 'attack',
    label: 'Ataque: Espada Longa',
    modifier: 5,
    damage: { diceCount: 1, diceSides: 8, modifier: 3, label: 'Dano: Espada Longa' },
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

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function create(
    config: AbilityRollConfig,
    applyTargets: RollModalComponent['applyTargets'] = [],
  ) {
    const component = TestBed.runInInjectionContext(() => new RollModalComponent());
    component.config = config;
    component.sessionId = 'gs';
    component.applyTargets = applyTargets;
    component.ngOnInit();
    const rolled = vi.fn();
    const applied = vi.fn();
    const riderUsed = vi.fn();
    component.rolled.subscribe(rolled);
    component.applyToTarget.subscribe(applied);
    component.riderSpellUsed.subscribe(riderUsed);
    return { modal: component, rolled, applied, riderUsed };
  }

  const settle = () => vi.advanceTimersByTime(1000);

  describe('crítico', () => {
    it('20 natural: acerto crítico e os dados de dano dobram (o modificador não)', () => {
      const random = vi.spyOn(Math, 'random').mockReturnValue(0.999);
      const { modal } = create(sword);
      modal.roll();
      settle();
      expect(modal.isCritical()).toBe(true);
      modal.rollDamageNow();
      expect(modal.diceCount).toBe(2);
      settle();
      expect(modal.result()!.total).toBe(8 + 8 + 3);
      expect(modal.title).toBe('Dano: Espada Longa — CRÍTICO');
      random.mockRestore();
    });

    it('sem 20 natural: dano normal', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const { modal } = create(sword);
      modal.roll();
      settle();
      expect(modal.isCritical()).toBe(false);
      modal.rollDamageNow();
      expect(modal.diceCount).toBe(1);
    });
  });

  describe('magias que somam dano', () => {
    const riders = {
      oneShot: [
        {
          key: '119:1',
          spellName: 'Destruição Colérica',
          slotKey: 'level_1',
          levelLabel: '1º círculo',
          dice: { count: 1, sides: 6 },
          damageType: 'psíquico',
          saveNote: 'CD 13 de Sabedoria',
          save: { save_dc: 13, save_ability: 'WIS' as const },
        },
      ],
      persistent: [
        {
          key: '213',
          spellName: 'Marca do Caçador',
          dice: { count: 1, sides: 6 },
          damageType: 'da arma',
        },
      ],
    };
    const withRiders: AbilityRollConfig = { ...sword, damage: { ...sword.damage!, riders } };

    // d20 fixo em 11: sem crítico (no 20 natural os dados dobrariam)
    beforeEach(() => vi.spyOn(Math, 'random').mockReturnValue(0.5));

    it('pergunta antes do dano; Destruição gasta o espaço e soma os dados, contínua só soma', () => {
      const { modal, riderUsed } = create(withRiders);
      modal.roll();
      settle();
      modal.rollDamageNow();
      expect(modal.isChoosingSmite).toBe(true);
      expect(modal.title).toBe('Somar ao dano');

      modal.selectRider(riders.oneShot[0]);
      modal.toggleRider('213');
      modal.confirmSmiteChoice();
      expect(riderUsed).toHaveBeenCalledWith(riders.oneShot[0]);
      expect(modal.diceCount).toBe(3); // 1d8 + 1d6 + 1d6
      expect(modal.title).toBe('Dano: Espada Longa + Destruição Colérica + Marca do Caçador');
      settle();
      expect(modal.riderSaveLine).toBe('Destruição Colérica: CD 13 de Sabedoria');
    });

    it('não usar nada rola só a arma', () => {
      const { modal, riderUsed } = create(withRiders);
      modal.roll();
      settle();
      modal.rollDamageNow();
      modal.confirmSmiteChoice();
      expect(riderUsed).not.toHaveBeenCalled();
      expect(modal.diceCount).toBe(1);
    });

    it('vários raios: a Destruição vale só no primeiro, a contínua continua marcada', () => {
      const { modal } = create({ ...withRiders, instances: { count: 2, label: 'raio' } });
      modal.roll();
      settle();
      modal.rollDamageNow();
      modal.selectRider(riders.oneShot[0]);
      modal.toggleRider('213');
      modal.confirmSmiteChoice();
      settle();
      modal.nextInstance();
      expect(modal.selectedRider()).toBeNull();
      expect(modal.isToggleActive('213')).toBe(true);
    });
  });

  describe('aplicar no alvo (opcional)', () => {
    const targets = [
      { key: 'monster:m1', label: 'Goblin', allowsTempHp: false },
      { key: 'player:p1', label: 'Aragorn', allowsTempHp: true },
    ];
    const fireball: AbilityRollConfig = {
      mode: 'ability',
      rollType: 'attack',
      label: 'Magia: Bola de Fogo',
      modifier: 0,
      autoHit: true,
      save: { note: 'CD 14 de Destreza', onSuccess: 'half' },
      damage: { diceCount: 8, diceSides: 6, modifier: 0, label: 'Dano: Bola de Fogo' },
    };

    it('sem alvos: encerra sozinho como antes', () => {
      const { modal, rolled } = create(fireball);
      modal.roll();
      settle();
      expect(modal.canApply).toBe(false);
      expect(rolled).toHaveBeenCalledTimes(1);
    });

    it('com alvos: espera o CONCLUIR e aplica inteiro ou metade em vários alvos', () => {
      const { modal, rolled, applied } = create(fireball, targets);
      modal.roll();
      settle();
      expect(rolled).not.toHaveBeenCalled();
      expect(modal.awaitingApply()).toBe(true);
      expect(modal.canApply).toBe(true);
      expect(modal.applyKind).toBe('damage');

      const total = modal.result()!.total;
      modal.setApplyTarget({ target: { value: 'monster:m1' } } as unknown as Event);
      modal.apply();
      modal.setApplyTarget({ target: { value: 'player:p1' } } as unknown as Event);
      modal.apply(true);
      expect(applied.mock.calls.map(([req]) => req)).toEqual([
        { targetKey: 'monster:m1', amount: total, kind: 'damage' },
        { targetKey: 'player:p1', amount: Math.floor(total / 2), kind: 'damage' },
      ]);
      expect(modal.applied()).toHaveLength(2);

      modal.finishApply();
      expect(rolled).toHaveBeenCalledTimes(1);
    });

    it('sem alvo escolhido não aplica', () => {
      const { modal, applied } = create(fireball, targets);
      modal.roll();
      settle();
      modal.apply();
      expect(applied).not.toHaveBeenCalled();
    });

    it('PV temporários: só alvos que aceitam', () => {
      const { modal } = create(
        {
          mode: 'ability',
          rollType: 'attack',
          label: 'Magia: Vitalidade Falsa',
          modifier: 0,
          autoHit: true,
          healing: { tempHp: true },
          damage: {
            diceCount: 1,
            diceSides: 4,
            modifier: 4,
            label: 'PV temporários: Vitalidade Falsa',
          },
        },
        targets,
      );
      expect(modal.applyKind).toBe('temp_hp');
      expect(modal.applicableTargets.map((t) => t.key)).toEqual(['player:p1']);
    });

    it('ataque que errou não oferece aplicar', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      const { modal, rolled } = create(sword, targets);
      modal.roll();
      settle();
      expect(modal.canApply).toBe(false);
      modal.confirmMiss();
      expect(rolled).toHaveBeenCalledTimes(1);
    });
  });
});

describe('RollModalComponent — teste secreto', () => {
  let postRoll: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    postRoll = vi.fn(() => of({}));
    TestBed.configureTestingModule({
      providers: [
        { provide: GameSessionService, useValue: { postRoll } },
        { provide: DamageImpactService, useValue: { trigger: vi.fn() } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  it('manda o id do pedido junto (o backend grava oculta)', () => {
    const modal = TestBed.runInInjectionContext(() => new RollModalComponent());
    modal.config = {
      mode: 'ability',
      rollType: 'skill',
      label: 'Teste secreto: Percepção',
      modifier: 4,
    };
    modal.sessionId = 'gs';
    modal.secretRequestId = 'req-1';
    modal.roll();
    vi.advanceTimersByTime(1000);
    expect(postRoll.mock.calls[0][1]).toMatchObject({
      roll_type: 'skill',
      label: 'Teste secreto: Percepção',
      modifier: 4,
      secret_request_id: 'req-1',
    });
  });

  it('rolagem comum não manda o campo', () => {
    const modal = TestBed.runInInjectionContext(() => new RollModalComponent());
    modal.config = { mode: 'ability', rollType: 'skill', label: 'Percepção', modifier: 4 };
    modal.sessionId = 'gs';
    modal.roll();
    vi.advanceTimersByTime(1000);
    expect(postRoll.mock.calls[0][1]).not.toHaveProperty('secret_request_id');
  });
});

describe('RollModalComponent — habilidades (valor fixo e distribuir)', () => {
  let postRoll: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    postRoll = vi.fn(() => of({}));
    TestBed.configureTestingModule({
      providers: [
        { provide: GameSessionService, useValue: { postRoll } },
        { provide: DamageImpactService, useValue: { trigger: vi.fn() } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  const targets = [
    { key: 'player:p1', label: 'Ana', allowsTempHp: true },
    { key: 'player:p2', label: 'Bia', allowsTempHp: true },
  ];

  function create(config: AbilityRollConfig) {
    const modal = TestBed.runInInjectionContext(() => new RollModalComponent());
    modal.config = config;
    modal.sessionId = 'gs';
    modal.applyTargets = targets;
    const applied = vi.fn();
    modal.applyToTarget.subscribe(applied);
    modal.ngOnInit();
    return { modal, applied };
  }

  it('valor fixo: já mostra o total, sem rolar e sem ir pro log', () => {
    const { modal } = create({
      mode: 'ability',
      rollType: 'attack',
      label: 'Integridade Corporal',
      modifier: 0,
      autoHit: true,
      healing: { tempHp: false },
      damage: { diceCount: 0, diceSides: 0, modifier: 18, label: 'Cura: Integridade Corporal' },
    });
    expect(modal.result()!.total).toBe(18);
    expect(modal.canApply).toBe(true);
    expect(postRoll).not.toHaveBeenCalled();
  });

  it('distribuir (Preservar a Vida): cada alvo recebe uma parte até acabar', () => {
    const { modal, applied } = create({
      mode: 'ability',
      rollType: 'attack',
      label: 'Preservar a Vida',
      modifier: 0,
      autoHit: true,
      healing: { tempHp: false, distribute: true },
      damage: { diceCount: 0, diceSides: 0, modifier: 20, label: 'Cura: Preservar a Vida' },
    });
    expect(modal.isDistributing).toBe(true);
    modal.setApplyTarget({ target: { value: 'player:p1' } } as unknown as Event);
    modal.setDistributeAmount({ target: { value: '12' } } as unknown as Event);
    modal.apply();
    expect(modal.distributeRemaining).toBe(8);
    modal.setApplyTarget({ target: { value: 'player:p2' } } as unknown as Event);
    modal.setDistributeAmount({ target: { value: '50' } } as unknown as Event);
    modal.apply();
    expect(applied.mock.calls.map(([r]) => r.amount)).toEqual([12, 8]);
    expect(modal.distributeRemaining).toBe(0);
    modal.apply();
    expect(applied).toHaveBeenCalledTimes(2);
  });

  it('resistência com texto próprio (Palma Vibrante)', () => {
    const { modal } = create({
      mode: 'ability',
      rollType: 'attack',
      label: 'Palma Vibrante',
      modifier: 0,
      autoHit: true,
      save: {
        note: 'CD 15 de Constituição',
        onSuccess: 'full',
        effectNote: 'se falhar, cai a 0 PV; se passar, sofre o dano',
      },
      damage: { diceCount: 10, diceSides: 10, modifier: 0, label: 'Dano: Palma Vibrante' },
    });
    expect(modal.saveLine).toBe(
      'CD 15 de Constituição — se falhar, cai a 0 PV; se passar, sofre o dano',
    );
  });
});

describe('RollModalComponent — traços no ataque (fase 2)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        { provide: GameSessionService, useValue: { postRoll: vi.fn(() => of({})) } },
        { provide: DamageImpactService, useValue: { trigger: vi.fn() } },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const axe: AbilityRollConfig = {
    mode: 'ability',
    rollType: 'attack',
    label: 'Ataque: Machado Grande',
    modifier: 6,
    damage: { diceCount: 1, diceSides: 12, modifier: 4, label: 'Dano: Machado Grande' },
  };

  function create(config: AbilityRollConfig) {
    const modal = TestBed.runInInjectionContext(() => new RollModalComponent());
    modal.config = config;
    modal.sessionId = 'gs';
    modal.ngOnInit();
    const oncePerTurn = vi.fn();
    modal.oncePerTurnUsed.subscribe(oncePerTurn);
    return { modal, oncePerTurn };
  }

  const settle = () => vi.advanceTimersByTime(1000);
  /** d20 = floor(r*20)+1 → 0.9 dá 19. */
  const rollD20 = (random: number) => vi.spyOn(Math, 'random').mockReturnValue(random);

  it('Campeão: 19 natural é crítico com critMin 19, não com o padrão', () => {
    rollD20(0.9);
    const champion = create({ ...axe, critMin: 19 }).modal;
    champion.roll();
    settle();
    expect(champion.isCritical()).toBe(true);

    const normal = create(axe).modal;
    normal.roll();
    settle();
    expect(normal.isCritical()).toBe(false);
  });

  it('crítico corpo a corpo soma os dados extras da arma (Crítico Brutal)', () => {
    rollD20(0.999);
    const { modal } = create({ ...axe, damage: { ...axe.damage!, critExtraDice: 2 } });
    modal.roll();
    settle();
    modal.rollDamageNow();
    // 1d12 em dobro + 2d12 do Crítico Brutal
    expect(modal.diceCount).toBe(4);
  });

  it('ataque poderoso: −5 no ataque e +10 no dano, só antes de rolar', () => {
    rollD20(0.5);
    const { modal } = create({ ...axe, powerAttack: { name: 'Mestre em Armas Grandes' } });
    expect(modal.powerAttackName).toBe('Mestre em Armas Grandes');
    modal.togglePowerAttack();
    expect(modal.modifier).toBe(1);
    modal.roll();
    settle();
    modal.togglePowerAttack(); // já rolou: não desliga
    expect(modal.powerAttackOn()).toBe(true);
    modal.rollDamageNow();
    expect(modal.modifier).toBe(14);
    expect(modal.title).toBe('Dano: Machado Grande + Mestre em Armas Grandes');
  });

  it('somas com valor fixo e 1×/turno: soma no dano e avisa o pai; some no próximo golpe', () => {
    rollD20(0.5);
    const { modal, oncePerTurn } = create({
      ...axe,
      instances: { count: 2, label: 'golpe' },
      damage: {
        ...axe.damage!,
        riders: {
          oneShot: [],
          persistent: [
            {
              key: 'Matador de Inimigos',
              spellName: 'Matador de Inimigos',
              dice: null,
              flat: 3,
              damageType: 'da arma',
              oncePerTurn: true,
            },
            {
              key: 'Bruxaria',
              spellName: 'Bruxaria',
              dice: { count: 1, sides: 6 },
              damageType: 'necrótico',
            },
          ],
        },
      },
    });
    modal.roll();
    settle();
    modal.rollDamageNow();
    modal.toggleRider('Matador de Inimigos');
    modal.toggleRider('Bruxaria');
    modal.confirmSmiteChoice();
    expect(modal.modifier).toBe(4 + 3);
    expect(modal.diceCount).toBe(2);
    expect(oncePerTurn).toHaveBeenCalledWith(['Matador de Inimigos']);
    settle();
    modal.nextInstance();
    expect(modal.isToggleActive('Matador de Inimigos')).toBe(false);
    expect(modal.isToggleActive('Bruxaria')).toBe(true);
  });
});

describe('RollModalComponent — Sortudo (fase 3)', () => {
  let postRoll: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    postRoll = vi.fn(() => of({}));
    TestBed.configureTestingModule({
      providers: [
        { provide: GameSessionService, useValue: { postRoll } },
        { provide: DamageImpactService, useValue: { trigger: vi.fn() } },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const skill: AbilityRollConfig = {
    mode: 'ability',
    rollType: 'skill',
    label: 'Perícia: Furtividade',
    modifier: 5,
  };

  function create(config: AbilityRollConfig) {
    const modal = TestBed.runInInjectionContext(() => new RollModalComponent());
    modal.config = config;
    modal.sessionId = 'gs';
    modal.ngOnInit();
    const rolled = vi.fn();
    const luckUsed = vi.fn();
    modal.rolled.subscribe(rolled);
    modal.luckUsed.subscribe(luckUsed);
    return { modal, rolled, luckUsed };
  }

  const settle = () => vi.advanceTimersByTime(1000);

  it('Halfling: 1 natural oferece rolar de novo, vale o novo e vai pro log marcado', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0); // d20 = 1
    const { modal, rolled } = create({ ...skill, halflingLucky: true });
    modal.roll();
    settle();
    expect(modal.canHalflingReroll).toBe(true);
    expect(modal.awaitingLuck()).toBe(true);
    expect(rolled).not.toHaveBeenCalled();

    random.mockReturnValue(0.7); // d20 = 15
    modal.rerollHalfling();
    expect(modal.result()).toMatchObject({ rolls: [15], chosen: [15], total: 20 });
    expect(modal.canHalflingReroll).toBe(false);
    expect(postRoll.mock.calls[1][1]).toMatchObject({
      label: 'Perícia: Furtividade (Sortudo)',
      total: 20,
    });

    modal.finishLuck();
    expect(rolled).toHaveBeenCalledTimes(1);
  });

  it('Halfling sem 1 natural: encerra como antes', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const { modal, rolled } = create({ ...skill, halflingLucky: true });
    modal.roll();
    settle();
    expect(modal.canHalflingReroll).toBe(false);
    expect(rolled).toHaveBeenCalledTimes(1);
  });

  it('Ponto de Sorte: gasta, rola mais um d20 e fica com o melhor; uma vez por rolagem', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.2); // 5
    const { modal, luckUsed } = create({ ...skill, luckPoints: 2 });
    modal.roll();
    settle();
    expect(modal.canUseLuck).toBe(true);
    random.mockReturnValue(0.85); // 18
    modal.useLuck();
    expect(luckUsed).toHaveBeenCalledTimes(1);
    expect(modal.result()).toMatchObject({ rolls: [5, 18], chosen: [18], total: 23 });
    expect(modal.diceCount).toBe(2);
    expect(modal.canUseLuck).toBe(false);
  });

  it('ataque: Ponto de Sorte antes de decidir o acerto, e o crítico é recalculado', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.2);
    const { modal } = create({
      mode: 'ability',
      rollType: 'attack',
      label: 'Ataque: Arco',
      modifier: 5,
      luckPoints: 1,
      damage: { diceCount: 1, diceSides: 8, modifier: 3, label: 'Dano: Arco' },
    });
    modal.roll();
    settle();
    expect(modal.isAwaitingHitDecision).toBe(true);
    random.mockReturnValue(0.999); // 20
    modal.useLuck();
    expect(modal.isCritical()).toBe(true);
  });

  it('sem pontos e sem Halfling: nada a oferecer', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { modal, rolled } = create({ ...skill, luckPoints: 0 });
    modal.roll();
    settle();
    expect(modal.canUseLuck).toBe(false);
    expect(rolled).toHaveBeenCalledTimes(1);
  });
});
