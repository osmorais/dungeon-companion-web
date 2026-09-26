import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { InventoryItem, ItemCatalogEntry } from '../models/player-inventory.interface';

@Injectable({
  providedIn: 'root',
})
export class PlayerInventoryService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  /** Catálogo completo de itens — dado de referência, sem dono. */
  getItemCatalog(): Observable<ItemCatalogEntry[]> {
    return this.http.get<ItemCatalogEntry[]>(`${this.baseUrl}/api/item`);
  }

  getInventory(idPlayerSession: string): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(
      `${this.baseUrl}/api/player-session/${idPlayerSession}/inventory`,
    );
  }

  /** Soma na quantidade se o jogador já tiver esse item (upsert no backend). */
  addItem(idPlayerSession: string, idItem: number, quantity = 1): Observable<InventoryItem> {
    return this.http.post<InventoryItem>(
      `${this.baseUrl}/api/player-session/${idPlayerSession}/inventory`,
      { id_item: idItem, quantity },
    );
  }

  /** `null` na resposta = a quantidade zerou e o item saiu do inventário. */
  adjustQuantity(idInventoryItem: string, delta: number): Observable<InventoryItem | null> {
    return this.http.patch<InventoryItem | null>(
      `${this.baseUrl}/api/player-inventory-item/${idInventoryItem}/quantity`,
      { delta },
    );
  }

  removeItem(idInventoryItem: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/player-inventory-item/${idInventoryItem}`);
  }
}
