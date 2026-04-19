import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CharacterSheetData } from '../models/character.interface';
import { CharacterSheetResponse } from '../models/character-response.interface';

@Injectable({
  providedIn: 'root'
})
export class CharacterService {
  private http = inject(HttpClient);

  currentCharacter = signal<CharacterSheetResponse | null>(null);

  saveCharacter(payload: CharacterSheetData): Observable<CharacterSheetResponse> {
    return this.http.post<CharacterSheetResponse>('http://127.0.0.1:3000/api/character-sheet', payload);
  }
}
