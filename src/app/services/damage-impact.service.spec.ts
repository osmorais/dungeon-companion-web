import { TestBed } from '@angular/core/testing';
import {
  DAMAGE_IMPACT_MS,
  HEAL_IMPACT_MS,
  DamageImpactService,
  SCREEN_EFFECTS_STORAGE_KEY,
  damageIntensity,
} from './damage-impact.service';

describe('damageIntensity', () => {
  it('até 40% do máximo = 1 golpe, acima = 2, a partir de 80% = 3', () => {
    // 2d6 + 3: máximo 15
    expect(damageIntensity('2d6', 3, 5)).toBe(1); // 33%
    expect(damageIntensity('2d6', 3, 6)).toBe(1); // 40%
    expect(damageIntensity('2d6', 3, 7)).toBe(2); // 47%
    expect(damageIntensity('2d6', 3, 11)).toBe(2); // 73%
    expect(damageIntensity('2d6', 3, 12)).toBe(3); // 80%
    expect(damageIntensity('2d6', 3, 15)).toBe(3); // máximo
  });

  it('soma vários grupos de dados (arma + Destruição Divina)', () => {
    // 1d8 + 2d8 + 2: máximo 26
    expect(damageIntensity('1d8 + 2d8', 2, 26)).toBe(3);
    expect(damageIntensity('1d8 + 2d8', 2, 5)).toBe(1);
  });

  it('modificador negativo reduz o máximo', () => {
    // 1d4 - 1: máximo 3
    expect(damageIntensity('1d4', -1, 3)).toBe(3);
    expect(damageIntensity('1d4', -1, 1)).toBe(1);
  });

  it('notação ilegível ou máximo não positivo cai no golpe médio', () => {
    expect(damageIntensity('', 0, 5)).toBe(2);
    expect(damageIntensity('???', 0, 5)).toBe(2);
    expect(damageIntensity('1d4', -10, 0)).toBe(2);
  });
});

describe('DamageImpactService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  const service = () => TestBed.inject(DamageImpactService);

  it('dispara com total, intensidade e chave nova a cada golpe', () => {
    const s = service();
    s.trigger({ dice_notation: '1d8', modifier: 0, total: 8 });
    expect(s.current()).toEqual({ key: 1, total: 8, intensity: 3, effect: null });
    s.trigger({ dice_notation: '1d8', modifier: 0, total: 2 });
    expect(s.current()).toEqual({ key: 2, total: 2, intensity: 1, effect: null });
  });

  it('magia e cura levam o efeito; a cura dura mais', () => {
    const s = service();
    s.trigger({
      dice_notation: '8d6',
      modifier: 0,
      total: 30,
      roll_type: 'damage',
      label: 'Dano: Bola de Fogo (fogo)',
    });
    expect(s.current()!.effect).toEqual({ kind: 'spell', element: 'fire' });

    s.trigger({
      dice_notation: '1d8',
      modifier: 3,
      total: 7,
      roll_type: 'heal',
      label: 'Cura: Curar Ferimentos',
    });
    expect(s.current()!.effect).toEqual({ kind: 'heal', tempHp: false });
    vi.advanceTimersByTime(DAMAGE_IMPACT_MS);
    expect(s.current()).not.toBeNull();
    vi.advanceTimersByTime(HEAL_IMPACT_MS - DAMAGE_IMPACT_MS);
    expect(s.current()).toBeNull();
  });

  it('some sozinho ao fim da animação', () => {
    const s = service();
    s.trigger({ dice_notation: '1d8', modifier: 0, total: 4 });
    vi.advanceTimersByTime(DAMAGE_IMPACT_MS - 1);
    expect(s.current()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(s.current()).toBeNull();
  });

  it('golpe novo durante a animação reinicia o tempo', () => {
    const s = service();
    s.trigger({ dice_notation: '1d8', modifier: 0, total: 4 });
    vi.advanceTimersByTime(DAMAGE_IMPACT_MS - 100);
    s.trigger({ dice_notation: '1d8', modifier: 0, total: 5 });
    vi.advanceTimersByTime(200);
    expect(s.current()?.total).toBe(5);
  });

  it('ligado por padrão; desligar para de disparar, limpa o atual e grava a preferência', () => {
    const s = service();
    expect(s.enabled()).toBe(true);
    s.trigger({ dice_notation: '1d8', modifier: 0, total: 4 });
    s.toggleEnabled();
    expect(s.enabled()).toBe(false);
    expect(s.current()).toBeNull();
    expect(localStorage.getItem(SCREEN_EFFECTS_STORAGE_KEY)).toBe('off');

    s.trigger({ dice_notation: '1d8', modifier: 0, total: 4 });
    expect(s.current()).toBeNull();

    s.toggleEnabled();
    expect(localStorage.getItem(SCREEN_EFFECTS_STORAGE_KEY)).toBe('on');
  });

  it('lê a preferência salva ao iniciar', () => {
    localStorage.setItem(SCREEN_EFFECTS_STORAGE_KEY, 'off');
    expect(service().enabled()).toBe(false);
  });

  it('sem acesso ao armazenamento, fica ligado e não quebra', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const s = service();
    expect(s.enabled()).toBe(true);
    expect(() => s.toggleEnabled()).not.toThrow();
    expect(s.enabled()).toBe(false);
    vi.restoreAllMocks();
  });
});
