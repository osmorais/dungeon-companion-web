import { TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { TomAssistantComponent } from './tom-assistant.component';
import { TOM_STORAGE_KEY, TomService } from './tom.service';

describe('Tom: OK e desativar a ajuda', () => {
  beforeEach(() => localStorage.removeItem(TOM_STORAGE_KEY));
  afterEach(() => localStorage.removeItem(TOM_STORAGE_KEY));

  function create() {
    const fixture = TestBed.createComponent(TomAssistantComponent);
    return fixture.componentInstance;
  }

  function say(tom: TomAssistantComponent, message: string) {
    tom.message = message;
    tom.ngOnChanges({ message: new SimpleChange(null, message, false) });
  }

  it('OK fecha a fala; uma fala nova traz o Tom de volta', () => {
    const tom = create();
    say(tom, 'Olá, aventureiro!');
    tom.dismiss();
    expect(tom.dismissed()).toBe(true);
    say(tom, 'Agora os atributos.');
    expect(tom.dismissed()).toBe(false);
    tom.ngOnDestroy();
  });

  it('DESATIVAR AJUDA desliga o Tom no site todo e fica guardado no navegador', () => {
    const tom = create();
    tom.disable();
    expect(TestBed.inject(TomService).enabled()).toBe(false);
    expect(localStorage.getItem(TOM_STORAGE_KEY)).toBe('off');
    tom.ngOnDestroy();
  });

  it('TOM da barra do topo religa', () => {
    const service = TestBed.inject(TomService);
    service.set(false);
    service.toggle();
    expect(service.enabled()).toBe(true);
    expect(localStorage.getItem(TOM_STORAGE_KEY)).toBe('on');
  });
});
