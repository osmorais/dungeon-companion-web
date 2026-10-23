import { TestBed } from '@angular/core/testing';
import { XpBarComponent, xpBarPercent } from './xp-bar.component';

describe('XpBarComponent', () => {
  const create = (level: number, xp: number, next: number | null | undefined) => {
    const bar = TestBed.runInInjectionContext(() => new XpBarComponent());
    bar.level = level;
    bar.xp = xp;
    bar.nextLevelXp = next;
    return bar;
  };

  it('mostra o caminho até o próximo nível', () => {
    const bar = create(2, 450, 900);
    expect(bar.percent).toBe(50);
    expect(bar.canLevelUp).toBe(false);
    expect(bar.label).toBe('450/900 XP');
  });

  it('com XP suficiente a barra enche e pede pra subir de nível', () => {
    const bar = create(2, 1000, 900);
    expect(bar.percent).toBe(100);
    expect(bar.canLevelUp).toBe(true);
    expect(bar.label).toBe('SUBIR DE NÍVEL!');
  });

  it('nível 20 (ou API sem o campo): cheia, sem pedir pra subir', () => {
    const bar = create(20, 355000, null);
    expect(bar.percent).toBe(100);
    expect(bar.canLevelUp).toBe(false);
    expect(bar.label).toBe('355000 XP');
    expect(create(3, 10, undefined).canLevelUp).toBe(false);
    expect(create(3, 10, undefined).label).toBe(''); // sem a informação: só o nível
  });

  it('xpBarPercent arredonda e limita entre 0 e 100', () => {
    expect(xpBarPercent(1, 3)).toBe(33);
    expect(xpBarPercent(-5, 300)).toBe(0);
    expect(xpBarPercent(900, 300)).toBe(100);
  });

  it('medalhão na cor da barra: azul com XP, dourado pra subir, apagado com 0', () => {
    expect(create(2, 450, 900).medalState).toBe('xp');
    expect(create(2, 1000, 900).medalState).toBe('ready');
    expect(create(1, 0, 300).medalState).toBe('empty');
  });

  it('pouco XP continua visível; 0 XP fica vazio', () => {
    expect(create(1, 3, 300).fillPercent).toBe(7);
    expect(create(1, 0, 300).fillPercent).toBe(0);
  });

  it('só o dono, com XP pra subir, clica: avisa pra abrir a subida de nível', () => {
    const ready = create(2, 1000, 900);
    const levelUp = vi.fn();
    ready.levelUp.subscribe(levelUp);
    ready.open();
    expect(levelUp).not.toHaveBeenCalled(); // não é o dono
    ready.canOpenLevelUp = true;
    expect(ready.clickable).toBe(true);
    ready.open();
    expect(levelUp).toHaveBeenCalledTimes(1);

    const notYet = create(2, 450, 900);
    notYet.canOpenLevelUp = true;
    expect(notYet.clickable).toBe(false); // ainda não dá pra subir
  });
});
