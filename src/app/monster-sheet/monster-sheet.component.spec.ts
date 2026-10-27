import { TestBed } from '@angular/core/testing';
import { MonsterSheetComponent } from './monster-sheet.component';
import { MonsterStatBlock } from '../models/monster-catalog.interface';
import { monsterToCard } from '../game-card/monster-card';

/** Texto de cada filho (rótulo e valor) separado por espaço. */
const parts = (el: Element) =>
  Array.from(el.children)
    .map((c) => c.textContent?.replace(/\s+/g, ' ').trim())
    .join(' ');

const BLOCK: MonsterStatBlock = {
  index: 'goblin',
  name: 'Goblin',
  size: 'Pequeno',
  type: 'humanoide',
  alignment: 'neutro e mau',
  armor_class: [{ type: 'armadura', value: 15 }],
  hit_points: 7,
  hit_dice: '2d6',
  speed: { terrestre: '9 m' },
  strength: 8,
  dexterity: 14,
  constitution: 10,
  intelligence: 10,
  wisdom: 8,
  charisma: 8,
  challenge_rating: 0.25,
  xp: 50,
  actions: [
    {
      name: 'Cimitarra',
      desc: 'Acerto: 5 (1d6 + 2) de dano cortante.',
      usage: null,
      attack: { kind: 'melee_weapon', bonus: 4, reach_m: 1.5, range_m: null, target: 'um alvo' },
      damage: [{ dice: '1d6+2', average: 5, type: 'cortante' }],
      dc: null,
      multiattack: null,
    },
  ],
};

describe('MonsterSheetComponent (ficha fora da mesa)', () => {
  function render() {
    const fixture = TestBed.createComponent(MonsterSheetComponent);
    fixture.componentRef.setInput('block', BLOCK);
    fixture.componentRef.setInput('card', monsterToCard({ name: 'Goblin', imageUrl: null }));
    fixture.componentRef.setInput('hp', 9);
    fixture.componentRef.setInput('ac', 15);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('números em destaque com o PV e a CA recebidos, e o ND com XP', () => {
    const { el } = render();
    const stats = Array.from(el.querySelectorAll('.pa-stat')).map(parts);
    expect(stats).toEqual(['PV 9', 'CA 15', 'ND 1/4 50 XP', 'DADOS DE VIDA 2d6']);
  });

  it('atributos com modificador e ações em cartas, sem botão de rolar', () => {
    const { el } = render();
    const abilities = Array.from(el.querySelectorAll('.pa-action-row')).map(parts);
    expect(abilities).toEqual([
      'FOR 8 -1',
      'DES 14 +2',
      'CON 10 +0',
      'INT 10 +0',
      'SAB 8 -1',
      'CAR 8 -1',
    ]);
    expect(el.querySelector('app-card-deck')).not.toBeNull();
    expect(el.querySelector('.ma-roll')).toBeNull();
    expect(el.querySelector('.ma-chips button')).toBeNull();
  });
});
