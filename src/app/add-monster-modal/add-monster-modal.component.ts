import { Component, EventEmitter, Input, OnInit, Output, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameSessionService } from '../services/game-session.service';
import { MonsterCatalogService } from '../services/monster-catalog.service';
import {
  MonsterCatalogEntry,
  SrdMonsterDetail,
  SrdMonsterSummary,
} from '../models/monster-catalog.interface';

type AddMonsterMode = 'catalog' | 'new';

@Component({
  selector: 'app-add-monster-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './add-monster-modal.component.html',
  styleUrls: ['./add-monster-modal.component.scss'],
})
export class AddMonsterModalComponent implements OnInit {
  private gameSessionService = inject(GameSessionService);
  private monsterCatalogService = inject(MonsterCatalogService);

  @Input({ required: true }) sessionId!: string;
  @Output() closed = new EventEmitter<void>();

  mode = signal<AddMonsterMode>('catalog');

  // --- Modo "bestiário" ---
  loadingCatalog = signal(true);
  catalogError = signal(false);
  catalog = signal<MonsterCatalogEntry[]>([]);
  addingCatalogId = signal<string | null>(null);

  // --- Modo "catalogar agora" ---
  loadingSrdList = signal(false);
  srdListError = signal(false);
  srdListLoaded = signal(false);
  allSrdMonsters = signal<SrdMonsterSummary[]>([]);
  searchText = signal('');

  filteredSrdMonsters = computed(() => {
    const term = this.searchText().trim().toLowerCase();
    const all = this.allSrdMonsters();
    if (!term) return all;
    return all.filter(m => m.name.toLowerCase().includes(term));
  });

  selectedSlug = signal<string | null>(null);
  loadingDetail = signal(false);
  detailError = signal(false);
  selectedDetail = signal<SrdMonsterDetail | null>(null);
  customName = signal('');

  submitting = signal(false);
  submitError = signal<string | null>(null);

  ngOnInit() {
    this.loadCatalog();
  }

  setMode(mode: AddMonsterMode) {
    this.mode.set(mode);
    this.submitError.set(null);
    if (mode === 'new' && !this.srdListLoaded()) {
      this.loadSrdList();
    }
  }

  private loadCatalog() {
    this.loadingCatalog.set(true);
    this.catalogError.set(false);
    this.monsterCatalogService.getCatalog(1, 50).subscribe({
      next: res => {
        this.catalog.set(res.MonsterCatalogPagedList);
        this.loadingCatalog.set(false);
      },
      error: () => {
        this.catalogError.set(true);
        this.loadingCatalog.set(false);
      },
    });
  }

  private loadSrdList() {
    this.loadingSrdList.set(true);
    this.srdListError.set(false);
    this.monsterCatalogService.searchSrdMonsters().subscribe({
      next: monsters => {
        this.allSrdMonsters.set(monsters);
        this.srdListLoaded.set(true);
        this.loadingSrdList.set(false);
      },
      error: () => {
        this.srdListError.set(true);
        this.loadingSrdList.set(false);
      },
    });
  }

  monsterName(monster: MonsterCatalogEntry): string {
    return monster.custom_name ?? monster.data_snapshot.name;
  }

  addFromCatalog(monster: MonsterCatalogEntry) {
    if (this.addingCatalogId()) return;
    this.addingCatalogId.set(monster.id_monster_catalog);
    this.gameSessionService
      .addMonsterToSession(this.sessionId, { id_monster_catalog: monster.id_monster_catalog })
      .subscribe({
        next: () => this.closed.emit(),
        error: () => this.addingCatalogId.set(null),
      });
  }

  selectSrdMonster(monster: SrdMonsterSummary) {
    this.selectedSlug.set(monster.index);
    this.selectedDetail.set(null);
    this.detailError.set(false);
    this.customName.set('');
    this.submitError.set(null);
    this.loadingDetail.set(true);
    this.monsterCatalogService.getSrdMonster(monster.index).subscribe({
      next: detail => {
        this.selectedDetail.set(detail);
        this.loadingDetail.set(false);
      },
      error: () => {
        this.detailError.set(true);
        this.loadingDetail.set(false);
      },
    });
  }

  acValue(detail: SrdMonsterDetail): number | null {
    return detail.armor_class?.[0]?.value ?? null;
  }

  confirmNew() {
    const slug = this.selectedSlug();
    if (!slug || this.submitting()) return;
    this.submitting.set(true);
    this.submitError.set(null);
    const name = this.customName().trim();
    this.gameSessionService
      .addMonsterToSession(this.sessionId, { monster_api_slug: slug, custom_name: name || undefined })
      .subscribe({
        next: () => this.closed.emit(),
        error: () => {
          this.submitting.set(false);
          this.submitError.set('Não foi possível adicionar esse monstro. Tente novamente.');
        },
      });
  }

  close() {
    this.closed.emit();
  }
}
