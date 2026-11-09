import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconActionComponent } from './icon-action.component';

describe('IconActionComponent', () => {
  let fixture: ComponentFixture<IconActionComponent>;
  const button = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;

  function render(inputs: Record<string, unknown>) {
    fixture = TestBed.createComponent(IconActionComponent);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  }

  it('a dica também é o nome acessível do botão', () => {
    render({ label: 'Bloquear', icon: 'padlock' });
    expect(button().getAttribute('aria-label')).toBe('Bloquear');
    expect(button().getAttribute('data-tip')).toBe('Bloquear');
    expect(button().querySelector('img')?.getAttribute('src')).toBe('assets/icons/padlock.png');
  });

  it('sem ícone, mostra o ✕', () => {
    render({ label: 'Recusar' });
    expect(button().querySelector('img')).toBeNull();
    expect(button().textContent).toContain('✕');
  });

  it('clicar avisa; desabilitado, não', () => {
    render({ label: 'Aceitar' });
    const pressed = vi.fn();
    fixture.componentInstance.pressed.subscribe(pressed);
    button().click();
    expect(pressed).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    button().click();
    expect(pressed).toHaveBeenCalledTimes(1);
  });
});
