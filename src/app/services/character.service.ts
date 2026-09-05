import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CharacterSheetData } from '../models/character.interface';
import { CharacterBackground, CharacterSheetResponse } from '../models/character-response.interface';
import { AvatarPreset } from '../models/avatar-preset.interface';
import { CharacterOptions } from '../models/character-options.interface';
import { CharacterSummary, CharacterPagedList } from '../models/character-summary.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CharacterService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  currentCharacter = signal<CharacterSheetResponse | null>(null);
  avatarUrl = signal<string | null>(null);
  cachedOptions = signal<CharacterOptions | null>(null);

  saveCharacter(payload: CharacterSheetData): Observable<CharacterSheetResponse> {
    return this.http.post<CharacterSheetResponse>(`${this.baseUrl}/api/character-sheet`, payload);
  }

  getCharacterById(id: number): Observable<CharacterSheetResponse> {
    return this.http.get<CharacterSheetResponse>(`${this.baseUrl}/api/character-sheet/${id}`);
  }

  getCharacterOptions(): Observable<CharacterOptions> {
    return this.http.get<CharacterOptions>(`${this.baseUrl}/api/character-options`);
  }

  updateAvatarPreset(id: number, preset: AvatarPreset): Observable<{success: boolean}> {
    return this.http.patch<{success: boolean}>(`${this.baseUrl}/api/character-sheet/${id}/avatar`, { avatar_preset: preset });
  }

  getCharacters(page: number, pageSize: number): Observable<CharacterPagedList> {
    return this.http.get<CharacterPagedList>(`${this.baseUrl}/api/character-sheet`, {
      params: { page: page.toString(), pageSize: pageSize.toString() },
    });
  }

  getCharacterBackground(id: number): Observable<CharacterBackground> {
    return this.http.get<CharacterBackground>(`${this.baseUrl}/api/character-sheet/${id}/background`);
  }

  updateNotes(input: CharacterBackground): Observable<object> {
    return this.http.post<object>(`${this.baseUrl}/api/character-sheet/update-notes`, input);
  }

  updateHp(id: number, currentHitPoints: number): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(
      `${this.baseUrl}/api/character-sheet/${id}/hp`,
      { current_hit_points: currentHitPoints },
    );
  }

  printCharacter(id: number): Observable<string> {
    return this.http.get(`${this.baseUrl}/api/character-sheet/${id}/print`, {
      responseType: 'text',
    });
  }

  updateSpellSlots(id: number, level: number, delta: number): Observable<{ slots_expended: Record<string, number> }> {
    return this.http.patch<{ slots_expended: Record<string, number> }>(
      `${this.baseUrl}/api/character-sheet/${id}/spell-slots`,
      { level, delta },
    );
  }

  longRest(id: number): Observable<{ slots_expended: Record<string, number> }> {
    return this.http.post<{ slots_expended: Record<string, number> }>(
      `${this.baseUrl}/api/character-sheet/${id}/long-rest`,
      {},
    );
  }

  setSpellPrepared(id: number, idSpell: number, isPrepared: boolean): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(
      `${this.baseUrl}/api/character-sheet/${id}/spells/${idSpell}/prepared`,
      { is_prepared: isPrepared },
    );
  }
}
