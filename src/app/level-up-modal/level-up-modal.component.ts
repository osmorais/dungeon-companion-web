import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal,
  computed,
} from '@angular/core';
import { forkJoin } from 'rxjs';
import { CharacterService } from '../services/character.service';
import { PixelNumericDieComponent } from '../pixel-numeric-die/pixel-numeric-die.component';
import { Spell } from '../models/character-options.interface';
import { CLASS_SPELLS } from '../constants/spell-rules';
import {
  AsiOrFeatChoice,
  LevelUpPreview,
  LevelUpResult,
  STAT_KEYS,
  StatKeyEn,
} from '../models/level-up.interface';

const ASI_TOTAL_POINTS = 2;
const ASI_MAX_PER_STAT = 2;

type FixedStepId = 'hp' | 'subclass' | 'cantrips' | 'traits' | 'asi' | 'summary';
/** Uma página por círculo de magia (`spells-1`, `spells-2`...) — truques (círculo 0) usam a
 *  página fixa `cantrips` em vez disso, já que só existe um círculo de truque. */
type LevelUpStepId = FixedStepId | `spells-${number}`;

const STEP_LABELS: Record<FixedStepId, string> = {
  hp: 'VIDA',
  subclass: 'SUBCLASSE',
  cantrips: 'TRUQUES',
  traits: 'TRAÇOS',
  asi: 'MELHORIA',
  summary: 'RESUMO',
};

@Component({
  selector: 'app-level-up-modal',
  standalone: true,
  imports: [PixelNumericDieComponent, NgTemplateOutlet],
  templateUrl: './level-up-modal.component.html',
  styleUrls: ['./level-up-modal.component.scss'],
})
export class LevelUpModalComponent implements OnInit {
  private characterService = inject(CharacterService);

  @Input({ required: true }) idCharacter!: number;
  @Output() closed = new EventEmitter<void>();
  @Output() leveledUp = new EventEmitter<LevelUpResult>();

  readonly statKeys = STAT_KEYS;

  loading = signal(true);
  preview = signal<LevelUpPreview | null>(null);
  error = signal<string | null>(null);
  confirming = signal(false);

  /** ========================= NAVEGAÇÃO ENTRE PÁGINAS ========================= */

  currentStepIndex = signal(0);

  steps = computed<LevelUpStepId[]>(() => {
    const p = this.preview();
    if (!p) return ['hp', 'summary'];
    const list: LevelUpStepId[] = ['hp'];
    if (p.subclass_options) list.push('subclass');
    if ((p.spell_choices?.cantrips_gained ?? 0) > 0) list.push('cantrips');
    list.push(...this.spellCirclePages());
    if (p.new_features.length > 0 || p.is_subclass_feature_level) list.push('traits');
    if (p.is_asi_level) list.push('asi');
    list.push('summary');
    return list;
  });

  currentStep = computed<LevelUpStepId>(() => this.steps()[this.currentStepIndex()] ?? 'summary');

  /** Uma página por círculo com magias novas disponíveis pra escolher (nunca o círculo 0 — truques têm sua própria página). */
  private spellCirclePages(): LevelUpStepId[] {
    const sc = this.preview()?.spell_choices;
    if (!sc) return [];
    if (this.isPerCircleMode()) {
      return this.perCircleEntries()
        .filter((e) => this.spellsForCircle(e.circle).length > 0)
        .map((e) => `spells-${e.circle}` as const);
    }
    if (sc.spells_gained > 0) {
      return this.sharedPoolCircles()
        .filter((c) => c > 0 && this.spellsForCircle(c).length > 0)
        .map((c) => `spells-${c}` as const);
    }
    return [];
  }

  /** Número do círculo se a página atual for uma página de magia por círculo; `null` caso contrário. */
  currentSpellCircle = computed<number | null>(() => {
    const match = /^spells-(\d+)$/.exec(this.currentStep());
    return match ? Number(match[1]) : null;
  });

  stepLabel(step: LevelUpStepId): string {
    const match = /^spells-(\d+)$/.exec(step);
    if (match) return `MAGIAS — ${match[1]}º CÍRCULO`;
    return STEP_LABELS[step as FixedStepId] ?? '';
  }

  circleLimitFor(circle: number): number {
    return this.perCircleEntries().find((e) => e.circle === circle)?.limit ?? 0;
  }

