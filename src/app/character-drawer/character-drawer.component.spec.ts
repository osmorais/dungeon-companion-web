import { TestBed } from '@angular/core/testing';
import { CharacterDrawerComponent } from './character-drawer.component';

describe('CharacterDrawerComponent', () => {
  let component: CharacterDrawerComponent;

  beforeEach(() => {
    component = TestBed.runInInjectionContext(() => new CharacterDrawerComponent());
  });

  it('começa recolhida', () => {
    expect(component.open()).toBe(false);
  });

  it('botão fecha a gaveta antes de emitir (modal/ficha abre sem a gaveta por cima)', () => {
    component.open.set(true);
    let openWhenEmitted: boolean | null = null;
    component.inventory.subscribe(() => (openWhenEmitted = component.open()));

    component.run(component.inventory);

    expect(openWhenEmitted).toBe(false);
  });

  it('Esc recolhe', () => {
    component.open.set(true);
    component.close();
    expect(component.open()).toBe(false);
  });
});
