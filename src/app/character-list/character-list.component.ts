import { Component, inject, OnInit, signal, computed, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CharacterService } from '../services/character.service';
import { CharacterSummary } from '../models/character-summary.interface';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-character-list',
  standalone: true,
  templateUrl: './character-list.component.html',
  styleUrls: ['./character-list.component.scss'],
})
export class CharacterListComponent implements OnInit {
  private router = inject(Router);
  private charService = inject(CharacterService);

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  characters = signal<CharacterSummary[]>([]);
  error = signal(false);
  page = signal(1);
  totalCount = signal(0);
  pageSize = PAGE_SIZE;

  deleteTarget = signal<CharacterSummary | null>(null);
  deleting = signal(false);
  deleteError = signal<string | null>(null);

  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize) || 1);
  hasPrev = computed(() => this.page() > 1);
  hasNext = computed(() => this.page() < this.totalPages());

  ngOnInit() {
    this.loadPage();
  }

  loadPage() {
    this.error.set(false);
    this.charService.getCharacters(this.page(), this.pageSize).subscribe({
      next: res => {
        this.characters.set(res.CharacterPagedList);
        this.totalCount.set(res.total_count);
      },
      error: () => this.error.set(true),
    });
  }

  prevPage() {
    if (this.hasPrev()) {
      this.page.update(p => p - 1);
      this.loadPage();
    }
  }

  nextPage() {
    if (this.hasNext()) {
      this.page.update(p => p + 1);
      this.loadPage();
    }
  }

  openSheet(id: number) {
    this.router.navigate(['/character-sheet', id]);
  }

  goBack() {
    this.router.navigate(['/']);
  }

  requestDelete(char: CharacterSummary, event: Event) {
    event.stopPropagation();
    this.deleteError.set(null);
    this.deleteTarget.set(char);
  }

  cancelDelete() {
    if (this.deleting()) return;
    this.deleteTarget.set(null);
  }

  confirmDelete() {
    const target = this.deleteTarget();
    if (!target || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set(null);
    this.charService.deleteCharacter(target.id_character).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        // Se era o único personagem da página atual e ainda existem páginas anteriores,
        // volta uma página em vez de recarregar uma página vazia.
        if (this.characters().length === 1 && this.hasPrev()) {
          this.page.update(p => p - 1);
        }
        this.loadPage();
      },
      error: () => {
        this.deleting.set(false);
        this.deleteError.set('Não foi possível remover o personagem. Tente novamente.');
      },
    });
  }
}