  canGoNext = computed(() => {
    switch (this.currentStep()) {
      case 'hp':
        return this.hitDieRoll() !== null;
      case 'subclass':
        return this.selectedSubclassId() !== null;
      case 'asi':
        return this.isAsiChoiceValid();
      case 'summary':
        return this.readyToConfirm();
      default:
        return true;
    }
  });

  goNext(): void {
    if (!this.canGoNext()) return;
    if (this.currentStep() === 'summary') {
      this.confirm();
      return;
    }
    this.currentStepIndex.update((i) => Math.min(i + 1, this.steps().length - 1));
  }

  goBack(): void {
    this.currentStepIndex.update((i) => Math.max(i - 1, 0));
  }

  /** ========================= ROLAGEM DE VIDA (JOGADOR) ========================= */

  hitDieRoll = signal<number | null>(null);
  rollingHitDie = signal(false);

  rollHp(): void {
    if (this.hitDieRoll() !== null || this.rollingHitDie()) return;
    this.rollingHitDie.set(true);
    this.characterService.rollLevelUpHitDie(this.idCharacter).subscribe({
      next: (result) => {
        this.hitDieRoll.set(result.hit_die_roll);
        this.rollingHitDie.set(false);
      },
      error: () => {
        this.rollingHitDie.set(false);
        this.error.set('Não foi possível rolar o dado de vida. Tente novamente.');
      },
    });
  }

  hpGained = computed<number | null>(() => {
    const p = this.preview();
    const roll = this.hitDieRoll();
    if (!p || roll === null) return null;
    return roll + p.con_modifier + p.hp_bonus_per_level;
  });

  /** ========================= SUBCLASSE ========================= */

  selectedSubclassId = signal<string | null>(null);
  loadingSubclassPreview = signal(false);
  private expandedSubclassIds = signal<Set<string>>(new Set());

  isSubclassExpanded(idSubclass: string): boolean {
    return this.expandedSubclassIds().has(idSubclass);
  }

  toggleSubclassDetails(idSubclass: string): void {
    this.expandedSubclassIds.update((current) => {
      const next = new Set(current);
      if (next.has(idSubclass)) next.delete(idSubclass);
      else next.add(idSubclass);
      return next;
    });
  }

  /**
   * Escolher a subclasse pode mudar o que esse nível concede (ex: Cavaleiro Arcano ganha
   * conjuração no mesmo nível em que é escolhido) — por isso a prévia é recalculada no servidor
   * com a escolha em mãos, em vez de só guardar o id localmente.
   */
  selectSubclass(idSubclass: string): void {
    if (this.selectedSubclassId() === idSubclass || this.loadingSubclassPreview()) return;
    this.loadingSubclassPreview.set(true);
    this.characterService.previewLevelUp(this.idCharacter, idSubclass).subscribe({
      next: (preview) => {
        this.selectedSubclassId.set(idSubclass);
        this.preview.set(preview);
        this.selectedSpellIds.set(new Set());
        this.loadingSubclassPreview.set(false);
      },
      error: () => {
        this.loadingSubclassPreview.set(false);
        this.error.set('Não foi possível calcular a prévia dessa subclasse. Tente novamente.');
      },
    });
  }

  selectedSubclassName = computed(
    () =>
      this.preview()?.subclass_options?.find((s) => s.id_subclass === this.selectedSubclassId())
        ?.display_name ?? '',
  );

  /** ========================= ASI / FEAT ========================= */

  asiMode = signal<'asi' | 'feat' | null>(null);
  asiAllocation = signal<Partial<Record<StatKeyEn, number>>>({});
  selectedFeatId = signal<string | null>(null);

  totalAsiPoints = computed(() =>
    Object.values(this.asiAllocation()).reduce((sum, v) => sum + (v ?? 0), 0),
  );

  private isAsiChoiceValid(): boolean {
    if (this.asiMode() === 'asi') return this.totalAsiPoints() === ASI_TOTAL_POINTS;
    if (this.asiMode() === 'feat') return !!this.selectedFeatId();
    return false;
  }

  asiIncreaseEntries = computed(() =>
    Object.entries(this.asiAllocation())
      .filter((entry): entry is [string, number] => (entry[1] ?? 0) > 0)
      .map(([stat, amount]) => ({ stat, amount })),
  );

