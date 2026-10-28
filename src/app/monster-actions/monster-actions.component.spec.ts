import { TestBed } from '@angular/core/testing';
import { MonsterActionsComponent, MonsterRollRequest } from './monster-actions.component';
import { MonsterAbility, MonsterStatBlock } from '../models/monster-catalog.interface';
import { MonsterActionOp, MonsterActionState } from '../models/game-session.interface';

function block(actions: MonsterAbility[], extra: Partial<MonsterStatBlock> = {}): MonsterStatBlock {
  return {
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
    actions,
    ...extra,
  };
}

const ability = (a: Partial<MonsterAbility>): MonsterAbility => ({
  name: 'Ação',
  desc: '',
  usage: null,
  attack: null,
  damage: [],
  dc: null,
  multiattack: null,
  ...a,
});

const CIMITARRA = ability({
  name: 'Cimitarra',
  desc: 'Acerto: 5 (1d6 + 2) de dano cortante.',
  attack: { kind: 'melee_weapon', bonus: 4, reach_m: 1.5, range_m: null, target: 'um alvo' },
  damage: [{ dice: '1d6+2', average: 5, type: 'cortante' }],
});
const SOPRO = ability({
  name: 'Sopro',
  desc: 'CD 13 de Destreza, 4d6 de fogo.',
  usage: { type: 'recharge', min: 5 },
  damage: [{ dice: '4d6', average: 14, type: 'fogo' }],
  dc: { ability: 'DES', value: 13, success: 'metade' },
});

const state = (s: Partial<MonsterActionState> = {}): MonsterActionState => ({
  uses: {},
  recharge: [],
  legendary_used: 0,
  reaction_used: false,
  in_lair: false,
  ...s,
});

