import { MonsterStatBlockComponent } from './monster-stat-block.component';
import { MonsterStatBlock } from '../models/monster-catalog.interface';

const STAT_BLOCK: MonsterStatBlock = {
  index: 'aarakocra',
  name: 'Aarakocra',
  size: 'Médio',
  type: 'humanoide',
  alignment: 'neutro e bom',
  armor_class: [{ type: 'natural', value: 12 }],
  hit_points: 13,
  hit_dice: '3d8',
  speed: { terrestre: '6 m', voo: '15 m' },
  strength: 10,
  dexterity: 14,
  constitution: 10,
  intelligence: 11,
  wisdom: 11,
  charisma: 11,
  challenge_rating: 0.25,
  xp: 50,
};

describe('MonsterStatBlockComponent', () => {
  function setup(overrides: Partial<MonsterStatBlockComponent> = {}) {
    const component = new MonsterStatBlockComponent();
    component.detail = STAT_BLOCK;
    Object.assign(component, overrides);
    return component;
  }

  it('usa o nome e os PV da ficha crua quando não há override', () => {
    const component = setup();
    expect(component.displayName).toBe('Aarakocra');
    expect(component.hp).toBe(13);
  });

  it('nome e PV customizados (monstro já catalogado) sobrescrevem a ficha crua', () => {
    const component = setup({ nameOverride: 'Pena Rubra', hpOverride: 20 });
    expect(component.displayName).toBe('Pena Rubra');
    expect(component.hp).toBe(20);
  });

  it('lê a CA do primeiro item de armor_class', () => {
    const component = setup();
    expect(component.acValue()).toBe(12);
  });

  it('formata o deslocamento e o nível de desafio como no livro', () => {
    const component = setup();
    expect(component.speed).toBe('terrestre: 6 m, voo: 15 m');
    expect(component.crText(component.detail.challenge_rating)).toBe('1/4');
  });

  it('ND 5+ marca o nome como ameaça (destaque dourado); abaixo disso não', () => {
    expect(setup().isThreat).toBe(false);
    expect(setup({ detail: { ...STAT_BLOCK, challenge_rating: 17 } }).isThreat).toBe(true);
  });
});