  selectedFeatName = computed(
    () =>
      this.preview()?.feat_options.find((f) => f.id_feat === this.selectedFeatId())?.display_name ??
      '',
  );

  readyToConfirm = computed(() => {
    const p = this.preview();
    if (!p || this.confirming()) return false;
    if (this.hitDieRoll() === null) return false;
    if (p.subclass_options && !this.selectedSubclassId()) return false;
    if (p.is_asi_level && !this.isAsiChoiceValid()) return false;
    return true;
  });

  /** ========================= MAGIAS/TRUQUES NOVOS ========================= */

  private spellCatalog = signal<Spell[]>([]);
  selectedSpellIds = signal<Set<number>>(new Set());

  private spellCatalogById = computed(
    () => new Map(this.spellCatalog().map((s) => [s.id_spell, s])),
  );

  /** Normalmente as magias elegíveis vêm da própria classe; quando a subclasse concede
   *  conjuração (ex: Cavaleiro Arcano), o pool vem de outra classe (Mago) e filtrado por escola. */
  private classSpellIds = computed(() => {
    const p = this.preview();
    const subclassCasting = p?.subclass_spellcasting;
    if (!subclassCasting) return new Set(CLASS_SPELLS[p?.id_class ?? -1] ?? []);

    const pool = new Set(CLASS_SPELLS[subclassCasting.spell_list_class_id] ?? []);
    if (subclassCasting.allowed_schools.length === 0) return pool;
    return new Set(
      this.spellCatalog()
        .filter(
          (s) => pool.has(s.id_spell) && subclassCasting.allowed_schools.includes(s.school ?? ''),
        )
        .map((s) => s.id_spell),
    );
  });

  /** Magias da classe ainda não conhecidas pelo personagem, agrupadas por círculo (0 = truque). */
  availableSpellsByCircle = computed<Map<number, Spell[]>>(() => {
    const preview = this.preview();
    const classIds = this.classSpellIds();
    const known = new Set(preview?.spell_choices?.already_known_spell_ids ?? []);
    const map = new Map<number, Spell[]>();
    for (const spell of this.spellCatalog()) {
      if (!classIds.has(spell.id_spell) || known.has(spell.id_spell)) continue;
      const list = map.get(spell.spellLevel) ?? [];
      list.push(spell);
      map.set(spell.spellLevel, list);
    }
    return map;
  });

  isPerCircleMode = computed(
    () => Object.keys(this.preview()?.spell_choices?.spells_gained_by_circle ?? {}).length > 0,
  );

  perCircleEntries = computed(() => {
    const byCircle = this.preview()?.spell_choices?.spells_gained_by_circle ?? {};
    return Object.entries(byCircle)
      .map(([key, limit]) => ({ circle: parseInt(key.replace('level_', ''), 10), limit }))
      .sort((a, b) => a.circle - b.circle);
  });

  /** Círculos acessíveis pro pool livre (Bardo/Bruxo/Feiticeiro/Ranger/Mago) — qualquer um com espaço no novo nível. */
  sharedPoolCircles = computed<number[]>(() => {
    const slots = this.preview()?.spell_slots_total ?? {};
    return Object.keys(slots)
      .map((key) => parseInt(key.replace('level_', ''), 10))
      .sort((a, b) => a - b);
  });

  selectedCantripCount = computed(() => this.selectedCountForCircle(0));

  selectedSharedPoolCount = computed(
    () =>
      [...this.selectedSpellIds()].filter(
        (id) => (this.spellCatalogById().get(id)?.spellLevel ?? 0) > 0,
      ).length,
  );

  selectedSpellNames = computed<string[]>(() =>
    [...this.selectedSpellIds()]
      .map((id) => this.spellCatalogById().get(id)?.name)
      .filter((name): name is string => !!name),
  );

