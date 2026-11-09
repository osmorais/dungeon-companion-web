import { computed, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedList } from '../models/friend.interface';
import { FRIENDS_PAGE_SIZE, totalPages } from './friends-page';

/** Uma lista paginada da tela (amigos, recebidas, enviadas, busca, bloqueados). */
export class PagedState<T> {
  items = signal<T[]>([]);
  page = signal(1);
  total = signal(0);
  loading = signal(false);
  error = signal(false);
  pages = computed(() => totalPages(this.total(), FRIENDS_PAGE_SIZE));
  hasPrev = computed(() => this.page() > 1);
  hasNext = computed(() => this.page() < this.pages());

  /** Filtro, paginação e socket disparam em paralelo: só a resposta da chamada mais nova vale. */
  private latestRequest = 0;

  constructor(private fetch: (page: number) => Observable<PagedList<T>>) {}

  load(page = this.page()): void {
    const request = ++this.latestRequest;
    this.page.set(page);
    this.loading.set(true);
    this.error.set(false);
    this.fetch(page).subscribe({
      next: (res) => {
        if (request !== this.latestRequest) return;
        // Os itens desta página saíram enquanto ela estava aberta: a API devolve vazio e total 0.
        if (!res.items.length && page > 1) {
          this.load(page - 1);
          return;
        }
        this.items.set(res.items);
        this.total.set(res.total_count);
        this.loading.set(false);
      },
      error: () => {
        if (request !== this.latestRequest) return;
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  prev(): void {
    if (this.hasPrev()) this.load(this.page() - 1);
  }

  next(): void {
    if (this.hasNext()) this.load(this.page() + 1);
  }

  /** Troca um item no lugar (ex.: presença de um amigo mudou), sem recarregar. */
  patch(match: (item: T) => boolean, change: (item: T) => T): void {
    this.items.update((list) => list.map((item) => (match(item) ? change(item) : item)));
  }

  /** Tira o item da lista já no clique. Devolve como desfazer, se a ação falhar. */
  removeNow(match: (item: T) => boolean): () => void {
    const index = this.items().findIndex(match);
    if (index < 0) return () => undefined;
    const item = this.items()[index];
    this.items.update((list) => list.filter((i) => i !== item));
    this.total.update((n) => Math.max(0, n - 1));
    return () => {
      if (this.items().some(match)) return;
      this.items.update((list) => [...list.slice(0, index), item, ...list.slice(index)]);
      this.total.update((n) => n + 1);
    };
  }
}
