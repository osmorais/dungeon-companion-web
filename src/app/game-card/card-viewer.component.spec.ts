import { TestBed } from '@angular/core/testing';
import { CardViewerComponent } from './card-viewer.component';

describe('CardViewerComponent', () => {
  it('Esc fecha a carta (a tela de trás continua aberta)', () => {
    const viewer = TestBed.runInInjectionContext(() => new CardViewerComponent());
    const closed = vi.fn();
    viewer.closed.subscribe(closed);
    viewer.onEscape();
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('o voltar padrão diz só VOLTAR', () => {
    const viewer = TestBed.runInInjectionContext(() => new CardViewerComponent());
    expect(viewer.backLabel).toBe('VOLTAR');
  });
});
