import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { SpellCatalogEntry, SpellCatalogPagedList } from '../models/spell-catalog.interface';

const ALL_BATCH_SIZE = 50;

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

  /** O catálogo inteiro (361 magias), em lotes de 50 (teto da api), pros filtros no navegador. */
  getAll(): Observable<SpellCatalogEntry[]> {
    return this.getCatalog(1, ALL_BATCH_SIZE, null).pipe(
      switchMap((first) => {
        const pages = Math.ceil(first.total_count / ALL_BATCH_SIZE);
        if (pages <= 1) return of(first.SpellCatalogPagedList);
        const rest = Array.from({ length: pages - 1 }, (_, i) =>
          this.getCatalog(i + 2, ALL_BATCH_SIZE, null),
        );
        return forkJoin(rest).pipe(
          map((more) => [first, ...more].flatMap((p) => p.SpellCatalogPagedList)),
        );
      }),
    );
  }

  getSpell(id: number): Observable<SpellCatalogEntry> {
    return this.http.get<SpellCatalogEntry>(`${this.baseUrl}/api/spell-catalog/${id}`);
  }
}
