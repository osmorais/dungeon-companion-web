import { spellEffectFor } from './spell-effect';

describe('spellEffectFor', () => {
  it('cura e PV temporários', () => {
    expect(spellEffectFor('heal', 'Cura: Curar Ferimentos')).toEqual({
      kind: 'heal',
      tempHp: false,
    });
    expect(spellEffectFor('heal', 'PV temporários: Vitalidade Falsa')).toEqual({
      kind: 'heal',
      tempHp: true,
    });
  });

  it.each([
    ['Dano: Raio de Fogo (fogo)', 'fire'],
    ['Dano: Raio de Gelo (frio)', 'cold'],
    ['Dano: Relâmpago (elétrico)', 'lightning'],
    ['Dano: Onda Troveante (trovejante)', 'thunder'],
    ['Dano: Espirro Ácido (ácido)', 'acid'],
    ['Dano: Rajada de Veneno (veneno)', 'poison'],
    ['Dano: Toque Arrepiante (necrótico)', 'necrotic'],
    ['Dano: Raio Guiador (radiante)', 'radiant'],
    ['Dano: Zombaria Viciosa (psíquico)', 'psychic'],
    ['Dano: Rajada Mística (energia)', 'force'],
    ['Dano: Chicote de Espinhos (perfurante)', 'arcane'],
    ['Dano: Orbe Cromática (à escolha)', 'arcane'],
  ])('%s → %s', (label, element) => {
    expect(spellEffectFor('damage', label)).toEqual({ kind: 'spell', element });
  });

  it('vários tipos: vale o primeiro citado', () => {
    expect(spellEffectFor('damage', 'Dano: Coluna de Chamas (fogo + radiante)')).toEqual({
      kind: 'spell',
      element: 'fire',
    });
    expect(spellEffectFor('damage', 'Dano: Espíritos Guardiões (radiante ou necrótico)')).toEqual({
      kind: 'spell',
      element: 'radiant',
    });
  });

  it('crítico e raios no rótulo não atrapalham', () => {
    expect(spellEffectFor('damage', 'Dano: Raio Ardente (fogo) — CRÍTICO (raio 2 de 3)')).toEqual({
      kind: 'spell',
      element: 'fire',
    });
  });

  it('dano de arma (sem tipo no rótulo) e outras rolagens ficam sem efeito de magia', () => {
    expect(spellEffectFor('damage', 'Dano: Espada Longa')).toBeNull();
    expect(spellEffectFor('damage', 'Dano: Espada Longa + Destruição Colérica')).toBeNull();
    expect(spellEffectFor('damage', undefined)).toBeNull();
    expect(spellEffectFor('attack', 'Magia: Raio de Fogo')).toBeNull();
    expect(spellEffectFor(undefined, undefined)).toBeNull();
  });
});
