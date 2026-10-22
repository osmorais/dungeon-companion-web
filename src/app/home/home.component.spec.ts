import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { HomeComponent } from './home.component';
import { CharacterService } from '../services/character.service';

describe('HomeComponent (tudo numa tela só)', () => {
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

  it('começa sem papel aberto e sem opções', () => {
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

  it('o Grimório saiu das opções do mestre (fica para todos, fora dos papéis)', () => {
    const titles = [...home.playerOptions, ...home.masterOptions].map((o) => o.title);
    expect(titles).not.toContain('GRIMÓRIO DE MAGIAS');
    home.openSpellCatalog();
    expect(navigate.mock.calls).toContainEqual([['/spell-catalog']]);
  });

  it('RANKING fica para todos e leva para /ranking', () => {
    home.openRanking();
    expect(navigate.mock.calls).toContainEqual([['/ranking']]);
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
