import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CharacterSheetComponent } from './character-sheet.component';
import { CharacterService } from '../services/character.service';

/**
 * Lógica da ficha sem renderizar o template: sem `id` de entrada o componente não busca a ficha,
 * então só o estado local conta.
 */
describe('CharacterSheetComponent', () => {
  let component: CharacterSheetComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: CharacterService, useValue: {} }],
    });
    component = TestBed.runInInjectionContext(() => new CharacterSheetComponent());
  });

  describe('círculos de magia', () => {
    it('começam todos fechados, inclusive os truques', () => {
      for (const circle of [0, 1, 2, 9]) {
        expect(component.isCircleCollapsed(circle)).toBe(true);
      }
    });

    it('abre e fecha de novo só o círculo clicado', () => {
      component.toggleCircle(0);
      expect(component.isCircleCollapsed(0)).toBe(false);
      expect(component.isCircleCollapsed(1)).toBe(true);

      component.toggleCircle(0);
      expect(component.isCircleCollapsed(0)).toBe(true);
    });
  });
});
