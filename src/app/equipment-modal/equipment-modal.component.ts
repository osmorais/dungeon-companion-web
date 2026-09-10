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
import { CharacterService } from '../services/character.service';
import { Armour } from '../models/character-options.interface';
import { CLASS_ARMOUR_RULES } from '../constants/armour-rules';

export interface EquipmentSaved {
  armor_class: number;
  equipped_armour: { id_armour: number; name: string; armour_type: string | null } | null;
  has_shield: boolean;
}

@Component({
  selector: 'app-equipment-modal',
  standalone: true,
  templateUrl: './equipment-modal.component.html',
  styleUrls: ['./equipment-modal.component.scss'],
})
export class EquipmentModalComponent implements OnInit {
  private characterService = inject(CharacterService);

  @Input({ required: true }) idCharacter!: number;
  @Input({ required: true }) idClass!: number;
  @Input() currentArmourId: number | null = null;
  @Input() currentHasShield = false;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<EquipmentSaved>();

  loading = signal(true);
  error = signal<string | null>(null);
  saving = signal(false);

  private armourCatalog = signal<Armour[]>([]);
  selectedArmourId = signal<number | null>(null);
  shieldEquipped = signal(false);

  armourRule = computed(() => CLASS_ARMOUR_RULES[this.idClass] ?? { types: [], shield: false });

  availableArmours = computed<Armour[]>(() => {
    const allowedTypes = this.armourRule().types;
    return this.armourCatalog().filter(
      (a) => !!a.armour_type && allowedTypes.includes(a.armour_type),
    );
  });

  canEquipShield = computed(() => this.armourRule().shield);

  ngOnInit(): void {
    this.selectedArmourId.set(this.currentArmourId);
    this.shieldEquipped.set(this.currentHasShield);
    this.characterService.getCharacterOptions().subscribe({
      next: (options) => {
        this.armourCatalog.set(options.armours ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar o catálogo de armaduras.');
        this.loading.set(false);
      },
    });
  }

  close(): void {
    if (this.saving()) return;
    this.closed.emit();
  }

  selectArmour(idArmour: number | null): void {
    this.selectedArmourId.set(idArmour);
  }

  toggleShield(event: Event): void {
    this.shieldEquipped.set((event.target as HTMLInputElement).checked);
  }

  save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    this.characterService
      .updateEquipment(this.idCharacter, {
        id_armour: this.selectedArmourId(),
        has_shield: this.canEquipShield() ? this.shieldEquipped() : false,
      })
      .subscribe({
        next: (result) => {
          this.saving.set(false);
          const armour = this.armourCatalog().find((a) => a.id_armour === this.selectedArmourId());
          this.saved.emit({
            armor_class: result.armor_class,
            equipped_armour: armour
              ? { id_armour: armour.id_armour, name: armour.name, armour_type: armour.armour_type }
              : null,
            has_shield: this.canEquipShield() ? this.shieldEquipped() : false,
          });
        },
        error: () => {
          this.saving.set(false);
          this.error.set('Não foi possível salvar o equipamento. Tente novamente.');
        },
      });
  }
}