  ngOnInit(): void {
    forkJoin({
      preview: this.characterService.previewLevelUp(this.idCharacter),
      options: this.characterService.getCharacterOptions(),
    }).subscribe({
      next: ({ preview, options }) => {
        this.preview.set(preview);
        this.spellCatalog.set(options.spells ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível calcular a prévia do novo nível.');
        this.loading.set(false);
      },
    });
  }

  close(): void {
    if (this.confirming()) return;
    this.closed.emit();
  }

  selectAsiMode(mode: 'asi' | 'feat'): void {
    this.asiMode.set(mode);
  }

  canIncrementAsi(stat: StatKeyEn): boolean {
    if (this.totalAsiPoints() >= ASI_TOTAL_POINTS) return false;
    return (this.asiAllocation()[stat] ?? 0) < ASI_MAX_PER_STAT;
  }

  incrementAsi(stat: StatKeyEn): void {
    if (!this.canIncrementAsi(stat)) return;
    this.asiAllocation.update((current) => ({ ...current, [stat]: (current[stat] ?? 0) + 1 }));
  }

  resetAsi(): void {
    this.asiAllocation.set({});
  }

  abs(value: number): number {
    return Math.abs(value);
  }

  resourceEntries(resources: Record<string, string>): { key: string; value: string }[] {
    return Object.entries(resources).map(([key, value]) => ({ key, value }));
  }

  spellSlotLabel(key: string): string {
    const level = key.replace('level_', '');
    return `${level}º círculo`;
  }

  slotEntries(slots: Record<string, number>): { key: string; label: string; value: number }[] {
    return Object.entries(slots).map(([key, value]) => ({
      key,
      label: this.spellSlotLabel(key),
      value,
    }));
  }

  selectedCountForCircle(circle: number): number {
    return [...this.selectedSpellIds()].filter(
      (id) => this.spellCatalogById().get(id)?.spellLevel === circle,
    ).length;
  }

  spellsForCircle(circle: number): Spell[] {
    return this.availableSpellsByCircle().get(circle) ?? [];
  }

  isSpellSelected(idSpell: number): boolean {
    return this.selectedSpellIds().has(idSpell);
  }

  /** `circle` é redundante com `spell.spellLevel`, mas evita reler o catálogo pra achar o limite certo. */
  canToggleSpell(spell: Spell, circle: number): boolean {
    if (this.isSpellSelected(spell.id_spell)) return true;

    const choices = this.preview()?.spell_choices;
    if (!choices) return false;

    if (circle === 0) return this.selectedCantripCount() < choices.cantrips_gained;
    if (this.isPerCircleMode()) {
      const limit = choices.spells_gained_by_circle[`level_${circle}`] ?? 0;
      return this.selectedCountForCircle(circle) < limit;
    }
    return this.selectedSharedPoolCount() < choices.spells_gained;
  }

  toggleSpell(spell: Spell, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedSpellIds.update((current) => {
      const next = new Set(current);
      if (checked) next.add(spell.id_spell);
      else next.delete(spell.id_spell);
      return next;
    });
  }

  /** ========================= DETALHES DA MAGIA (COLLAPSE) ========================= */

  private expandedSpellIds = signal<Set<number>>(new Set());

  isSpellExpanded(idSpell: number): boolean {
    return this.expandedSpellIds().has(idSpell);
  }

  toggleSpellDetails(idSpell: number): void {
    this.expandedSpellIds.update((current) => {
      const next = new Set(current);
      if (next.has(idSpell)) next.delete(idSpell);
      else next.add(idSpell);
      return next;
    });
  }

  confirm(): void {
    const preview = this.preview();
    const hitDieRoll = this.hitDieRoll();
    if (!preview || hitDieRoll === null || !this.readyToConfirm()) return;

    let asiOrFeat: AsiOrFeatChoice | undefined;
    if (preview.is_asi_level) {
      if (this.asiMode() === 'asi') {
        asiOrFeat = { type: 'asi', increases: this.asiAllocation() };
      } else if (this.asiMode() === 'feat' && this.selectedFeatId()) {
        asiOrFeat = { type: 'feat', feat_id: this.selectedFeatId()! };
      }
    }

    this.confirming.set(true);
    this.error.set(null);
    this.characterService
      .confirmLevelUp(this.idCharacter, {
        hit_die_roll: hitDieRoll,
        asi_or_feat: asiOrFeat,
        new_spell_ids: [...this.selectedSpellIds()],
        id_subclass: preview.subclass_options
          ? (this.selectedSubclassId() ?? undefined)
          : undefined,
      })
      .subscribe({
        next: (result) => {
          this.confirming.set(false);
          this.leveledUp.emit(result);
        },
        error: () => {
          this.confirming.set(false);
          this.error.set('Não foi possível aplicar o novo nível. Tente novamente.');
        },
      });
  }
}
