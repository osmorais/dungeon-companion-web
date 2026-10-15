import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AccountProfile, DeleteAccountRequest } from '../models/account.interface';

/** Conta do usuário logado — direitos do titular (LGPD art. 18). */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getProfile(): Observable<AccountProfile> {
    return this.http.get<AccountProfile>(`${this.baseUrl}/api/account`);
  }

  updateFullName(fullName: string | null): Observable<AccountProfile> {
    return this.http.patch<AccountProfile>(`${this.baseUrl}/api/account`, {
      full_name: fullName,
    });
  }

  /** JSON com tudo da conta (perfil, fichas, sessões, catálogo, rolagens). */
  exportData(): Observable<object> {
    return this.http.get<object>(`${this.baseUrl}/api/account/export`);
  }

  deleteAccount(request: DeleteAccountRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/api/account/delete`, request);
  }
}
