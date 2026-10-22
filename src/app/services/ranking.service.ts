import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RankingResponse } from '../models/ranking.interface';

@Injectable({
  providedIn: 'root',
})
export class RankingService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getRanking(): Observable<RankingResponse> {
    return this.http.get<RankingResponse>(`${this.baseUrl}/api/ranking`);
  }
}
