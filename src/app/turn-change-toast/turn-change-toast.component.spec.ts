import { TestBed } from '@angular/core/testing';
import { TurnChangeToastComponent } from './turn-change-toast.component';
import { DamageImpactService } from '../services/damage-impact.service';

describe('TurnChangeToastComponent', () => {
  function render(isMine: boolean, withFrom = true) {
    TestBed.configureTestingModule({
      providers: [{ provide: DamageImpactService, useValue: { enabled: () => false } }],
    });
    const fixture = TestBed.createComponent(TurnChangeToastComponent);
    fixture.componentInstance.to = {
      name: 'Thorin',
      imageUrl: 'https://cdn/t.png',
      avatarPreset: null,
    };
    fixture.componentInstance.from = withFrom
      ? { name: 'Goblin', imageUrl: null, avatarPreset: null }
      : null;
    fixture.componentInstance.round = 3;
    fixture.componentInstance.isMine = isMine;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('mostra quem sai, quem entra, a rodada e "VEZ DE"', () => {
    const el = render(false);
    expect(el.textContent).toContain('RONDA 3');
    expect(el.textContent).toContain('VEZ DE Thorin');
    expect(el.textContent).toContain('Goblin');
    expect(el.querySelector('.turn-toast-card--in img')!.getAttribute('src')).toBe(
      'https://cdn/t.png',
    );
  });

  it('pra quem é a vez: "É A SUA VEZ!"; sem quem saiu, só o card que entra', () => {
    const el = render(true, false);
    expect(el.textContent).toContain('É A SUA VEZ!');
    expect(el.querySelector('.turn-toast-card--out')).toBeNull();
  });

  it('clique fecha', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: DamageImpactService, useValue: { enabled: () => false } }],
    });
    const fixture = TestBed.createComponent(TurnChangeToastComponent);
    fixture.componentInstance.to = { name: 'A', imageUrl: null, avatarPreset: null };
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.turn-toast-overlay') as HTMLElement).click();
    expect(closed).toHaveBeenCalled();
  });

  it('jogador/NPC aparece com o card inteiro (jogador, classe, nível e PV); monstro só com imagem', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: DamageImpactService, useValue: { enabled: () => false } }],
    });
    const fixture = TestBed.createComponent(TurnChangeToastComponent);
    fixture.componentInstance.from = {
      name: 'Goblin',
      imageUrl: 'https://cdn/g.png',
      avatarPreset: null,
    };
    fixture.componentInstance.to = {
      name: 'Lyra',
      imageUrl: 'https://cdn/lyra.png',
      avatarPreset: null,
      character: {
        playerName: 'Ana',
        className: 'Maga',
        race: 'Elfa',
        level: 5,
        hp: { current: 20, max: 27, temp: 3 },
      },
    };
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const incoming = el.querySelector('.turn-toast-card--in .turn-card') as HTMLElement;
    expect(incoming.classList).toContain('framed-card');
    expect(incoming.textContent).toContain('Ana');
    expect(incoming.textContent).toContain('Maga — Elfa');
    expect(incoming.querySelector('[role="progressbar"]')?.getAttribute('aria-label')).toContain(
      'Nível 5',
    );
    expect(incoming.textContent).toContain('20/27 +3');
    expect(incoming.style.backgroundImage).toContain('lyra.png');
    const outgoing = el.querySelector('.turn-toast-card--out .turn-card') as HTMLElement;
    expect(outgoing.classList).toContain('turn-card--monster');
    expect(outgoing.querySelector('img.turn-card-image')!.getAttribute('src')).toBe(
      'https://cdn/g.png',
    );
    expect(outgoing.textContent).not.toContain('/');
  });
});
