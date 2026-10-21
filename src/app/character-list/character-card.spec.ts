import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { characterCardInfo, formatModifier, xpPercent } from './character-card';
import { CharacterListComponent } from './character-list.component';
import { CharacterService } from '../services/character.service';
import { CharacterSheetResponse } from '../models/character-response.interface';

function sheet(
  overrides: { xp?: number; next?: number | null; temp?: number } = {},
): CharacterSheetResponse {
  const attr = (score: number, modifier: number) => ({
    score,
    modifier,
    save: modifier,
    save_proficiency: false,
  });
  return {
    character_sheet: {
      header: {
        name: 'Lyra',
        class_and_level: 'Maga (Evocação) 5',
        id_class: 9,
        race: 'Elfa',
        background: 'Sábia',
        alignment: 'Neutro',
        experience_points: overrides.xp ?? 6000,
        next_level_xp: overrides.next === undefined ? 14000 : overrides.next,
      },
      combat_stats: {
        armor_class: 13,
        initiative: 3,
        passive_perception: 14,
        hit_points: { current: 20, max: 27, temporary: overrides.temp ?? 0 },
      },
      // Fora de ordem de propósito: o card mostra na ordem do livro.
      attributes_and_saves: {
        WIS: attr(14, 2),
        STR: attr(8, -1),
        CHA: attr(10, 0),
        DEX: attr(16, 3),
        INT: attr(18, 4),
        CON: attr(12, 1),
      },
      avatar_preset: null,
      image_url: 'https://cdn/lyra.png',
    },
  } as unknown as CharacterSheetResponse;
}

describe('card da lista de personagens', () => {
  it('monta o card a partir da ficha, com os atributos na ordem do livro', () => {
    const info = characterCardInfo(sheet({ temp: 4 }));
    expect(info).toMatchObject({
      classLine: 'Maga (Evocação) 5',
      race: 'Elfa',
      background: 'Sábia',
      imageUrl: 'https://cdn/lyra.png',
      hp: { current: 20, max: 27, temp: 4 },
      ac: 13,
      initiative: 3,
      passivePerception: 14,
      canLevelUp: false,
    });
    expect(info.attrs.map((a) => `${a.label} ${a.score} ${a.modifier}`)).toEqual([
      'FOR 8 -1',
      'DES 16 3',
      'CON 12 1',
      'INT 18 4',
      'SAB 14 2',
      'CAR 10 0',
    ]);
  });

  it('pode subir de nível quando o XP alcança o próximo; nível 20 não sobe', () => {
    expect(characterCardInfo(sheet({ xp: 14000 })).canLevelUp).toBe(true);
    expect(characterCardInfo(sheet({ xp: 355000, next: null })).canLevelUp).toBe(false);
  });

  it('barra de XP: proporção até o próximo nível, cheia no nível 20 e sem passar de 100', () => {
    expect(xpPercent({ xp: 7000, nextLevelXp: 14000 })).toBe(50);
    expect(xpPercent({ xp: 20000, nextLevelXp: 14000 })).toBe(100);
    expect(xpPercent({ xp: 355000, nextLevelXp: null })).toBe(100);
  });

  it('modificador com sinal', () => {
    expect(formatModifier(3)).toBe('+3');
    expect(formatModifier(0)).toBe('+0');
    expect(formatModifier(-1)).toBe('-1');
  });

  it('a lista busca a ficha de cada personagem da página; ficha que falha fica só com o resumo', () => {
    const getCharacterById = vi.fn((id: number) =>
      id === 2 ? throwError(() => new Error('500')) : of(sheet()),
    );
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CharacterService,
          useValue: {
            getCharacters: () =>
              of({
                CharacterPagedList: [
                  { id_character: 1, name: 'Lyra', level: 5, race: 'Elfa', class: 'Maga' },
                  { id_character: 2, name: 'Bram', level: 3, race: 'Anão', class: 'Clérigo' },
                ],
                total_count: 2,
              }),
            getCharacterById,
          },
        },
      ],
    });
    const list = TestBed.runInInjectionContext(() => new CharacterListComponent());
    list.ngOnInit();
    expect(getCharacterById).toHaveBeenCalledWith(1, true);
    expect(getCharacterById).toHaveBeenCalledWith(2, true);
    expect(list.cardInfo(1)?.ac).toBe(13);
    expect(list.cardInfo(2)).toBeNull();
  });
});