describe('MonsterActionsComponent', () => {
  function render(b: MonsterStatBlock, s: MonsterActionState | null = null) {
    const fixture = TestBed.createComponent(MonsterActionsComponent);
    fixture.componentRef.setInput('block', b);
    fixture.componentRef.setInput('state', s);
    const rolled: MonsterRollRequest[] = [];
    const ops: MonsterActionOp[] = [];
    fixture.componentInstance.roll.subscribe((r) => rolled.push(r));
    fixture.componentInstance.op.subscribe((o) => ops.push(o));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = () => Array.from(el.querySelectorAll<HTMLButtonElement>('button'));
    const byText = (text: string) => buttons().find((b) => b.textContent?.trim() === text)!;
    return { fixture, el, rolled, ops, byText };
  }

  it('bestiário: ATACAR manda a configuração do ataque, sem nada a gastar', () => {
    const { rolled, byText } = render(block([CIMITARRA]));
    byText('ATACAR').click();
    expect(rolled[0].config).toMatchObject({ rollType: 'attack', label: 'Cimitarra', modifier: 4 });
    expect(rolled[0].consume).toBeNull();
  });

  it('ação manda a carta pra tela de lançamento; os testes do monstro vão sem carta', () => {
    const { el, rolled, byText } = render(block([CIMITARRA, SOPRO]));
    byText('ATACAR').click();
    expect(rolled[0].card).toMatchObject({ name: 'Cimitarra', kind: 'attack' });
    byText('RESISTÊNCIA').click();
    expect(rolled[1].card?.kind).toBe('save');
    expect(rolled[1].castSave).toEqual({ dc: 13, ability: 'DEX' });
    el.querySelector<HTMLButtonElement>('.ma-chips .ma-chip')!.click();
    expect(rolled[2].card).toBeUndefined();
  });

  it('ação com recarga manda gastar o uso junto da rolagem', () => {
    const { rolled, byText } = render(block([SOPRO]));
    byText('RESISTÊNCIA').click();
    expect(rolled[0].consume).toEqual({ op: 'use', ability: 'Sopro' });
  });

  it('recarga gasta: RECARREGANDO, botão travado e ↺ devolve o uso', () => {
    const { el, ops, byText } = render(block([SOPRO]), state({ recharge: ['Sopro'] }));
    expect(el.textContent).toContain('RECARREGANDO');
    expect(byText('RESISTÊNCIA').disabled).toBe(true);
    el.querySelector<HTMLButtonElement>('.ma-restore')!.click();
    expect(ops).toEqual([{ op: 'restore', ability: 'Sopro' }]);
  });

  it('habilidade só de texto com uso por dia: USAR gasta; esgotada trava', () => {
    const resist = ability({
      name: 'Resistência Lendária',
      desc: 'Passa.',
      usage: { type: 'per_day', times: 3 },
    });
    const fresh = render(block([], { special_abilities: [resist] }));
    fresh.byText('USAR').click();
    expect(fresh.ops).toEqual([{ op: 'use', ability: 'Resistência Lendária' }]);
    const spent = render(
      block([], { special_abilities: [resist] }),
      state({ uses: { 'Resistência Lendária': 3 } }),
    );
    expect(spent.el.textContent).toContain('ESGOTADA');
    expect(spent.byText('USAR').disabled).toBe(true);
  });

  it('multiataque: rola os ataques em sequência, cada um com "k de N" na carta (1.15.1)', () => {
    const multi = ability({
      name: 'Ataques Múltiplos',
      multiattack: [{ action: 'Cimitarra', count: 2 }],
    });
    const { rolled, byText } = render(block([multi, CIMITARRA]));
    byText('MULTIATAQUE').click();
    expect(rolled).toHaveLength(1);
    expect(rolled[0].config).toMatchObject({ label: 'Cimitarra' });
    expect(rolled[0].card).toMatchObject({ name: 'Cimitarra', sequence: { index: 1, total: 2 } });
    expect(rolled[0].followUps).toHaveLength(1);
    expect(rolled[0].followUps![0].card?.sequence).toEqual({ index: 2, total: 2 });
  });

  it('multiataque sem ataque com botão na ficha fica travado', () => {
    const multi = ability({
      name: 'Ataques Múltiplos',
      multiattack: [{ action: 'Olhar', count: 1 }],
    });
    const { byText } = render(block([multi, CIMITARRA]));
    expect(byText('MULTIATAQUE').disabled).toBe(true);
  });

  it('lendárias: mostra quantas restam e trava o que custa mais que o resto', () => {
    const asa = ability({ ...CIMITARRA, name: 'Asa', usage: { type: 'cost', actions: 2 } });
    const { el, byText } = render(
      block([CIMITARRA], { legendary_count: 3, legendary_actions: [asa] }),
      state({ legendary_used: 2 }),
    );
    expect(el.textContent).toContain('AÇÕES LENDÁRIAS — RESTAM 1 DE 3 NA RODADA');
    const asaButton = Array.from(el.querySelectorAll<HTMLButtonElement>('.ma-roll')).at(-1)!;
    expect(asaButton.disabled).toBe(true);
    expect(byText('ATACAR').disabled).toBe(false);
  });

  it('descanso restaura todos os usos', () => {
    const { ops, byText } = render(block([SOPRO]));
    byText('DESCANSO: RESTAURAR USOS').click();
    expect(ops).toEqual([{ op: 'rest' }]);
  });

  it('mostra o d6 de recarga do início do turno', () => {
    const fixture = TestBed.createComponent(MonsterActionsComponent);
    fixture.componentRef.setInput('block', block([SOPRO]));
    fixture.componentRef.setInput('rechargeRolls', [
      { ability: 'Sopro', roll: 6, min: 5, recharged: true },
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sopro: d6 = 6 (precisa 5+) — RECARREGOU');
  });

  it('testes: resistências e atributos clicáveis', () => {
    const { el, rolled } = render(
      block([CIMITARRA], { saving_throws: [{ ability: 'DES', bonus: 6 }] }),
    );
    const chips = Array.from(el.querySelectorAll<HTMLButtonElement>('.ma-chips .ma-chip'));
    expect(chips[1].textContent?.trim()).toBe('Destreza +6');
    chips[1].click();
    expect(rolled[0]).toEqual({
      config: expect.objectContaining({ rollType: 'save', modifier: 6 }),
      consume: null,
    });
  });

  it('defesas e sentidos: só as linhas que a ficha tem', () => {
    const { el } = render(
      block([CIMITARRA], {
        damage_resistances: ['frio', 'fogo'],
        damage_immunities: [],
        condition_immunities: ['envenenado'],
        senses: 'visão no escuro 18 m, Percepção passiva 9',
        languages: '',
      }),
    );
    const text = el.textContent ?? '';
    expect(text).toContain('RESISTENTE A: frio, fogo');
    expect(text).toContain('IMUNE ÀS CONDIÇÕES: envenenado');
    expect(text).toContain('SENTIDOS: visão no escuro 18 m');
    expect(text).not.toContain('IMUNE A:');
    expect(text).not.toContain('IDIOMAS');
  });

  it('covil: só com ações de covil na ficha; NO COVIL liga e SAIU DO COVIL desliga', () => {
    expect(render(block([CIMITARRA])).el.textContent).not.toContain('AÇÕES DE COVIL');
    const lair = { lair_actions: 'Na contagem 20, o dragão faz uma ação de covil.' };
    const out = render(block([CIMITARRA], lair));
    expect(out.el.textContent).toContain('FORA DO COVIL');
    out.byText('NO COVIL').click();
    expect(out.ops).toEqual([{ op: 'lair', on: true }]);
    const inside = render(block([CIMITARRA], lair), state({ in_lair: true }));
    inside.byText('SAIU DO COVIL').click();
    expect(inside.ops).toEqual([{ op: 'lair', on: false }]);
  });

  it('part: a gaveta desenha só as ações, só os testes ou só as defesas', () => {
    const b = block([CIMITARRA], { senses: 'visão no escuro 18 m' });
    const only = (part: 'actions' | 'checks' | 'traits') => {
      const fixture = TestBed.createComponent(MonsterActionsComponent);
      fixture.componentRef.setInput('block', b);
      fixture.componentRef.setInput('part', part);
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).textContent ?? '';
    };
    expect(only('actions')).toContain('ATACAR');
    expect(only('actions')).not.toContain('RESISTÊNCIAS');
    expect(only('checks')).toContain('RESISTÊNCIAS');
    expect(only('checks')).not.toContain('ATACAR');
    expect(only('traits')).toContain('SENTIDOS');
    expect(only('traits')).not.toContain('ATACAR');
  });

  describe('cartas de ação (gaveta, 1.13.3)', () => {
    function renderCards(b: MonsterStatBlock, st: MonsterActionState | null = null) {
      const fixture = TestBed.createComponent(MonsterActionsComponent);
      fixture.componentRef.setInput('block', b);
      fixture.componentRef.setInput('state', st);
      fixture.componentRef.setInput('part', 'actions');
      fixture.componentRef.setInput('asCards', true);
      fixture.componentRef.setInput('imageUrl', 'g.png');
      const rolled: MonsterRollRequest[] = [];
      const ops: MonsterActionOp[] = [];
      fixture.componentInstance.roll.subscribe((r) => rolled.push(r));
      fixture.componentInstance.op.subscribe((o) => ops.push(o));
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const openHand = () => {
        el.querySelector<HTMLButtonElement>('app-card-deck .deck')!.click();
        fixture.detectChanges();
      };
      return { fixture, el, rolled, ops, openHand, comp: fixture.componentInstance };
    }

    it('ações que rolam vão pro baralho; multiataque e texto ficam na lista', () => {
      const multi = ability({
        name: 'Ataques Múltiplos',
        multiattack: [{ action: 'Cimitarra', count: 2 }],
      });
      const { el, comp } = renderCards(block([multi, CIMITARRA, SOPRO]));
      expect(el.querySelector('app-card-deck')?.textContent).toContain('AÇÕES · 2');
      expect(comp.hand().map((h) => h.card.title)).toEqual(['Cimitarra', 'Sopro']);
      expect(comp.hand()[0].card).toMatchObject({ art: 'g.png', text: CIMITARRA.desc });
      expect(el.textContent).toContain('Ataques Múltiplos');
      expect(el.querySelector('.ma-item .ma-roll')?.textContent).toContain('MULTIATAQUE');
    });

    it('na mão, o botão da carta da vez rola a ação com o que gastar', () => {
      const { el, rolled, openHand } = renderCards(block([SOPRO]));
      openHand();
      const btn = el.querySelector<HTMLButtonElement>('.ma-hand-btn')!;
      expect(btn.textContent?.trim()).toBe('RESISTÊNCIA');
      btn.click();
      expect(rolled[0]).toMatchObject({
        consume: { op: 'use', ability: 'Sopro' },
        card: { kind: 'save' },
      });
    });

    it('uso esgotado: carta apagada, botão travado, ↺ devolve; contador de lendárias junto do baralho', () => {
      const asa = ability({ ...CIMITARRA, name: 'Asa', usage: { type: 'cost', actions: 2 } });
      const { el, ops, openHand, comp } = renderCards(
        block([SOPRO], { legendary_count: 3, legendary_actions: [asa] }),
        state({ recharge: ['Sopro'], legendary_used: 2 }),
      );
      expect(comp.hand()[0].state).toBe('locked');
      expect(el.textContent).toContain('LENDÁRIAS: RESTAM 1 DE 3 NA RODADA');
      openHand();
      expect(el.querySelector<HTMLButtonElement>('.ma-hand-btn')!.disabled).toBe(true);
      el.querySelector<HTMLButtonElement>('.ma-hand-actions .ma-restore')!.click();
      expect(ops).toEqual([{ op: 'restore', ability: 'Sopro' }]);
    });
  });

  describe('só leitura (detalhe do bestiário, 1.13.4)', () => {
    function renderView(b: MonsterStatBlock, part: 'actions' | 'checks') {
      const fixture = TestBed.createComponent(MonsterActionsComponent);
      fixture.componentRef.setInput('block', b);
      fixture.componentRef.setInput('part', part);
      fixture.componentRef.setInput('asCards', true);
      fixture.componentRef.setInput('viewOnly', true);
      const rolled: MonsterRollRequest[] = [];
      fixture.componentInstance.roll.subscribe((r) => rolled.push(r));
      fixture.detectChanges();
      return { fixture, el: fixture.nativeElement as HTMLElement, rolled };
    }

    it('ações: baralho sem contadores; lista, covil e descanso sem botões; mão sem botão', () => {
      const multi = ability({
        name: 'Ataques Múltiplos',
        multiattack: [{ action: 'Cimitarra', count: 2 }],
      });
      const asa = ability({ ...CIMITARRA, name: 'Asa', usage: { type: 'cost', actions: 2 } });
      const { fixture, el } = renderView(
        block([multi, CIMITARRA, SOPRO], {
          legendary_count: 3,
          legendary_actions: [asa],
          reactions: [ability({ name: 'Aparar', desc: 'Soma 2 na CA.' })],
          lair_actions: 'O teto desaba.',
        }),
        'actions',
      );
      expect(el.querySelector('app-card-deck')).not.toBeNull();
      expect(el.querySelector('.ma-deck-status')).toBeNull();
      expect(el.textContent).toContain('Ataques Múltiplos');
      expect(el.textContent).toContain('O teto desaba.');
      expect(el.textContent).not.toContain('FORA DO COVIL');
      expect(el.querySelector('.ma-item button')).toBeNull();
      expect(el.textContent).not.toContain('DESCANSO');
      el.querySelector<HTMLButtonElement>('app-card-deck .deck')!.click();
      fixture.detectChanges();
      expect(el.querySelector('app-card-hand')).not.toBeNull();
      expect(el.querySelector('.ma-hand-btn')).toBeNull();
    });

    it('lendárias na lista dizem quantas por rodada, sem contar uso', () => {
      const grito = ability({ name: 'Grito', desc: 'Assusta.' });
      const { el } = renderView(
        block([CIMITARRA], { legendary_count: 3, legendary_actions: [grito] }),
        'actions',
      );
      expect(el.textContent).toContain('AÇÕES LENDÁRIAS — 3 POR RODADA');
      expect(el.textContent).not.toContain('RESTAM');
    });

    it('testes viram etiquetas que não rolam', () => {
      const { el, rolled } = renderView(
        block([CIMITARRA], { saving_throws: [{ ability: 'DES', bonus: 6 }] }),
        'checks',
      );
      expect(el.querySelector('.ma-chips button')).toBeNull();
      const chips = Array.from(el.querySelectorAll<HTMLElement>('.ma-chip--static'));
      expect(chips[1].textContent?.trim()).toBe('Destreza +6');
      chips[1].click();
      expect(rolled).toEqual([]);
    });
  });
});
