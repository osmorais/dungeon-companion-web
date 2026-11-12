import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import {
  LanguageToolPickerComponent,
  languageToolComplete,
  trimLanguageToolValue,
} from './language-tool-picker.component';
import { LanguageToolModalComponent } from './language-tool-modal.component';
import { CharacterService } from '../services/character.service';
import { CharacterSheetComponent } from '../character-sheet/character-sheet.component';
import { SheetLanguageToolChoices } from '../models/character-response.interface';

const KIT = { placeholder: 'Um tipo de kit de jogo', options: ['Dados', 'Baralho'] };

describe('idiomas e ferramentas à escolha (1.24.0)', () => {
  it('completo: todos os idiomas, sem repetir nem os que já fala, e todas as ferramentas', () => {
    const ok = { languages: ['Élfico', 'Anão'], tools: { [KIT.placeholder]: 'Dados' } };
    expect(languageToolComplete(ok, 2, ['Comum'], [KIT])).toBe(true);
    expect(languageToolComplete({ ...ok, languages: ['Élfico'] }, 2, ['Comum'], [KIT])).toBe(false);
    expect(
      languageToolComplete({ ...ok, languages: ['Élfico', 'Élfico'] }, 2, ['Comum'], [KIT]),
    ).toBe(false);
    expect(languageToolComplete({ ...ok, languages: ['Comum', 'Anão'] }, 2, ['Comum'], [KIT])).toBe(
      false,
    );
    expect(languageToolComplete({ ...ok, tools: {} }, 2, ['Comum'], [KIT])).toBe(false);
    expect(languageToolComplete({ languages: [], tools: {} }, 0, [], [])).toBe(true);
  });

  it('trim: depois de trocar raça/antecedente, só fica o que vale', () => {
    const value = {
      languages: ['Élfico', 'Comum', 'Anão'],
      tools: { [KIT.placeholder]: 'Dados', 'Ferramentas de Artesão': 'Ferramentas de Ferreiro' },
    };
    expect(trimLanguageToolValue(value, 2, ['Comum'], [KIT])).toEqual({
      languages: ['Élfico'],
      tools: { [KIT.placeholder]: 'Dados' },
    });
  });

  it('o select de cada idioma esconde os que já fala e os escolhidos nos outros', () => {
    const fixture = TestBed.createComponent(LanguageToolPickerComponent);
    fixture.componentRef.setInput('languageCount', 2);
    fixture.componentRef.setInput('fixedLanguages', ['Comum']);
    fixture.componentRef.setInput('languages', ['Comum', 'Élfico', 'Anão', 'Orc']);
    fixture.componentRef.setInput('value', { languages: ['Élfico', ''], tools: {} });
    const picker = fixture.componentInstance;
    expect(picker.optionsFor(0)).toEqual(['Élfico', 'Anão', 'Orc']);
    expect(picker.optionsFor(1)).toEqual(['Anão', 'Orc']);
    expect(picker.toolLabel('Um tipo de kit de jogo')).toBe('KIT DE JOGO');
    const emitted = vi.fn();
    picker.valueChange.subscribe(emitted);
    picker.setLanguage(1, { target: { value: 'Orc' } } as unknown as Event);
    expect(emitted).toHaveBeenCalledWith({ languages: ['Élfico', 'Orc'], tools: {} });
  });
});

describe('LanguageToolModalComponent', () => {
  const choices: SheetLanguageToolChoices = {
    language_count: 1,
    language_options: ['Comum', 'Élfico', 'Anão'],
    fixed_languages: ['Comum'],
    chosen_languages: [],
    tool_slots: [KIT],
    chosen_tools: {},
  };

  function create(update: ReturnType<typeof vi.fn>) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: CharacterService, useValue: { updateLanguageToolChoices: update } }],
    });
    const fixture = TestBed.createComponent(LanguageToolModalComponent);
    fixture.componentRef.setInput('idCharacter', 184);
    fixture.componentRef.setInput('choices', choices);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('só salva completo; manda as escolhas e avisa a ficha', () => {
    const update = vi.fn(() => of({ languages: ['Comum', 'Élfico'], tools: ['Dados'] }));
    const modal = create(update);
    const saved = vi.fn();
    modal.saved.subscribe(saved);
    modal.save();
    expect(update).not.toHaveBeenCalled();
    modal.value.set({ languages: ['Élfico'], tools: { [KIT.placeholder]: 'Dados' } });
    modal.save();
    expect(update).toHaveBeenCalledWith(184, {
      languages: ['Élfico'],
      tools: { [KIT.placeholder]: 'Dados' },
    });
    expect(saved).toHaveBeenCalledWith(
      expect.objectContaining({ languages: ['Comum', 'Élfico'], tools: ['Dados'] }),
    );
  });

  it('erro da API aparece no modal', () => {
    const modal = create(vi.fn(() => throwError(() => ({ status: 422 }))));
    modal.value.set({ languages: ['Élfico'], tools: { [KIT.placeholder]: 'Dados' } });
    modal.save();
    expect(modal.error()).toBeTruthy();
    expect(modal.saving()).toBe(false);
  });
});

describe('CharacterSheetComponent — idiomas e ferramentas', () => {
  it('pendente → ESCOLHER; salvar troca o texto genérico e mantém as outras ferramentas', () => {
    const currentCharacter = signal({
      character_sheet: {
        proficiencies_and_languages: {
          armor: [],
          weapons: [],
          tools: ['Um tipo de kit de jogo', 'Ferramentas de Ferreiro'],
          languages: ['Comum', 'Idioma à escolha 1'],
          choices: {
            language_count: 1,
            language_options: ['Élfico'],
            fixed_languages: ['Comum'],
            chosen_languages: [],
            tool_slots: [KIT],
            chosen_tools: {},
          },
        },
      },
    });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: CharacterService, useValue: { currentCharacter } }],
    });
    const sheet = TestBed.runInInjectionContext(() => new CharacterSheetComponent());
    expect(sheet.hasLanguageToolChoices()).toBe(true);
    expect(sheet.hasPendingLanguageToolChoices()).toBe(true);
    sheet.onLanguageToolSaved({
      languages: ['Comum', 'Élfico'],
      tools: ['Dados'],
      value: { languages: ['Élfico'], tools: { [KIT.placeholder]: 'Dados' } },
    });
    const profs = (
      currentCharacter() as unknown as {
        character_sheet: { proficiencies_and_languages: { languages: string[]; tools: string[] } };
      }
    ).character_sheet.proficiencies_and_languages;
    expect(profs.languages).toEqual(['Comum', 'Élfico']);
    expect(profs.tools).toEqual(['Dados', 'Ferramentas de Ferreiro']);
    expect(sheet.hasPendingLanguageToolChoices()).toBe(false);
  });
});
