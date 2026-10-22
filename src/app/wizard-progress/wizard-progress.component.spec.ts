import { TestBed } from '@angular/core/testing';
import { WizardProgressComponent } from './wizard-progress.component';

describe('WizardProgressComponent', () => {
  const create = (skipMagic: boolean) => {
    const bar = TestBed.runInInjectionContext(() => new WizardProgressComponent());
    bar.steps = [
      { label: 'PERSONAGEM' },
      { label: 'ATRIBUTOS' },
      { label: 'MAGIAS', skipped: skipMagic },
      { label: 'PERÍCIAS' },
      { label: 'AVATAR' },
    ];
    return bar;
  };

  it('0% no primeiro passo e 100% no último', () => {
    const bar = create(false);
    bar.current = 1;
    expect(bar.percent()).toBe(0);
    bar.current = 5;
    expect(bar.percent()).toBe(100);
  });

  it('etapa pulada não conta: PASSO 3 DE 4 em PERÍCIAS', () => {
    const bar = create(true);
    bar.current = 4;
    expect(bar.activeCount()).toBe(4);
    expect(bar.position()).toBe(2);
    expect(bar.percent()).toBe(67);
  });

  it('partial adianta a barra dentro da etapa (círculos de magia)', () => {
    const bar = create(false);
    bar.current = 3;
    bar.partial = 0.5;
    expect(bar.percent()).toBe(63);
  });
});
