import { WeaponRow } from '../models/character-options.interface';
import {
  damageBackground,
  isSimpleWeapon,
  unarmedCardInfo,
  unarmedToCard,
  weaponCardInfo,
  weaponInfoToCard,
  weaponToCard,
} from './weapon-card';

const weapon = (extra: Partial<WeaponRow> = {}): WeaponRow => ({
  id_weapon: 20,
  attack_bonus: 5,
  damage_modifier: 3,
  name: 'Espada Longa',
  damage_die: '1d8',
  damage_type: 'cortante',
  properties: 'Versátil (1d10)',
  weight: 1.5,
  price_value: 15,
  isRanged: false,
  ...extra,
});

describe('isSimpleWeapon', () => {
  it('as 14 simples do livro, sem ligar pra acento/caixa; o resto é marcial', () => {
    expect(isSimpleWeapon('Adaga')).toBe(true);
    expect(isSimpleWeapon('bordao')).toBe(true);
    expect(isSimpleWeapon('Besta Leve')).toBe(true);
    expect(isSimpleWeapon('Espada Longa')).toBe(false);
    expect(isSimpleWeapon('Besta de Mão')).toBe(false);
  });
});

describe('weaponToCard', () => {
  it('medalhão = bônus de ataque; arte pelo id; faixa categoria · alcance; dano com o modificador', () => {
    const card = weaponToCard(weapon());
    expect(card.badge).toBe('+5');
    expect(card.art).toBe('assets/cards/weapon-20.webp');
    expect(card.artFit).toBe('contain');
    expect(card.ribbon).toBe('MARCIAL · CORPO A CORPO');
    expect(card.stats).toEqual([
      { label: 'DANO', value: '1d8+3' },
      { label: 'TIPO', value: 'Cortante' },
      { label: 'PROPRIEDADES', value: 'Versátil (1d10)' },
      { label: 'PESO', value: '1.5 kg' },
    ]);
    expect(card.artBackground).toBe(damageBackground('cortante'));
  });

  it('arma simples à distância; arma fora do catálogo usa o ícone (arco)', () => {
    const bow = weaponToCard(
      weapon({
        id_weapon: 99,
        name: 'Arco Curto',
        isRanged: true,
        damage_modifier: 0,
        properties: null,
      }),
    );
    expect(bow.ribbon).toBe('SIMPLES · DISTÂNCIA');
    expect(bow.art).toBeNull();
    expect(bow.fallbackIcon).toBe('assets/icons/bow.png');
    expect(bow.stats[0].value).toBe('1d8');
    expect(bow.stats[2].value).toBe('—');
  });

  it('cor da arte por tipo de dano (concussão com acento); tipo desconhecido usa a neutra', () => {
    expect(damageBackground('Concussão')).toBe(damageBackground('concussao'));
    expect(damageBackground('perfurante')).not.toBe(damageBackground('cortante'));
    expect(damageBackground(null)).toBe(damageBackground('ácido'));
  });
});

describe('unarmedToCard', () => {
  it('ataque desarmado com o dado de Artes Marciais', () => {
    const card = unarmedToCard({
      name: 'Ataque Desarmado',
      attack_bonus: 6,
      dice: { count: 1, sides: 6 },
      damage_modifier: 4,
    });
    expect(card.badge).toBe('+6');
    expect(card.art).toBe('assets/cards/weapon-unarmed.webp');
    expect(card.stats[0].value).toBe('1d6+4');
  });
});

describe('carta da arma no aviso de ataque', () => {
  it('ida e volta: arma da ficha → dados do evento → mesma carta na mesa', () => {
    const sword = weapon();
    expect(weaponInfoToCard(weaponCardInfo(sword))).toEqual(weaponToCard(sword));
  });

  it('desarmado vai com id null e volta como a carta do punho', () => {
    const unarmed = {
      name: 'Ataque Desarmado',
      attack_bonus: 6,
      dice: { count: 1, sides: 6 },
      damage_modifier: 4,
    };
    const info = unarmedCardInfo(unarmed);
    expect(info.id_weapon).toBeNull();
    expect(weaponInfoToCard(info)).toEqual(unarmedToCard(unarmed));
  });
});
