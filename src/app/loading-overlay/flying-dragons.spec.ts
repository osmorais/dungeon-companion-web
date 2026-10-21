import { TestBed } from '@angular/core/testing';
import { DRAGON_COUNT, randomDragon } from './flying-dragons';
import { LoadingOverlayComponent } from './loading-overlay.component';
import { LoadingOverlayService } from './loading-overlay.service';

describe('randomDragon (sorteio do voo)', () => {
  it('menor sorteio: alto na tela, da direita pra esquerda, rápido e pequeno', () => {
    expect(randomDragon(1, 0.7, () => 0)).toEqual({
      id: 1,
      top: 5,
      reverse: true,
      duration: 3.5,
      delay: 0.7,
      size: 140,
    });
  });

  it('maior sorteio: baixo na tela, da esquerda pra direita, lento e grande', () => {
    expect(randomDragon(2, 0, () => 0.999)).toEqual({
      id: 2,
      top: 65,
      reverse: false,
      duration: 6,
      delay: 0,
      size: 220,
    });
  });
});

describe('LoadingOverlayComponent (dragões voando no carregamento)', () => {
  let overlay: LoadingOverlayService;
  let component: LoadingOverlayComponent;

  beforeEach(() => {
    overlay = TestBed.inject(LoadingOverlayService);
    component = TestBed.runInInjectionContext(() => new LoadingOverlayComponent());
  });

  it('sem carregamento não tem dragão', () => {
    TestBed.tick();
    expect(component.dragons()).toEqual([]);
  });

  it('carregando: entra um dragão só, sem atraso', () => {
    overlay.show();
    TestBed.tick();
    expect(DRAGON_COUNT).toBe(1);
    expect(component.dragons().map((d) => d.delay)).toEqual([0]);
  });

  it('ainda carregando, quem termina a travessia dá lugar a outro dragão', () => {
    overlay.show();
    TestBed.tick();
    const [first] = component.dragons();
    component.onFlightEnd(first);
    expect(component.dragons().length).toBe(DRAGON_COUNT);
    expect(component.dragons().some((d) => d.id === first.id)).toBe(false);
  });

  it('carregamento acabou: os dragões terminam a travessia e nenhum novo entra', () => {
    overlay.show();
    TestBed.tick();
    overlay.hideImmediate();
    const dragons = component.dragons();
    dragons.forEach((d) => component.onFlightEnd(d));
    expect(component.dragons()).toEqual([]);
  });

  it('carregamento emendado não duplica os dragões no ar', () => {
    overlay.show();
    TestBed.tick();
    overlay.hideImmediate();
    overlay.show();
    TestBed.tick();
    expect(component.dragons().length).toBe(DRAGON_COUNT);
  });
});
