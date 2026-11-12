import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { HOME_SWIPE_BACK_PX, HomeComponent } from './home.component';
import { CharacterService } from '../services/character.service';

/** Toque só com as coordenadas que o componente lê. */
function touch(x: number, y: number, kind: 'start' | 'end'): TouchEvent {
  const point = [{ clientX: x, clientY: y }];
  return (kind === 'start'
    ? { touches: point }
    : { changedTouches: point }) as unknown as TouchEvent;
}

describe('HomeComponent (menu no trilho)', () => {
  let home: HomeComponent;
  let navigate: { mock: { calls: unknown[][] } };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CharacterService,
          useValue: { getCharacterOptions: () => new Subject(), cachedOptions: { set: vi.fn() } },
        },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    home = TestBed.runInInjectionContext(() => new HomeComponent());
  });

  it('começa com o menu no centro: sem papel aberto e sem opções', () => {
    expect(home.role()).toBeNull();
    expect(home.roleOptions()).toEqual([]);
  });

  it('escolher um papel abre as opções dele; clicar de novo fecha; trocar troca', () => {
    home.toggleRole('player');
    expect(home.roleOptions().map((o) => o.title)).toEqual([
      'CRIAR PERSONAGEM',
      'MEUS PERSONAGENS',
      'ENTRAR EM UMA AVENTURA',
      'MINHAS AVENTURAS',
    ]);
    home.toggleRole('master');
    expect(home.roleOptions().map((o) => o.title)).toEqual([
      'CRIAR NOVA SESSÃO',
      'SESSÕES CRIADAS',
      'CATALOGAR MONSTROS',
    ]);
    home.toggleRole('master');
    expect(home.role()).toBeNull();
  });

  it('a janela só espera o menu correr quando ele sai do centro, não ao trocar de papel', () => {
    home.toggleRole('player');
    expect(home.fromCenter()).toBe(true);
    home.toggleRole('master');
    expect(home.fromCenter()).toBe(false);
    home.closeRole();
    home.toggleRole('master');
    expect(home.fromCenter()).toBe(true);
  });

  it('o conteúdo do menu só troca com animação depois que o menu correu a primeira vez', () => {
    expect(home.moved()).toBe(false);
    home.toggleRole('master');
    expect(home.moved()).toBe(true);
    home.closeRole();
    expect(home.moved()).toBe(true);
  });

  it('ao fechar, o vagão das opções continua mostrando o último papel enquanto sai', () => {
    home.toggleRole('master');
    home.closeRole();
    expect(home.role()).toBeNull();
    expect(home.shownRole()).toBe('master');
    expect(home.shownCopy().area).toBe('ÁREA DO MESTRE');
    expect(home.shownOptions().map((o) => o.title)).toContain('CATALOGAR MONSTROS');
  });

  it('cada papel tem o seu título e chamada', () => {
    expect(home.copyFor('player').area).toBe('ÁREA DO JOGADOR');
    expect(home.copyFor('master').area).toBe('ÁREA DO MESTRE');
    expect(home.copyFor('player').heading).not.toBe(home.copyFor('master').heading);
  });

  it('Esc devolve o menu ao centro', () => {
    home.toggleRole('player');
    home.onEscape();
    expect(home.role()).toBeNull();
  });

  it('no celular, arrastar pra direita volta ao menu', () => {
    home.toggleRole('player');
    home.onTouchStart(touch(20, 300, 'start'));
    home.onTouchEnd(touch(20 + HOME_SWIPE_BACK_PX, 310, 'end'));
    expect(home.role()).toBeNull();
  });

  it('arrasto curto, pra esquerda ou mais vertical que horizontal não volta', () => {
    home.toggleRole('player');
    home.onTouchStart(touch(100, 300, 'start'));
    home.onTouchEnd(touch(100 + HOME_SWIPE_BACK_PX - 1, 300, 'end'));
    home.onTouchStart(touch(200, 300, 'start'));
    home.onTouchEnd(touch(100, 300, 'end'));
    home.onTouchStart(touch(100, 100, 'start'));
    home.onTouchEnd(touch(180, 400, 'end'));
    expect(home.role()).toBe('player');
  });

  it('o Grimório saiu das opções do mestre (fica para todos, fora dos papéis)', () => {
    const titles = [...home.playerOptions, ...home.masterOptions].map((o) => o.title);
    expect(titles).not.toContain('GRIMÓRIO DE MAGIAS');
    home.openSpellCatalog();
    expect(navigate.mock.calls).toContainEqual([['/spell-catalog']]);
  });

  it('"Para todos" leva ao Grimório, ao Ranking e a Amigos', () => {
    expect(home.shared.map((s) => s.title)).toEqual(['GRIMÓRIO DE MAGIAS', 'RANKING', 'AMIGOS']);
    home.shared.forEach((s) => s.action());
    expect(navigate.mock.calls).toEqual([[['/spell-catalog']], [['/ranking']], [['/amigos']]]);
  });

  it('cada opção leva para a tela certa; CRIAR PERSONAGEM trava enquanto busca', () => {
    home.toggleRole('master');
    home.roleOptions()[1].action();
    expect(navigate.mock.calls).toContainEqual([['/sessions']]);

    home.toggleRole('player');
    const create = home.roleOptions()[0];
    expect(create.disabled?.()).toBe(false);
    create.action();
    expect(create.disabled?.()).toBe(true);
  });
});
