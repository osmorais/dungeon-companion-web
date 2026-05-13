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
}
