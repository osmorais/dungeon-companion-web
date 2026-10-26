import { TestBed } from '@angular/core/testing';
import { MonsterDrawerComponent, MonsterStatsDraft } from './monster-drawer.component';
import { MonsterSession } from '../models/game-session.interface';
import { MonsterStatBlock } from '../models/monster-catalog.interface';

const BLOCK = {
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
  saving_throws: [],
  skills: [],
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
} as unknown as MonsterStatBlock;

const GOBLIN: MonsterSession = {
  id_monster_session: 'm1',
  id_game_session: 'gs',
  monster_api_slug: 'goblin',
  hp_current: 5,
  hp_max: 7,
  ac: 15,
  data_snapshot: BLOCK,
  is_revealed: false,
  image_url: null,
  lore: 'Pequenos e traiçoeiros.',
};

describe('MonsterDrawerComponent (ficha do monstro na gaveta)', () => {
  function render(inputs: Partial<MonsterDrawerComponent> = {}) {
    const fixture = TestBed.createComponent(MonsterDrawerComponent);
    fixture.componentRef.setInput('monster', GOBLIN);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = () => Array.from(el.querySelectorAll<HTMLButtonElement>('button'));
    const byText = (t: string) => buttons().find((b) => b.textContent?.trim().includes(t));
    return { fixture, el, byText, comp: fixture.componentInstance };
  }

  it('barra com o nome, destaque com PV/CA/ND e as três colunas, com a carta e a descrição', () => {
    const { el } = render();
    expect(el.querySelector('.bottom-drawer-bar')?.textContent).toContain('Goblin');
    expect(el.querySelector('.pa-stat--hp')?.textContent).toContain('5/7');
    const titles = Array.from(el.querySelectorAll('.pa-col-title')).map((t) =>
      t.textContent?.trim(),
    );
    expect(titles).toEqual(['MONSTRO', 'AÇÕES', 'TESTES']);
    expect(el.querySelector('app-game-card .gc-desc')?.textContent).toContain('traiçoeiros');
    // Ações que rolam como cartas (1.13.3): o baralho, não um botão na lista.
    expect(el.querySelector('app-card-deck')?.textContent).toContain('AÇÕES · 1');
    expect(el.textContent).toContain('RESISTÊNCIAS');
  });

  it('na vez do monstro: faixa VEZ DE e FINALIZAR TURNO', () => {
    expect(render().el.querySelector('.pa-turn-banner')).toBeNull();
    const { el, byText, comp } = render({ isTurn: true, canEndTurn: true });
    expect(el.querySelector('.pa-turn-banner')?.textContent).toContain('VEZ DE Goblin');
    let ended = 0;
    comp.endTurn.subscribe(() => ended++);
    byText('FINALIZAR TURNO')!.click();
    expect(ended).toBe(1);
  });

  it('DANO/CURA no PV, ATACAR (pela mão de cartas) e fechar avisam a sessão', () => {
    const { fixture, el, byText, comp } = render();
    const hp: unknown[] = [];
    const rolls: unknown[] = [];
    let closed = 0;
    comp.hp.subscribe((e) => hp.push(e));
    comp.roll.subscribe((e) => rolls.push(e));
    comp.closed.subscribe(() => closed++);
    const input = el.querySelector<HTMLInputElement>('.pa-hp-input')!;
    input.value = '3';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    byText('DANO')!.click();
    byText('CURA TOTAL')!.click();
    expect(hp).toEqual([
      { kind: 'damage', amount: 3 },
      { kind: 'heal', amount: 2 },
    ]);
    el.querySelector<HTMLButtonElement>('app-card-deck .deck')!.click();
    fixture.detectChanges();
    expect(el.querySelector('app-card-hand')).not.toBeNull();
    byText('ATACAR')!.click();
    expect(rolls[0]).toMatchObject({ card: { name: 'Cimitarra', kind: 'attack' } });
    el.querySelector<HTMLButtonElement>('.bottom-drawer-bar')!.click();
    expect(closed).toBe(1);
  });

  it('REVELAR/ESCONDER mostra o estado na mesa; DERROTAR avisa a sessão', () => {
    const hidden = render();
    expect(hidden.el.querySelector('.pa-hero-stats')?.textContent).toContain('ESCONDIDO');
    const toggles: Event[] = [];
    let defeated = 0;
    hidden.comp.toggleReveal.subscribe((e) => toggles.push(e));
    hidden.comp.defeat.subscribe(() => defeated++);
    hidden.byText('REVELAR')!.click();
    hidden.byText('DERROTAR')!.click();
    expect(toggles.length).toBe(1);
    expect(defeated).toBe(1);

    const shown = render({ monster: { ...GOBLIN, is_revealed: true } } as never);
    expect(shown.el.querySelector('.pa-hero-stats')?.textContent).toContain('REVELADO');
    expect(shown.byText('ESCONDER')).toBeDefined();
    expect(render({ defeating: true }).byText('...')?.disabled).toBe(true);
  });

  it('EDITAR STATUS: o formulário aparece com o rascunho e SALVAR avisa', () => {
    const draft: MonsterStatsDraft = {
      custom_name: 'Gorak',
      hp_current: 5,
      hp_max: 7,
      ac: 15,
      strength: 8,
      dexterity: 14,
      constitution: 10,
      intelligence: 10,
      wisdom: 8,
      charisma: 8,
    };
    expect(render().el.querySelector('.md-edit')).toBeNull();
    const { el, byText, comp } = render({ editing: true, draft });
    expect(el.querySelector('.md-edit')).not.toBeNull();
    let saved = 0;
    comp.saveStats.subscribe(() => saved++);
    byText('SALVAR')!.click();
    expect(saved).toBe(1);
  });
});
