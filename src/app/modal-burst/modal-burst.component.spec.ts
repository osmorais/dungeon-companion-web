import { TestBed } from '@angular/core/testing';
import { ModalBurstComponent, ModalBurstVariant } from './modal-burst.component';
import { DamageImpactService } from '../services/damage-impact.service';

describe('ModalBurstComponent', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  function render(variant: ModalBurstVariant) {
    const fixture = TestBed.createComponent(ModalBurstComponent);
    fixture.componentRef.setInput('variant', variant);
    fixture.detectChanges();
    return fixture;
  }

  it('rolagem: estouro dourado com partículas, sem brasas', () => {
    const el: HTMLElement = render('roll').nativeElement;
    const root = el.querySelector('.modal-burst')!;
    expect(root.classList).toContain('modal-burst--roll');
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelectorAll('.modal-burst__particle').length).toBe(14);
    expect(el.querySelectorAll('.modal-burst__ember').length).toBe(0);
    expect(el.querySelectorAll('.modal-burst__ring').length).toBe(1);
  });

  it('monstro revelado: onda de choque dupla e brasas subindo', () => {
    const el: HTMLElement = render('reveal').nativeElement;
    expect(el.querySelector('.modal-burst')!.classList).toContain('modal-burst--reveal');
    expect(el.querySelectorAll('.modal-burst__ring').length).toBe(2);
    expect(el.querySelectorAll('.modal-burst__ember').length).toBeGreaterThan(0);
    expect(el.querySelectorAll('.modal-burst__particle').length).toBe(20);
  });

  it('monstro derrotado: estilhaços, sem brasas', () => {
    const el: HTMLElement = render('defeat').nativeElement;
    expect(el.querySelector('.modal-burst')!.classList).toContain('modal-burst--defeat');
    expect(el.querySelectorAll('.modal-burst__ember').length).toBe(0);
  });

  it('com "efeitos de tela" desligado não desenha nada', () => {
    TestBed.inject(DamageImpactService).toggleEnabled();
    const el: HTMLElement = render('roll').nativeElement;
    expect(el.querySelector('.modal-burst')).toBeNull();
  });
});
