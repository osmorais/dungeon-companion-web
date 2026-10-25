import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  MonsterCatalogEntry,
  MonsterCatalogPagedList,
  BestiaryMonsterSummary,
  MonsterStatBlock,
} from '../models/monster-catalog.interface';

@Injectable({
  providedIn: 'root',
})
export class MonsterCatalogService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  /** Lista do bestiário (fichas do Manual dos Monstros) disponível pra catalogar. */
  listBestiary(): Observable<BestiaryMonsterSummary[]> {
    return this.http.get<BestiaryMonsterSummary[]>(`${this.baseUrl}/api/monster-catalog/bestiary`);
  }

  getBestiaryMonster(slug: string): Observable<MonsterStatBlock> {
    return this.http.get<MonsterStatBlock>(`${this.baseUrl}/api/monster-catalog/bestiary/${slug}`);
  }

  catalogMonster(slug: string, customName: string | null): Observable<MonsterCatalogEntry> {
    const body: { monster_api_slug: string; custom_name?: string } = { monster_api_slug: slug };
    if (customName) body.custom_name = customName;
    return this.http.post<MonsterCatalogEntry>(`${this.baseUrl}/api/monster-catalog`, body);
  }

  getCatalog(page: number, pageSize: number): Observable<MonsterCatalogPagedList> {
    return this.http.get<MonsterCatalogPagedList>(`${this.baseUrl}/api/monster-catalog`, {
      params: { page: page.toString(), pageSize: pageSize.toString() },
    });
  }

  getCatalogEntry(id: string): Observable<MonsterCatalogEntry> {
    return this.http.get<MonsterCatalogEntry>(`${this.baseUrl}/api/monster-catalog/${id}`);
  }

  deleteCatalogEntry(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/monster-catalog/${id}`);
  }

  uploadImage(id: string, file: File): Observable<MonsterCatalogEntry> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<MonsterCatalogEntry>(
      `${this.baseUrl}/api/monster-catalog/${id}/image`,
      formData,
    );
  }
}
