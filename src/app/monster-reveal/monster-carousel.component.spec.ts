import { TestBed } from '@angular/core/testing';
import { MonsterCarouselComponent } from './monster-carousel.component';
import { RevealedMonster } from '../models/game-session.interface';

describe('MonsterCarouselComponent (monstros revelados no painel de combate)', () => {
  const monster = (
    id: string,
    name: string,
    extra: Partial<RevealedMonster> = {},
  ): RevealedMonster => ({
    id_monster_session: id,
    name,
    image_url: null,
    monster_type: 'humanoide',
    size: 'Médio',
    lore: `Lore de ${name}.`,
    ...extra,
  });
  const LIST = [monster('m1', 'Goblin'), monster('m2', 'Orc'), monster('m3', 'Ogro')];

  function render(monsters: RevealedMonster[], focusId: string | null) {
    const fixture = TestBed.createComponent(MonsterCarouselComponent);
    fixture.componentRef.setInput('monsters', monsters);
    fixture.componentRef.setInput('focusId', focusId);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const title = () => el.querySelector('.mcar-card .gc-title')?.textContent?.trim();
    return { fixture, el, title };
  }

  it('mostra a carta do monstro em destaque, com pontos e setas', () => {
    const { el, title } = render(LIST, 'm2');
    expect(title()).toBe('Orc');
    expect(el.querySelectorAll('.mcar-dot').length).toBe(3);
    expect(el.querySelectorAll('.mcar-nav').length).toBe(2);
    expect(el.querySelector('.mcar-dot--on')?.getAttribute('aria-label')).toBe('Orc');
  });

  it('setas e pontos passam pelos outros, dando a volta', () => {
    const { fixture, el, title } = render(LIST, 'm1');
    const [prev, next] = Array.from(el.querySelectorAll<HTMLButtonElement>('.mcar-nav'));
    next.click();
    fixture.detectChanges();
    expect(title()).toBe('Orc');
    prev.click();
    prev.click();
    fixture.detectChanges();
    expect(title()).toBe('Ogro');
    el.querySelectorAll<HTMLButtonElement>('.mcar-dot')[0].click();
    fixture.detectChanges();
    expect(title()).toBe('Goblin');
  });

  it('quando o destaque muda (vez de outro monstro), volta pra ele', () => {
    const { fixture, el, title } = render(LIST, 'm1');
    el.querySelectorAll<HTMLButtonElement>('.mcar-nav')[1].click();
    fixture.detectChanges();
    expect(title()).toBe('Orc');
    fixture.componentRef.setInput('focusId', 'm3');
    fixture.detectChanges();
    expect(title()).toBe('Ogro');
  });

  it('um monstro só: sem setas nem pontos; tocar abre a carta inteira com a descrição', () => {
    const { fixture, el } = render([LIST[0]], 'm1');
    expect(el.querySelector('.mcar-nav')).toBeNull();
    expect(el.querySelector('.mcar-dots')).toBeNull();
    el.querySelector<HTMLButtonElement>('.mcar-card')!.click();
    fixture.detectChanges();
    expect(el.querySelector('app-card-viewer .gc-desc')?.textContent).toContain('Lore de Goblin');
  });

  it('mestre: tocar na carta abre a ficha (select), não a carta inteira', () => {
    const fixture = TestBed.createComponent(MonsterCarouselComponent);
    fixture.componentRef.setInput('monsters', LIST);
    fixture.componentRef.setInput('focusId', 'm2');
    fixture.componentRef.setInput('ownerMode', true);
    const selected: string[] = [];
    fixture.componentInstance.select.subscribe((id) => selected.push(id));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('.mcar-card')!.click();
    fixture.detectChanges();
    expect(selected).toEqual(['m2']);
    expect(el.querySelector('app-card-viewer')).toBeNull();
  });

  it('a carta pequena já mostra a descrição do monstro', () => {
    const { el } = render(LIST, 'm1');
    expect(el.querySelector('.mcar-card .gc-desc')?.textContent).toContain('Lore de Goblin');
  });
});
