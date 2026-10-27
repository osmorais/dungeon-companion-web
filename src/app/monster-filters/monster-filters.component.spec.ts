import { TestBed } from '@angular/core/testing';
import { MonsterFiltersComponent } from './monster-filters.component';
import { EMPTY_MONSTER_FILTERS, MonsterFilters } from './monster-filters';

describe('MonsterFiltersComponent (painel de filtros)', () => {
  function render(opts: { mobile?: boolean; filters?: Partial<MonsterFilters> } = {}) {
    const fixture = TestBed.createComponent(MonsterFiltersComponent);
    fixture.componentRef.setInput('filters', { ...EMPTY_MONSTER_FILTERS, ...opts.filters });
    fixture.componentRef.setInput('types', ['dragão', 'gigante']);
    fixture.componentRef.setInput('sizes', ['Médio', 'Grande']);
    fixture.componentRef.setInput('total', 14);
    fixture.componentRef.setInput('mobile', opts.mobile ?? false);
    const patches: Partial<MonsterFilters>[] = [];
    let cleared = 0;
    fixture.componentInstance.patch.subscribe((p) => patches.push(p));
    fixture.componentInstance.cleared.subscribe(() => cleared++);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const button = (text: string) =>
      Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
        b.textContent?.includes(text),
      )!;
    return { fixture, el, patches, button, cleared: () => cleared };
  }

  it('desktop: filtros à mostra; faixa de ND e lendários emitem o que mudou', () => {
    const { el, patches, button } = render();
    expect(el.querySelector('.mf-toggle')).toBeNull();
    expect(el.querySelector('.mf-body')).not.toBeNull();
    button('5–10').click();
    button('LENDÁRIOS').click();
    expect(patches).toEqual([{ crMin: 5, crMax: 10 }, { legendary: true }]);
  });

  it('faixa ligada fica marcada; LIMPAR FILTROS só aparece com filtro ligado', () => {
    const { el, button, cleared } = render({ filters: { crMin: 17, crMax: null, flies: true } });
    expect(button('17+').getAttribute('aria-pressed')).toBe('true');
    expect(button('TODOS').getAttribute('aria-pressed')).toBe('false');
    button('LIMPAR FILTROS (2)').click();
    expect(cleared()).toBe(1);
    expect(render().el.querySelector('.mf-clear')).toBeNull();
    expect(el.textContent).toContain('14 MONSTROS');
  });

  it('celular: só a busca, e os filtros abrem e fecham no botão FILTROS', () => {
    const { fixture, el } = render({ mobile: true, filters: { legendary: true } });
    expect(el.querySelector('.mf-search')).not.toBeNull();
    expect(el.querySelector('.mf-body')).toBeNull();
    const toggle = el.querySelector<HTMLButtonElement>('.mf-toggle')!;
    expect(toggle.textContent?.replace(/\s+/g, ' ')).toContain('1 LIGADO · 14 MONSTROS');
    toggle.click();
    fixture.detectChanges();
    expect(el.querySelector('.mf-body')).not.toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    toggle.click();
    fixture.detectChanges();
    expect(el.querySelector('.mf-body')).toBeNull();
  });
});
