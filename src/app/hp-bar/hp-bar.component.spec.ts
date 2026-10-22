import { TestBed } from '@angular/core/testing';
import { FRAME_BAR_MIN_FILL, HpBarComponent } from './hp-bar.component';

describe('HpBarComponent', () => {
  const create = (current: number, max: number, temp = 0) => {
    const bar = TestBed.runInInjectionContext(() => new HpBarComponent());
    bar.current = current;
    bar.max = max;
    bar.temp = temp;
    return bar;
  };

  it('vida cheia: barra toda verde, sem temporários', () => {
    const bar = create(20, 20);
    expect(bar.greenPercent).toBe(100);
    expect(bar.tempPercent).toBe(0);
    expect(bar.label).toBe('20/20');
    expect(bar.color).toBe('rgb(76, 175, 80)');
  });

  it('temporários entram no total e aparecem no texto', () => {
    const bar = create(15, 20, 5);
    expect(bar.greenPercent).toBe(60);
    expect(bar.tempPercent).toBe(20);
    expect(bar.label).toBe('15/20 +5');
  });

  it('caído: barra vazia e vermelha; máximo 0 não divide por zero', () => {
    const bar = create(0, 20);
    expect(bar.greenPercent).toBe(0);
    expect(bar.color).toBe('rgb(229, 57, 53)');
    expect(create(0, 0).greenPercent).toBe(0);
  });

  it('pouca vida continua visível (o começo do trilho fica sob a moldura)', () => {
    expect(create(1, 47).greenPercent).toBe(FRAME_BAR_MIN_FILL);
  });

  it('medalhão na cor da vida; apagado com 0 PV', () => {
    expect(create(20, 20).medalBackground).toContain('rgb(76, 175, 80)');
    expect(create(0, 20).medalBackground).toBeNull();
  });
});
