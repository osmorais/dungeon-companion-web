import { Component, EventEmitter, Input, OnInit, Output, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameSessionService } from '../services/game-session.service';
import { MonsterCatalogService } from '../services/monster-catalog.service';
import {
  MonsterCatalogEntry,
  BestiaryMonsterSummary,
  MonsterStatBlock,
} from '../models/monster-catalog.interface';
import { challengeRatingText, normalizeSearch } from '../services/monster-format';
import { SkeletonRowsComponent } from '../skeleton/skeleton-rows.component';

type AddMonsterMode = 'catalog' | 'new';

@Component({
  selector: 'app-add-monster-modal',
  standalone: true,
  imports: [FormsModule, SkeletonRowsComponent],
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
  loadingBestiary = signal(false);
  bestiaryError = signal(false);
  bestiaryLoaded = signal(false);
  allBestiaryMonsters = signal<BestiaryMonsterSummary[]>([]);
  searchText = signal('');

  filteredBestiaryMonsters = computed(() => {
    const term = normalizeSearch(this.searchText());
    const all = this.allBestiaryMonsters();
    if (!term) return all;
    return all.filter(m => normalizeSearch(m.name).includes(term));
  });

  selectedSlug = signal<string | null>(null);
  loadingDetail = signal(false);
  detailError = signal(false);
  selectedDetail = signal<MonsterStatBlock | null>(null);
  customName = signal('');

  submitting = signal(false);
  submitError = signal<string | null>(null);

  ngOnInit() {
    this.loadCatalog();
  }

  setMode(mode: AddMonsterMode) {
    this.mode.set(mode);
    this.submitError.set(null);
    if (mode === 'new' && !this.bestiaryLoaded()) {
      this.loadBestiary();
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

  private loadBestiary() {
    this.loadingBestiary.set(true);
    this.bestiaryError.set(false);
    this.monsterCatalogService.listBestiary().subscribe({
      next: monsters => {
        this.allBestiaryMonsters.set(monsters);
        this.bestiaryLoaded.set(true);
        this.loadingBestiary.set(false);
      },
      error: () => {
        this.bestiaryError.set(true);
        this.loadingBestiary.set(false);
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

  selectBestiaryMonster(monster: BestiaryMonsterSummary) {
    this.selectedSlug.set(monster.index);
    this.selectedDetail.set(null);
    this.detailError.set(false);
    this.customName.set('');
    this.submitError.set(null);
    this.loadingDetail.set(true);
    this.monsterCatalogService.getBestiaryMonster(monster.index).subscribe({
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

  acValue(detail: MonsterStatBlock): number | null {
    return detail.armor_class?.[0]?.value ?? null;
  }

  crText = challengeRatingText;

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
