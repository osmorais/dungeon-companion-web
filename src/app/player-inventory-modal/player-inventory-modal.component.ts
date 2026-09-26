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

  @Input({ required: true }) idPlayerSession!: string;
  @Input() playerName = 'Jogador';
  @Output() closed = new EventEmitter<void>();

  mode = signal<InventoryModalMode>('items');

  // --- Inventário do jogador ---
  loadingItems = signal(true);
  itemsError = signal(false);
  items = signal<InventoryItem[]>([]);
  /** id_inventory_item em andamento (ajuste de quantidade ou remoção) — evita duplo clique. */
  busyItemId = signal<string | null>(null);
  private expandedItemIds = new Set<string>();

  // --- Catálogo (aba "adicionar item") ---
  loadingCatalog = signal(false);
  catalogError = signal(false);
  private catalogLoaded = false;
  catalog = signal<ItemCatalogEntry[]>([]);
  searchText = signal('');
  addingItemId = signal<number | null>(null);

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

  addFromCatalog(item: ItemCatalogEntry): void {
    if (this.addingItemId()) return;
    this.addingItemId.set(item.id_item);
    this.inventoryService.addItem(this.idPlayerSession, item.id_item).subscribe({
      next: (added) => {
        this.upsertLocalItem(added);
        this.addingItemId.set(null);
        this.mode.set('items');
      },
      error: () => this.addingItemId.set(null),
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
