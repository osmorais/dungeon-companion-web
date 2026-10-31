import { Spell } from '../models/character-options.interface';
import { schoolSlug, spellCardState, spellRangeLabel, spellToCard } from './spell-card';

const spell = (extra: Partial<Spell> = {}): Spell => ({
  id_spell: 1,
  name: 'Bola de Fogo',
  description: 'Uma explosão de chamas.',
  casting_time: '1 ação',
  range_distance: 45,
  duration: 'Instantânea',
  is_verbal: true,
  is_somatic: true,
  is_material: true,
  spellLevel: 3,
  school: 'Evocação',
  ...extra,
});

describe('schoolSlug', () => {
  it('tira acento e caixa: "Evocação" → evocacao, "ADIVINHAÇÃO" → adivinhacao', () => {
    expect(schoolSlug('Evocação')).toBe('evocacao');
    expect(schoolSlug('ADIVINHAÇÃO')).toBe('adivinhacao');
    expect(schoolSlug(' Ilusão ')).toBe('ilusao');
  });

  it('escola vazia ou desconhecida → null (carta usa o ícone de reserva)', () => {
    expect(schoolSlug(null)).toBeNull();
    expect(schoolSlug('')).toBeNull();
    expect(schoolSlug('Cronomancia')).toBeNull();
  });
});

describe('spellToCard', () => {
  it('monta medalhão, arte da escola, faixa e os 4 números', () => {
    const card = spellToCard(spell());
    expect(card.badge).toBe('3');
    expect(card.art).toBe('assets/cards/spell-school-evocacao.webp');
    expect(card.ribbon).toBe('EVOCAÇÃO · 3º CÍRCULO');
    expect(card.stats).toEqual([
      { label: 'TEMPO', value: '1 ação' },
      { label: 'ALCANCE', value: '45 m' },
      { label: 'DURAÇÃO', value: 'Instantânea' },
      { label: 'COMP.', value: 'V, S, M' },
    ]);
    expect(card.text).toBe('Uma explosão de chamas.');
  });

  it('truque: medalhão T e faixa TRUQUE; sem alcance/componentes vira "—"', () => {
    const card = spellToCard(
      spell({
        spellLevel: 0,
        range_distance: null,
        is_verbal: false,
        is_somatic: false,
        is_material: false,
      }),
    );
    expect(card.badge).toBe('T');
    expect(card.ribbon).toBe('EVOCAÇÃO · TRUQUE');
    expect(card.stats[1].value).toBe('—');
    expect(card.stats[3].value).toBe('—');
  });

  it('sem escola: arte nula (ícone de reserva) e faixa MAGIA', () => {
    const card = spellToCard(spell({ school: null }));
    expect(card.art).toBeNull();
    expect(card.fallbackIcon).toBe('assets/icons/spellbook.png');
    expect(card.ribbon).toBe('MAGIA · 3º CÍRCULO');
  });

  it('etiqueta PREPARADA só em magia de círculo preparada', () => {
    expect(spellToCard(spell({ is_prepared: true })).tags).toEqual(['PREPARADA']);
    expect(spellToCard(spell({ is_prepared: false })).tags).toEqual([]);
    expect(spellToCard(spell({ spellLevel: 0, is_prepared: true })).tags).toEqual([]);
  });
});

describe('spellCardState', () => {
  it('pronta: truque, preparada ou de quem não prepara', () => {
    expect(spellCardState(spell({ spellLevel: 0 }), true, false, true)).toBe('ready');
    expect(spellCardState(spell({ is_prepared: true }), true, false, true)).toBe('ready');
    expect(spellCardState(spell(), false, false, true)).toBe('ready');
  });

  it('não preparada: dá pra preparar com vaga fora de combate; senão bloqueada', () => {
    expect(spellCardState(spell(), true, true, false)).toBe('preparable');
    expect(spellCardState(spell(), true, false, false)).toBe('locked');
    expect(spellCardState(spell(), true, true, true)).toBe('locked');
  });
});

describe('spellRangeLabel', () => {
  it('0 é pessoal, 1 é toque, o resto em metros, sem alcance vira traço', () => {
    expect(spellRangeLabel(0)).toBe('Pessoal');
    expect(spellRangeLabel(1)).toBe('Toque');
    expect(spellRangeLabel(2)).toBe('2 m');
    expect(spellRangeLabel(36)).toBe('36 m');
    expect(spellRangeLabel(null)).toBe('—');
  });
});
