import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LegalPageComponent } from './legal-page.component';

function createWithDoc(doc: unknown): LegalPageComponent {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { data: of({ doc }), snapshot: { data: { doc } } },
      },
    ],
  });
  return TestBed.runInInjectionContext(() => new LegalPageComponent());
}

describe('LegalPageComponent', () => {
  it('mostra a política de privacidade quando a rota pede privacy', () => {
    const component = createWithDoc('privacy');
    expect(component.doc()).toBe('privacy');
    expect(component.title()).toBe('POLÍTICA DE PRIVACIDADE');
  });

  it('mostra os termos de uso quando a rota pede terms', () => {
    const component = createWithDoc('terms');
    expect(component.doc()).toBe('terms');
    expect(component.title()).toBe('TERMOS DE USO');
  });

  it('cai na política de privacidade sem doc na rota', () => {
    const component = createWithDoc(undefined);
    expect(component.doc()).toBe('privacy');
  });

  it('expõe o controlador e o e-mail de contato usados no texto', () => {
    const component = createWithDoc('privacy');
    expect(component.controllerName).toBe('Osmar de Morais Junior');
    expect(component.contactEmail).toBe('mensageiro@forjaarcana.com');
    expect(component.minimumAge).toBe(18);
  });
});
