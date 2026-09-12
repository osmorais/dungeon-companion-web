import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CharacterSheetData } from '../models/character.interface';
import { CharacterBackground, CharacterSheetResponse, ResourceTracker } from '../models/character-response.interface';
import { AvatarPreset } from '../models/avatar-preset.interface';
import { CharacterOptions } from '../models/character-options.interface';
import { CharacterSummary, CharacterPagedList } from '../models/character-summary.interface';
import { LevelUpConfirmInput, LevelUpHitDieRoll, LevelUpPreview, LevelUpResult } from '../models/level-up.interface';
import { environment } from '../../environments/environment';

export interface LongRestResult {
  slots_expended: Record<string, number>;
  current_hit_points: number;
  hit_dice_spent: number;
  resource_trackers: ResourceTracker[];
}

export interface EquipmentUpdateInput {
  id_armour: number | null;
  has_shield: boolean;
}

export interface EquipmentUpdateResult {
  armor_class: number;
}

export interface HitDieRollResult {
  roll: number;
  con_mod: number;
  healed: number;
  current_hit_points: number;
  hit_dice_spent: number;
  hit_dice_total: number;
  die_size: number;
  resource_trackers: ResourceTracker[];
}

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

  deleteCharacter(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/character-sheet/${id}`);
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

  updateCurrency(id: number, totalPo: number): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(
      `${this.baseUrl}/api/character-sheet/${id}/currency`,
      { total_po: totalPo },
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

  updateResourceUses(id: number, resourceKey: string, delta: number): Observable<{ resource_trackers: ResourceTracker[] }> {
    return this.http.patch<{ resource_trackers: ResourceTracker[] }>(
      `${this.baseUrl}/api/character-sheet/${id}/resource-uses`,
      { resource_key: resourceKey, delta },
    );
  }

  longRest(id: number): Observable<LongRestResult> {
    return this.http.post<LongRestResult>(`${this.baseUrl}/api/character-sheet/${id}/long-rest`, {});
  }

  rollHitDie(id: number): Observable<HitDieRollResult> {
    return this.http.post<HitDieRollResult>(`${this.baseUrl}/api/character-sheet/${id}/short-rest/hit-die`, {});
  }

  updateEquipment(id: number, input: EquipmentUpdateInput): Observable<EquipmentUpdateResult> {
    return this.http.patch<EquipmentUpdateResult>(`${this.baseUrl}/api/character-sheet/${id}/equipment`, input);
  }

  previewLevelUp(id: number, idSubclass?: string): Observable<LevelUpPreview> {
    const params: Record<string, string> = idSubclass ? { id_subclass: idSubclass } : {};
    return this.http.get<LevelUpPreview>(`${this.baseUrl}/api/character-sheet/${id}/level-up/preview`, { params });
  }

  rollLevelUpHitDie(id: number): Observable<LevelUpHitDieRoll> {
    return this.http.post<LevelUpHitDieRoll>(`${this.baseUrl}/api/character-sheet/${id}/level-up/roll-hp`, {});
  }

  confirmLevelUp(id: number, input: LevelUpConfirmInput): Observable<LevelUpResult> {
    return this.http.post<LevelUpResult>(`${this.baseUrl}/api/character-sheet/${id}/level-up/confirm`, input);
  }

  setSpellPrepared(id: number, idSpell: number, isPrepared: boolean): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(
      `${this.baseUrl}/api/character-sheet/${id}/spells/${idSpell}/prepared`,
      { is_prepared: isPrepared },
    );
  }
}
