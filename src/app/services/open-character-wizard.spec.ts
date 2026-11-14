import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { CharacterService } from './character.service';
import { openCharacterWizard } from './open-character-wizard';

describe('openCharacterWizard (+ CRIAR PERSONAGEM fora da Home)', () => {
  function setup(options$: unknown) {
    const cachedOptions = signal<unknown>(null);
    const charService = {
      getCharacterOptions: vi.fn(() => options$),
      cachedOptions,
    } as unknown as CharacterService;
    const navigate = vi.fn();
    const router = { navigate } as unknown as Router;
    return { charService, router, navigate, cachedOptions };
  }

  it('guarda as opções e abre o wizard', () => {
    const { charService, router, navigate, cachedOptions } = setup(of({ races: [] }));
    const busy = signal(false);
    openCharacterWizard(charService, router, busy);
    expect(cachedOptions()).toEqual({ races: [] });
    expect(navigate).toHaveBeenCalledWith(['/create']);
    expect(busy()).toBe(true);
  });

  it('segundo clique enquanto busca não busca de novo', () => {
    const pending = new Subject<never>();
    const { charService, router } = setup(pending);
    const busy = signal(false);
    openCharacterWizard(charService, router, busy);
    openCharacterWizard(charService, router, busy);
    expect(charService.getCharacterOptions).toHaveBeenCalledTimes(1);
  });

  it('erro na busca abre o wizard mesmo assim', () => {
    const { charService, router, navigate } = setup(throwError(() => new Error('500')));
    openCharacterWizard(charService, router, signal(false));
    expect(navigate).toHaveBeenCalledWith(['/create']);
  });
});
