import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlayerInventoryService } from '../services/player-inventory.service';
import { CharacterService } from '../services/character.service';
import { InventoryItem, ItemCatalogEntry } from '../models/player-inventory.interface';

type InventoryModalMode = 'items' | 'catalog';

@Component({
  selector: 'app-player-inventory-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './player-inventory-modal.component.html',
  styleUrls: ['./player-inventory-modal.component.scss'],
})
export class PlayerInventoryModalComponent implements OnInit {
  private inventoryService = inject(PlayerInventoryService);
  private charService = inject(CharacterService);

  @Input({ required: true }) idPlayerSession!: string;
  @Input({ required: true }) idCharacter!: number;
  @Input() playerName = 'Jogador';
  @Output() closed = new EventEmitter<void>();

  mode = signal<InventoryModalMode>('items');

  /** PO atual do personagem — só pra exibir/decidir no fluxo de compra; quem valida de verdade
   *  é o backend (evita ficar dessincronizado se o PO mudar por outro caminho). */
  playerGold = signal<number | null>(null);

  // --- Inventário do jogador ---
  loadingItems = signal(true);
  itemsError = signal(false);
  items = signal<InventoryItem[]>([]);
  /** id_inventory_item em andamento (ajuste de quantidade ou remoção) — evita duplo clique. */
  busyItemId = signal<string | null>(null);
  private expandedItemIds = new Set<string>();

  // --- Catálogo (aba "mercado de itens") ---
  loadingCatalog = signal(false);
  catalogError = signal(false);
  private catalogLoaded = false;
  catalog = signal<ItemCatalogEntry[]>([]);
  searchText = signal('');
  private expandedCatalogItemIds = new Set<number>();

  /** Item aguardando confirmação de "debitar PO?" (aparece depois de clicar no "+"). */
  pendingAddItem = signal<ItemCatalogEntry | null>(null);
  addingItem = signal(false);
  insufficientFunds = signal(false);

  filteredCatalog = computed(() => {
    const term = this.searchText().trim().toLowerCase();
    const all = this.catalog();
    if (!term) return all;
    return all.filter((i) => i.name.toLowerCase().includes(term));
  });

  totalWeight = computed(() =>
    this.items().reduce((sum, i) => sum + (i.weight ?? 0) * i.quantity, 0),
  );

  ngOnInit(): void {
    this.loadItems();
    this.loadGold();
  }

  private loadGold(): void {
    this.charService.getCharacterById(this.idCharacter, true).subscribe({
      next: (sheet) => this.playerGold.set(sheet.character_sheet.equipment.currency.gp),
      error: () => this.playerGold.set(null),
    });
  }

  private loadItems(): void {
    this.loadingItems.set(true);
    this.itemsError.set(false);
    this.inventoryService.getInventory(this.idPlayerSession).subscribe({
      next: (items) => {
        this.items.set(items);
        this.loadingItems.set(false);
      },
      error: () => {
        this.itemsError.set(true);
        this.loadingItems.set(false);
      },
    });
  }

  setMode(mode: InventoryModalMode): void {
    this.mode.set(mode);
    if (mode === 'catalog' && !this.catalogLoaded) this.loadCatalog();
  }

  private loadCatalog(): void {
    this.loadingCatalog.set(true);
    this.catalogError.set(false);
    this.inventoryService.getItemCatalog().subscribe({
      next: (catalog) => {
        this.catalog.set(catalog);
        this.catalogLoaded = true;
        this.loadingCatalog.set(false);
      },
      error: () => {
        this.catalogError.set(true);
        this.loadingCatalog.set(false);
      },
    });
  }

  isItemExpanded(id: string): boolean {
    return this.expandedItemIds.has(id);
  }

  toggleItemDetails(id: string): void {
    if (this.expandedItemIds.has(id)) this.expandedItemIds.delete(id);
    else this.expandedItemIds.add(id);
  }

  isCatalogItemExpanded(idItem: number): boolean {
    return this.expandedCatalogItemIds.has(idItem);
  }

  toggleCatalogItemDetails(idItem: number): void {
    if (this.expandedCatalogItemIds.has(idItem)) this.expandedCatalogItemIds.delete(idItem);
    else this.expandedCatalogItemIds.add(idItem);
  }

  /** Clique no "+": itens sem preço (ou preço zero) entram direto, sem perguntar nada — não há
   *  o que debitar. Os demais abrem a confirmação de "debitar do PO?" antes de adicionar. */
  onAddClick(item: ItemCatalogEntry, event: Event): void {
    event.stopPropagation();
    if (this.addingItem()) return;
    this.insufficientFunds.set(false);
    if (!item.price_value) {
      this.confirmAdd(item, false);
      return;
    }
    this.pendingAddItem.set(item);
  }

  cancelPendingAdd(): void {
    this.pendingAddItem.set(null);
    this.insufficientFunds.set(false);
  }

  confirmAdd(item: ItemCatalogEntry, debitCurrency: boolean): void {
    if (this.addingItem()) return;
    this.addingItem.set(true);
    this.insufficientFunds.set(false);
    this.inventoryService.addItem(this.idPlayerSession, item.id_item, 1, debitCurrency).subscribe({
      next: (added) => {
        this.upsertLocalItem(added);
        if (debitCurrency && item.price_value) {
          this.playerGold.update((gold) => (gold !== null ? gold - item.price_value! : gold));
        }
        this.addingItem.set(false);
        this.pendingAddItem.set(null);
        this.mode.set('items');
      },
      error: (err) => {
        this.addingItem.set(false);
        if (err.status === 422) this.insufficientFunds.set(true);
      },
    });
  }

  private upsertLocalItem(item: InventoryItem): void {
    this.items.update((list) => {
      const idx = list.findIndex((i) => i.id_inventory_item === item.id_inventory_item);
      if (idx === -1) {
        return [...list, item].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      }
      const next = [...list];
      next[idx] = item;
      return next;
    });
  }

  adjustQuantity(item: InventoryItem, delta: number): void {
    if (this.busyItemId()) return;
    this.busyItemId.set(item.id_inventory_item);
    this.inventoryService.adjustQuantity(item.id_inventory_item, delta).subscribe({
      next: (updated) => {
        if (updated) {
          this.upsertLocalItem(updated);
        } else {
          this.items.update((list) =>
            list.filter((i) => i.id_inventory_item !== item.id_inventory_item),
          );
        }
        this.busyItemId.set(null);
      },
      error: () => this.busyItemId.set(null),
    });
  }

  removeItem(item: InventoryItem): void {
    if (this.busyItemId()) return;
    this.busyItemId.set(item.id_inventory_item);
    this.inventoryService.removeItem(item.id_inventory_item).subscribe({
      next: () => {
        this.items.update((list) =>
          list.filter((i) => i.id_inventory_item !== item.id_inventory_item),
        );
        this.busyItemId.set(null);
      },
      error: () => this.busyItemId.set(null),
    });
  }

  close(): void {
    this.closed.emit();
  }
}
