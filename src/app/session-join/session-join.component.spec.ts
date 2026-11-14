import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { CharacterService } from '../services/character.service';
import { GameSessionService } from '../services/game-session.service';
import { AuthService } from '../services/auth.service';
import { SessionJoinComponent } from './session-join.component';

describe('SessionJoinComponent (código em 5 casas e resumo)', () => {
  function create() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CharacterService,
          useValue: {
            getCharacters: () =>
              of({ CharacterPagedList: [{ id_character: 7, name: 'LYRA' }], total_count: 1 }),
            getCharacterOptions: () => of({}),
            cachedOptions: signal(null),
          },
        },
        { provide: GameSessionService, useValue: {} },
        { provide: AuthService, useValue: { currentUser: signal({ username: 'ddpzin' }) } },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const cmp = TestBed.runInInjectionContext(() => new SessionJoinComponent());
    cmp.ngOnInit();
    return cmp;
  }

  it('casas do código: letras digitadas em maiúscula e casas vazias no resto', () => {
    const cmp = create();
    cmp.onCodeInput('rx-7k');
    expect(cmp.codeSlots()).toEqual(['R', 'X', '7', 'K', '']);
  });

  it('resumo diz o que falta e some quando dá pra entrar', () => {
    const cmp = create();
    expect(cmp.missing()).toBe('Faltam 5 letras do código · escolha um personagem');
    cmp.onCodeInput('RX7K');
    expect(cmp.missing()).toBe('Falta 1 letra do código · escolha um personagem');
    cmp.onCodeInput('RX7K2');
    cmp.selectCharacter(cmp.characters()[0]);
    expect(cmp.missing()).toBe('');
    expect(cmp.canJoin()).toBe(true);
  });

  it('+ CRIAR PERSONAGEM abre o wizard', () => {
    const cmp = create();
    cmp.createCharacter();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/create']);
  });
});
