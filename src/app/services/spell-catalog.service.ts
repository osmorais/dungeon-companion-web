import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SpellCatalogEntry, SpellCatalogPagedList } from '../models/spell-catalog.interface';

@Injectable({
  providedIn: 'root',
})
export class SpellCatalogService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getCatalog(page: number, pageSize: number, search: string | null): Observable<SpellCatalogPagedList> {
    const params: Record<string, string> = { page: page.toString(), pageSize: pageSize.toString() };
    if (search) params['search'] = search;
    return this.http.get<SpellCatalogPagedList>(`${this.baseUrl}/api/spell-catalog`, { params });
  }

  getSpell(id: number): Observable<SpellCatalogEntry> {
    return this.http.get<SpellCatalogEntry>(`${this.baseUrl}/api/spell-catalog/${id}`);
  }
}
