import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CharacterService } from '../services/character.service';
import { SecretRollCheck } from '../models/game-session.interface';
import {
  CharacterSheetResponse,
  CombatFeatures,
  ResourceTracker,
  SaveContext,
} from '../models/character-response.interface';
import { AbilityRollConfig, RollModalComponent } from '../roll-modal/roll-modal.component';
import { ATTRIBUTE_PT_TO_EN, SAVE_CONTEXT_LABELS, d20Options } from '../roll-modal/d20-options';
import { secretCheckModifier } from './secret-roll-checks';
import { MonsterStatBlock } from '../models/monster-catalog.interface';
import { monsterChecks } from '../monster-actions/monster-actions';

/** Atributo do pedido (inglês) → sigla da ficha do monstro. */
const SAVE_ABBR = {
  STR: 'FOR',
  DEX: 'DES',
  CON: 'CON',
  INT: 'INT',
  WIS: 'SAB',
  CHA: 'CAR',
} as const;

export interface SecretRollPromptRequest {
  request_id: string;
  /** `null` quando é a resistência de um monstro (o mestre rola, 1.24.2). */
  id_character: number | null;
  id_monster_session?: string | null;
  monster_name?: string | null;
  /** CD — só chega no pedido de monstro (pro mestre). */
  dc?: number | null;
  label: string;
  check: SecretRollCheck;
  /** Teste secreto (padrão) ou resistência pública contra uma magia/ação. */
  secret?: boolean;
  /** Contra o que é a resistência (a CD nunca chega aqui). */
  against?: SaveContext[];
}

/**
 * Jogador recebeu um pedido de rolagem: teste secreto do mestre (vai oculto, só o mestre vê) ou
 * resistência contra a magia/ação de alguém. Abre o modal com o bônus da ficha, as vantagens que
 * valem contra aquilo e o resto do d20 (Indomável, Sortudo, Inspiração). A CD não vem: a API diz
 * se passou ou falhou, e o Indomável só aparece depois de uma falha.
 */
@Component({
  selector: 'app-secret-roll-prompt',
  standalone: true,
  imports: [RollModalComponent],
  templateUrl: './secret-roll-prompt.component.html',
  styleUrls: ['./secret-roll.scss'],
})
export class SecretRollPromptComponent implements OnInit {
  private charService = inject(CharacterService);

  @Input({ required: true }) request!: SecretRollPromptRequest;
  @Input() sessionId: string | undefined;
  /** Ficha do monstro atingido (pedido de monstro, só na tela do mestre). */
  @Input() monster: MonsterStatBlock | null = null;
  @Output() closed = new EventEmitter<void>();

  actorName = signal('Personagem');
  rollConfig = signal<AbilityRollConfig | null>(null);
  loading = signal(true);
  error = signal(false);

  private modifier = 0;
  private features: CombatFeatures | null = null;
  private trackers: ResourceTracker[] = [];
  private skillAbility: string | undefined;

  get isSecret(): boolean {
    return this.request.secret !== false;
  }

  /** Resistência de monstro: o mestre rola com o bônus da ficha do monstro. */
  get isMonster(): boolean {
    return !!this.request.id_monster_session;
  }

  /** "veneno, magia" — sem o "efeito visível", que vale pra quase tudo. */
  get againstText(): string {
    return (this.request.against ?? [])
      .filter((c) => c !== 'visible')
      .map((c) => SAVE_CONTEXT_LABELS[c])
      .join(', ');
  }

  ngOnInit(): void {
    if (this.isMonster || this.request.id_character === null) {
      this.loadMonster();
      return;
    }
    this.charService.getCharacterById(this.request.id_character, true).subscribe({
      next: (sheet) => {
        this.actorName.set(sheet.character_sheet.header.name);
        this.modifier = secretCheckModifier(sheet, this.request.check);
        this.features = sheet.character_sheet.combat_features ?? null;
        this.trackers = sheet.character_sheet.resource_trackers ?? [];
        this.skillAbility = skillAbility(sheet, this.request.check);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  /** Monstro: bônus de resistência da ficha (ou o modificador), sem vantagens de personagem. */
  private loadMonster(): void {
    const check = this.request.check;
    this.actorName.set(this.request.monster_name ?? 'Monstro');
    if (!this.monster || check.kind !== 'save') {
      this.loading.set(false);
      this.error.set(true);
      return;
    }
    const abbr = SAVE_ABBR[check.ability];
    const save = monsterChecks(this.monster).saves.find((s) => s.key === `save:${abbr}`);
    this.modifier = save?.modifier ?? 0;
    this.loading.set(false);
  }

  roll(): void {
    const check = this.request.check;
    const isSave = check.kind === 'save';
    if (this.isMonster) {
      this.rollConfig.set({
        mode: 'ability',
        rollType: 'save',
        label: `Resistência: ${this.request.label.replace(/^Magia: /, '')}`,
        modifier: this.modifier,
      });
      return;
    }
    this.rollConfig.set({
      mode: 'ability',
      rollType: isSave ? 'save' : 'skill',
      label: this.isSecret
        ? `Teste secreto: ${this.request.label}`
        : `Resistência: ${this.request.label.replace(/^Magia: /, '')}`,
      modifier: this.modifier,
      ...d20Options(
        this.features,
        this.trackers,
        isSave ? 'save' : 'check',
        isSave ? check.ability : this.skillAbility,
        // Resistência pedida: o contexto é o do pedido. Perícia: sem contexto.
        isSave ? (this.request.against ?? []) : null,
      ),
    });
  }

  /** Tempo pra ler o PASSOU/FALHOU antes de voltar à tela de lançamento. */
  static readonly RESULT_READ_MS = 2200;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  /** Rolou (e decidiu Sortudo/Indomável, se havia): mostra o resultado e volta pro lançamento. */
  onRolled(): void {
    if (this.closeTimer) return;
    this.closeTimer = setTimeout(
      () => this.closed.emit(),
      SecretRollPromptComponent.RESULT_READ_MS,
    );
  }

  onLuckUsed(): void {
    this.spend('Pontos de Sorte');
  }

  onIndomitableUsed(): void {
    this.spend('Indomável');
  }

  onInspirationUsed(): void {
    if (this.request.id_character === null) return;
    this.charService
      .updateActiveEffects(this.request.id_character, { consume_inspiration: true })
      .subscribe({ error: () => undefined });
  }

  private spend(resource: string): void {
    if (this.request.id_character === null) return;
    this.charService
      .updateResourceUses(this.request.id_character, resource, 1)
      .subscribe({ error: () => undefined });
  }
}

function skillAbility(sheet: CharacterSheetResponse, check: SecretRollCheck): string | undefined {
  if (check.kind !== 'skill') return undefined;
  const skill = sheet.character_sheet.skills.find((s) => s.id_skill === check.id_skill);
  return skill ? ATTRIBUTE_PT_TO_EN[skill.attribute_name] : undefined;
}
