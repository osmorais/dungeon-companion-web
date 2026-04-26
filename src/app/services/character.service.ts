import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CharacterSheetData } from '../models/character.interface';
import { CharacterSheetResponse } from '../models/character-response.interface';
import { CharacterOptions } from '../models/character-options.interface';
import { CharacterSummary } from '../models/character-summary.interface';
import { environment } from '../../../environments/environment';

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

  getCharacters(): Observable<CharacterSummary[]> {
    return this.http.get<CharacterSummary[]>(`${this.baseUrl}/api/character-sheet`);
  }
}
