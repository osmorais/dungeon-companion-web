import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { CharacterService, HitDieRollResult } from '../services/character.service';
import { GameSessionService } from '../services/game-session.service';
import {
  ActiveEffects,
  CharacterSheetResponse,
  ClassAbility,
  CombatFeatures,
  ResourceTracker,
} from '../models/character-response.interface';
import { Skill, Spell, WeaponRow } from '../models/character-options.interface';
import {
  abilityAsSpell,
  fixedHealConfig,
  spellRollConfig,
  saveNote,
  spellSaveInfo,
} from '../roll-modal/spell-roll-config';
import { ApplyRequest, ApplyTarget } from '../roll-modal/apply-target';
import {
  isOnHitSpell,
  RiderAttackKind,
  RiderChoices,
  riderChoicesFor,
  RiderOption,
} from '../roll-modal/spell-riders';
import {
  AbilityRollConfig,
  RollConfig,
  RollModalComponent,
  SmiteOption,
} from '../roll-modal/roll-modal.component';

/** id_class do Paladino em rules.ts — único com Destruição Divina. */
const PALADIN_CLASS_ID = 11;
import { attrLabel } from '../models/level-up.interface';
import { SkeletonRowsComponent } from '../skeleton/skeleton-rows.component';
import { GameCardComponent } from '../game-card/game-card.component';
import { CardViewerComponent } from '../game-card/card-viewer.component';
import { CardDeckComponent } from '../game-card/card-deck.component';
import { CardHandComponent, HandCard } from '../game-card/card-hand.component';
import { spellCardState, spellToCard } from '../game-card/spell-card';
import {
  unarmedCardInfo,
  unarmedToCard,
  weaponCardInfo,
  weaponToCard,
} from '../game-card/weapon-card';
import { GameCardData } from '../game-card/game-card.model';
import { WeaponCardInfo } from '../models/game-session.interface';
import { CharacterCardData } from '../character-card/character-card.component';
import { SpellCastContext, castStagePayload, newCastId } from '../spell-cast/spell-cast-context';
import { CastStageView } from '../spell-cast/spell-cast-stage.model';
import { AvatarPreset } from '../models/avatar-preset.interface';
import { AvatarDisplayComponent } from '../avatar-display/avatar-display.component';

/** Atributo da perícia (sigla em português do banco) → chave em inglês dos traços. */
const PT_TO_EN: Record<string, string> = {
  FOR: 'STR',
  DES: 'DEX',
  CON: 'CON',
  INT: 'INT',
  SAB: 'WIS',
  CAR: 'CHA',
};

/** Tempo de conjuração de 1 minuto ou mais ("1 minuto", "10 minutos", "1 hora"…) — não cabe
 *  numa rodada de combate. Ação, ação bônus e reação ficam de fora. */
export function isLongCastingTime(castingTime: string | null | undefined): boolean {
  return /minuto|hora/i.test(castingTime ?? '');
}

@Component({
  selector: 'app-player-actions-modal',
  standalone: true,
  imports: [
    CommonModule,
    KeyValuePipe,
    RollModalComponent,
    SkeletonRowsComponent,
    GameCardComponent,
    CardViewerComponent,
    CardDeckComponent,
    CardHandComponent, AvatarDisplayComponent],
  templateUrl: './player-actions-modal.component.html',
  styleUrls: ['../bottom-drawer/bottom-drawer.scss', './player-actions-modal.component.scss'],
})
export class PlayerActionsModalComponent implements OnInit {
  private charService = inject(CharacterService);
  private gameSessionService = inject(GameSessionService);

  @Input({ required: true }) idCharacter!: number;
  @Input() fallbackName = 'Personagem';
  @Input() sessionId: string | undefined;
  /** Alvos em que o dano/cura rolado pode ser aplicado direto (opcional) — a sessão monta a lista
   *  conforme as permissões (mestre: todos; jogador: só o próprio personagem). */
  @Input() applyTargets: ApplyTarget[] = [];
  /** Vez atual do combate ("<combate>:<rodada>:<participante>") — trava as somas 1×/turno
   *  (Ataque Furtivo…). `null` fora de combate: sem trava. */
  @Input() turnKey: string | null = null;
  /** Combate ativo na sessão — magia de conjuração longa pede confirmação antes de lançar. */
  @Input() inCombat = false;
  /** Outros jogadores da mesa (Inspiração Bárdica escolhe um deles). */
  @Input() allies: { id_player_session: string; name: string }[] = [];
  /** PV ao vivo da sessão (a ficha carregada ao abrir fica velha se alguém aplicar dano depois). */
  @Input() liveHp: { current: number; max: number; temp: number } | null = null;
  /** Vez deste personagem e quem abriu pode encerrar — FINALIZAR (e ATRASAR) no destaque. */
  @Input() canEndTurn = false;
  @Input() canDelay = false;
  /** Abriu sozinha porque começou a vez deste personagem: destaque SUA VEZ no topo, nas ações de
   *  turno e na coluna COMBATE (todas as ações continuam disponíveis). */
  @Input() turnFocus = false;
  @Input() endingTurn = false;
  @Input() delayingTurn = false;
  /** Jogador abrindo o próprio personagem: FICHA e ITENS no destaque (o mestre tem nos cards). */
  @Input() showLinks = false;
  /** Quem abriu pode mudar o PV deste personagem (dono ou mestre): DANO/CURA no destaque. */
  @Input() canAdjustHp = false;
  /** Gravando o PV deste personagem agora (trava os botões). */
  @Input() savingHp = false;
  /** Card do personagem (como na sessão) pro palco do lançamento de magia. Sem ele, monta da ficha. */
  @Input() actorCard: CharacterCardData | null = null;
  /** Lançamento com rolagem começou: quem lança acompanha no modal de rolagem, então a sessão não
   *  mostra pra ele o aviso da mesa desse lançamento. */
  /** Aviso do lançamento montado pelos eventos da mesa (sessão): o palco de quem lança mostra o
   *  mesmo que todos, ao mesmo tempo. */
  @Input() castViewSource: ((castId: string) => CastStageView | null) | null = null;
  @Output() ownCast = new EventEmitter<string>();
  @Output() endTurn = new EventEmitter<void>();
  @Output() delayTurn = new EventEmitter<void>();
  @Output() openSheet = new EventEmitter<void>();
  @Output() openInventory = new EventEmitter<void>();
  @Output() applyToTarget = new EventEmitter<ApplyRequest>();
  /** DANO/CURA no próprio personagem (a sessão aplica: temporários, confirmação de vida extra). */
  @Output() adjustHp = new EventEmitter<{ kind: 'damage' | 'heal'; amount: number }>();
  @Output() closed = new EventEmitter<void>();
  /** Repassa a confirmação de acerto/erro do roll-modal (só dispara no fluxo de ataque com dano) —
   *  a sessão usa isso pra reagir (ex: Tom). */
  @Output() attackResolved = new EventEmitter<boolean>();

  loading = signal(true);
  error = signal(false);
  /** Valor digitado no DANO/CURA do destaque. */
  hpAmount = signal(0);

  setHpAmount(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    this.hpAmount.set(Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : 0);
  }

  /** Aplica no próprio PV e fecha a gaveta (a sessão toca o impacto de dano/cura). */
  submitHp(kind: 'damage' | 'heal', amount = this.hpAmount()): void {
    if (!amount || amount <= 0 || this.savingHp) return;
    this.adjustHp.emit({ kind, amount });
    this.hpAmount.set(0);
    this.close();
  }

  /** Avatar do personagem na barra do topo da gaveta (com o anel). */
  barAvatar(): AvatarPreset | null {
    return this.actorCard?.avatarPreset ?? this.sheet()?.character_sheet.avatar_preset ?? null;
  }

  /** PV atuais (ao vivo da sessão, senão da ficha) pra CURA TOTAL / DANO TOTAL. */
  private currentHp(): { current: number; max: number; temp: number } | null {
    if (this.liveHp) return this.liveHp;
    const hp = this.sheet()?.character_sheet.combat_stats.hit_points;
    return hp ? { current: hp.current, max: hp.max, temp: hp.temporary } : null;
  }

  /** Quanto falta pra encher a vida (0 = já está cheia). */
  get fullHealAmount(): number {
    const hp = this.currentHp();
    return hp ? Math.max(0, hp.max - hp.current) : 0;
  }

  /** Dano que zera a vida, temporários incluídos (0 = já está caído). */
  get fullDamageAmount(): number {
    const hp = this.currentHp();
    return hp ? Math.max(0, hp.current) + Math.max(0, hp.temp) : 0;
  }
  sheet = signal<CharacterSheetResponse | null>(null);
  activeRoll = signal<RollConfig | null>(null);
  /** Lançamento de magia da rolagem aberta (palco da mesa no modal); `null` nas outras rolagens. */
  activeRollCast = signal<SpellCastContext | null>(null);

  expendingSlot = signal(false);
  restingLong = signal(false);
  actionError = signal<string | null>(null);

  ngOnInit(): void {
    this.charService.getCharacterById(this.idCharacter).subscribe({
      next: (sheet) => {
        this.sheet.set(sheet);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  get actorName(): string {
    return this.sheet()?.character_sheet.header.name ?? this.fallbackName;
  }

  close(): void {
    this.closed.emit();
  }

  private handleActionError(err: unknown): void {
    const status = (err as { status?: number } | null)?.status;
    this.actionError.set(
      status === 403
        ? 'Você não tem permissão para fazer isso neste personagem.'
        : 'Não foi possível concluir a ação. Tente novamente.',
    );
  }

  /** ========================= ROLAGENS ========================= */

  /**
   * O que o personagem tem pra mexer num d20: Sortudo (Halfling e talento), Inspiração Bárdica
   * guardada, Indomável (só resistência) e os lembretes de vantagem que valem pra esta rolagem.
   */
  private d20Options(
    kind: 'save' | 'check' | 'attack',
    ability?: string,
  ): Pick<AbilityRollConfig, 'halflingLucky' | 'luckPoints' | 'inspiration' | 'indomitable' | 'reminders'> {
    const features = this.combatFeatures();
    const luck = this.resourceTrackerByKey('Pontos de Sorte');
    const indomitable = this.resourceTrackerByKey('Indomável');
    const inspiration = features?.active_effects.bardic_inspiration ?? null;
    const reminders = (features?.d20_reminders ?? [])
      .filter((r) => r.applies === kind)
      .filter((r) => !r.abilities || (!!ability && (r.abilities as string[]).includes(ability)))
      .map((r) => r.text);
    return {
      halflingLucky: !!features?.halfling_lucky,
      luckPoints: luck ? this.resourceAvailable(luck) : 0,
      inspiration: inspiration ?? undefined,
      indomitable: kind === 'save' && indomitable ? this.resourceAvailable(indomitable) : 0,
      reminders,
    };
  }

  /** Indomável usado no modal: debita o uso (a rolagem segue na tela). */
  onIndomitableUsed(): void {
    this.charService.updateResourceUses(this.idCharacter, 'Indomável', 1).subscribe({
      next: ({ resource_trackers }) => this.patchResourceTrackers(resource_trackers),
      error: (err) => this.handleActionError(err),
    });
  }

  /** Inspiração Bárdica usada: apaga o dado guardado no personagem. */
  onInspirationUsed(): void {
    this.charService.updateActiveEffects(this.idCharacter, { consume_inspiration: true }).subscribe({
      next: ({ active_effects }) => this.patchActiveEffects(active_effects),
      error: (err) => this.handleActionError(err),
    });
  }

  /** Ponto de Sorte gasto no modal: debita o recurso (sem fechar — a rolagem segue na tela). */
  onLuckUsed(): void {
    this.charService.updateResourceUses(this.idCharacter, 'Pontos de Sorte', 1).subscribe({
      next: ({ resource_trackers }) => this.patchResourceTrackers(resource_trackers),
      error: (err) => this.handleActionError(err),
    });
  }

  rollSkill(skill: Skill): void {
    const config: AbilityRollConfig = {
      mode: 'ability',
      rollType: 'skill',
      label: `Perícia: ${skill.name}`,
      modifier: skill.total_skill_value,
      ...this.d20Options('check', PT_TO_EN[skill.attribute_name]),
    };
    this.activeRoll.set(config);
  }

  readonly attrLabel = attrLabel;

  rollSave(attrKey: string, save: number): void {
    const config: AbilityRollConfig = {
      mode: 'ability',
      rollType: 'save',
      label: `Resistência: ${attrLabel(attrKey)}`,
      modifier: save,
      ...this.d20Options('save', attrKey),
    };
    this.activeRoll.set(config);
  }

  /** Se a arma tiver dado de dano cadastrado, o roll-modal pergunta "passou da CA?" e já rola o dano ali mesmo. */
  rollAttack(weapon: WeaponRow): void {
    const match = weapon.damage_die?.match(/^(\d+)d(\d+)$/i);
    this.startWeaponCast(weaponCardInfo(weapon), weaponToCard(weapon));
    this.activeRoll.set(
      this.attackConfig({
        name: weapon.name,
        attackBonus: weapon.attack_bonus,
        dice: match ? { count: parseInt(match[1], 10), sides: parseInt(match[2], 10) } : null,
        damageModifier: weapon.damage_modifier,
        isRanged: weapon.isRanged,
        properties: (weapon.properties ?? '').toLowerCase(),
        damageType: weapon.damage_type,
        smite: this.smiteOptionsFor(weapon),
      }),
    );
  }

  /** Ataque desarmado do Monge (Artes Marciais); `attacks` = 2 na Rajada de Golpes. */
  rollUnarmed(attacks = 1): void {
    const unarmed = this.combatFeatures()?.unarmed;
    if (!unarmed) return;
    const config = this.attackConfig({
      name: unarmed.name,
      attackBonus: unarmed.attack_bonus,
      dice: unarmed.dice,
      damageModifier: unarmed.damage_modifier,
      isRanged: false,
      properties: '',
      damageType: 'contundente',
    });
    if (attacks > 1) config.instances = { count: attacks, label: 'golpe' };
    this.startWeaponCast(unarmedCardInfo(unarmed), unarmedToCard(unarmed));
    this.activeRoll.set(config);
  }

  /**
   * Ataque com arma também vira aviso único da mesa (1.6.1): card do personagem + carta da arma +
   * ataque → acertou/errou → dano, como o lançamento de magia. Só dentro da sessão.
   */
  private startWeaponCast(info: WeaponCardInfo, card: GameCardData): void {
    if (!this.sessionId) return;
    const cast: SpellCastContext = {
      castId: newCastId(),
      idSpell: null,
      weapon: info,
      spellName: info.name,
      actor: this.actorCard ?? this.actorCardFromSheet(),
      card,
      saveDc: null,
      saveAbility: null,
      saveNote: null,
    };
    this.activeRollCast.set(cast);
    this.ownCast.emit(cast.castId);
  }

  combatFeatures(): CombatFeatures | null {
    return this.sheet()?.character_sheet.combat_features ?? null;
  }

  activeEffects(): string[] {
    return this.combatFeatures()?.active_effects.active ?? [];
  }

  /**
   * Ataque com arma (ou desarmado) com os traços do personagem: bônus de ataque dos efeitos
   * ativos (Arma Sagrada), Fúria somada no dano corpo a corpo de Força, ataque poderoso (talento),
   * faixa de crítico, dados extras no crítico corpo a corpo, e as somas no acerto — magias
   * (Bruxaria, Destruições…) e traços (Ataque Furtivo, Golpe Divino…), com as 1×/turno já usadas
   * nesta vez do combate fora da lista.
   */
  private attackConfig(w: {
    name: string;
    attackBonus: number;
    dice: { count: number; sides: number } | null;
    damageModifier: number;
    isRanged: boolean;
    properties: string;
    damageType?: string | null;
    smite?: SmiteOption[];
  }): AbilityRollConfig {
    const features = this.combatFeatures();
    const active = this.activeEffects();
    const melee = !w.isRanged;
    const finesse = w.properties.includes('acuidade');
    const saves = this.sheet()?.character_sheet.attributes_and_saves;
    const usesStr = melee && (!finesse || (saves?.['STR']?.modifier ?? 0) >= (saves?.['DEX']?.modifier ?? 0));

    const attackBonuses = (features?.attack_bonuses ?? []).filter((b) => active.includes(b.requires_active));
    const activeRiders = (features?.riders ?? []).filter(
      (r) => r.requires_active && active.includes(r.requires_active) && this.riderApplies(r.applies, w, usesStr),
    );
    const extraNames = [...attackBonuses.map((b) => b.name), ...activeRiders.map((r) => r.name)];
    const power = (features?.power_attack ?? []).find((p) =>
      p.applies === 'ranged' ? w.isRanged : melee && w.properties.includes('pesada'),
    );

    const spellRiders = this.riderChoices(w.isRanged ? 'ranged_weapon' : 'melee_weapon');
    const traitToggles = (features?.riders ?? [])
      .filter((r) => !r.requires_active && this.riderApplies(r.applies, w, usesStr))
      .filter((r) => !r.once_per_turn || !this.turnKey || features?.active_effects.turn_uses[r.key] !== this.turnKey)
      .map((r) => ({
        key: r.key,
        spellName: r.name,
        dice: r.dice,
        flat: r.flat,
        damageType: r.damage_type,
        oncePerTurn: r.once_per_turn,
      }));

    return {
      mode: 'ability',
      rollType: 'attack',
      label: [`Ataque: ${w.name}`, ...extraNames].join(' + '),
      modifier: w.attackBonus + attackBonuses.reduce((sum, b) => sum + b.bonus, 0),
      critMin: features?.crit_min ?? 20,
      powerAttack: power ? { name: power.name } : undefined,
      ...this.d20Options('attack'),
      damage: w.dice
        ? {
            diceCount: w.dice.count,
            diceSides: w.dice.sides,
            modifier: w.damageModifier + activeRiders.reduce((sum, r) => sum + r.flat, 0),
            label: [`Dano: ${w.name}`, ...activeRiders.map((r) => r.name)].join(' + '),
            damageType: w.damageType ?? null,
            critExtraDice: melee ? (features?.melee_crit_extra_dice ?? 0) : 0,
            smite: w.smite,
            riders: { oneShot: spellRiders.oneShot, persistent: [...spellRiders.persistent, ...traitToggles] },
          }
        : undefined,
    };
  }

  private riderApplies(
    applies: CombatFeatures['riders'][number]['applies'],
    w: { isRanged: boolean; properties: string },
    usesStr: boolean,
  ): boolean {
    if (applies === 'finesse_or_ranged') return w.isRanged || w.properties.includes('acuidade');
    if (applies === 'melee_str') return !w.isRanged && usesStr;
    return true;
  }

  /** Somas 1×/turno usadas neste acerto: trava na vez atual do combate (fora de combate, não trava). */
  onOncePerTurnUsed(keys: string[]): void {
    if (!this.turnKey) return;
    for (const key of keys) {
      this.charService
        .updateActiveEffects(this.idCharacter, { turn_use: key, turn_key: this.turnKey })
        .subscribe({ next: ({ active_effects }) => this.patchActiveEffects(active_effects), error: () => undefined });
    }
  }

  /** Encerra Fúria/Arma Sagrada antes da hora (também acabam no descanso longo e no fim do combate). */
  endEffect(effect: string): void {
    this.charService.updateActiveEffects(this.idCharacter, { effect, active: false }).subscribe({
      next: ({ active_effects }) => this.patchActiveEffects(active_effects),
      error: (err) => this.handleActionError(err),
    });
  }

  private patchActiveEffects(activeEffects: ActiveEffects): void {
    const sheet = this.sheet();
    const features = sheet?.character_sheet.combat_features;
    if (!sheet || !features) return;
    this.sheet.set({
      ...sheet,
      character_sheet: {
        ...sheet.character_sheet,
        combat_features: { ...features, active_effects: activeEffects },
      },
    });
  }

  /** Magias do personagem que podem somar dano neste ataque (Destruições, Bruxaria…). */
  private riderChoices(attack: RiderAttackKind): RiderChoices {
    return riderChoicesFor(
      this.sheet()?.character_sheet.spells ?? [],
      attack,
      (spell) => this.isCastable(spell),
      (slotKey) => this.slotsAvailable(slotKey),
    );
  }

  readonly isOnHitSpell = isOnHitSpell;

  /** O jogador usou uma Destruição no acerto — debita o espaço (sem fechar, o dano ainda está
   *  rolando) e anuncia a magia pra mesa com a CD do efeito extra. */
  onRiderSpellUsed(option: RiderOption): void {
    const level = this.slotLevelNumber(option.slotKey);
    this.charService.updateSpellSlots(this.idCharacter, level, 1).subscribe({
      next: ({ slots_expended }) => this.patchSpellcasting({ slots_expended }),
      error: (err) => this.handleActionError(err),
    });
    if (this.sessionId) {
      this.gameSessionService
        .announceSpellCast(this.sessionId, {
          id_character: this.idCharacter,
          actor_name: this.actorName,
          spell_name: option.spellName,
          ...option.save,
        })
        .subscribe({ error: () => undefined });
    }
  }

  /** Destruição Divina: só Paladino nv2+, ataque corpo a corpo, com espaço de magia disponível. */
  private smiteOptionsFor(weapon: WeaponRow): SmiteOption[] | undefined {
    const sheetData = this.sheet();
    if (!sheetData || weapon.isRanged) return undefined;
    if (sheetData.character_sheet.header.id_class !== PALADIN_CLASS_ID) return undefined;
    if (sheetData.character_sheet.combat_stats.hit_dice_total < 2) return undefined;

    const options = this.slotLevels()
      .map((key) => ({ key, level: this.slotLevelNumber(key) }))
      .filter(({ key }) => this.slotsAvailable(key) > 0)
      .map(({ key, level }) => ({
        slotKey: key,
        levelLabel: `${level}º Nível`,
        bonusDice: Math.min(5, level + 1),
      }));

    return options.length > 0 ? options : undefined;
  }

  /** O jogador escolheu gastar um espaço em Destruição Divina — debita o espaço sem fechar o
   *  modal, já que a rolagem de dano ainda está em andamento no roll-modal. */
  onSmiteUsed(event: { slotKey: string }): void {
    const level = this.slotLevelNumber(event.slotKey);
    this.charService.updateSpellSlots(this.idCharacter, level, 1).subscribe({
      next: ({ slots_expended }) => this.patchSpellcasting({ slots_expended }),
      error: (err) => this.handleActionError(err),
    });
  }

  openFreeformRoll(): void {
    this.activeRoll.set({ mode: 'freeform' });
  }

  closeRoll(): void {
    this.activeRoll.set(null);
    this.activeRollCast.set(null);
  }

  /** Ao executar a rolagem (ação concluída), fecha a rolagem e a própria tela de ações. */
  onRolled(): void {
    this.activeRoll.set(null);
    this.activeRollCast.set(null);
    this.closed.emit();
  }

  formatMod(value: number): string {
    return value >= 0 ? `+${value}` : `${value}`;
  }

  sortedSkills(): Skill[] {
    return [...(this.sheet()?.character_sheet.skills ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR'),
    );
  }

  /** ========================= MAGIAS AGRUPADAS POR CÍRCULO ========================= */

  spellsByCircle(): { circle: number; spells: Spell[] }[] {
    const spells = this.sheet()?.character_sheet.spells ?? [];
    const map = new Map<number, Spell[]>();
    for (const spell of spells) {
      const list = map.get(spell.spellLevel) ?? [];
      list.push(spell);
      map.set(spell.spellLevel, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a - b)
      .map(([circle, list]) => ({
        circle,
        spells: [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      }));
  }

  circleName(circle: number): string {
    return circle === 0 ? 'TRUQUES' : `${circle}º CÍRCULO`;
  }


  /** ========================= GRIMÓRIO (segunda tela da gaveta) ========================= */

  /** Tela da gaveta: ações (padrão) ou grimório. A barra do topo do grimório volta pras ações. */
  view = signal<'actions' | 'grimoire'>('actions');
  /** Aba do grimório: 'ready' (prontas pra lançar) ou o círculo (0 = truques). */
  grimoireTab = signal<'ready' | number>('ready');

  openGrimoire(): void {
    this.grimoireTab.set('ready');
    this.view.set('grimoire');
  }

  backToActions(): void {
    this.view.set('actions');
  }

  /** Abas: PRONTAS (truques + preparadas; quem não prepara vê TODAS) e um por círculo conhecido. */
  grimoireTabs(): { key: 'ready' | number; label: string; count: number }[] {
    const prepares = !!this.sheet()?.character_sheet.spellcasting_info?.prepares_spells;
    const ready = (this.sheet()?.character_sheet.spells ?? []).filter((s) => this.isCastable(s));
    return [
      { key: 'ready' as const, label: prepares ? 'PRONTAS' : 'TODAS', count: ready.length },
      ...this.spellsByCircle().map((g) => ({
        key: g.circle,
        label: g.circle === 0 ? 'TRUQUES' : `${g.circle}º`,
        count: g.spells.length,
      })),
    ];
  }

  /**
   * Cor do card no grimório: `ready` (dá pra lançar agora), `preparable` (não preparada, mas há
   * vaga e não está em combate — tocar PREPARAR libera) ou `locked` (sem vaga ou travada em combate).
   */
  spellCardState(spell: Spell): 'ready' | 'preparable' | 'locked' {
    const prepares = !!this.sheet()?.character_sheet.spellcasting_info?.prepares_spells;
    return spellCardState(spell, prepares, this.canPrepareMore(), this.isInActiveCombat());
  }

  /** Magias da aba escolhida, por círculo e nome. */
  grimoireSpells(): Spell[] {
    const tab = this.grimoireTab();
    if (tab === 'ready') {
      return this.spellsByCircle()
        .flatMap((g) => g.spells)
        .filter((s) => this.isCastable(s));
    }
    return this.spellsByCircle().find((g) => g.circle === tab)?.spells ?? [];
  }

  /** ========================= DETALHE DA MAGIA ========================= */

  /** Magia aberta em carta de tela cheia — guarda o id e lê a magia atual da ficha, pra o
   *  PREPARAR feito na própria carta aparecer na hora. */
  private selectedSpellId = signal<number | null>(null);
  selectedSpellDetail = computed(() => {
    const id = this.selectedSpellId();
    return id === null ? null : (this.sheet()?.character_sheet.spells ?? []).find((s) => s.id_spell === id) ?? null;
  });

  openSpellDetail(spell: Spell): void {
    this.selectedSpellId.set(spell.id_spell);
  }

  closeSpellDetail(): void {
    this.selectedSpellId.set(null);
  }

  /** Cartas das magias da ficha, por id (recalculadas só quando a ficha muda). */
  spellCards = computed(
    () => new Map((this.sheet()?.character_sheet.spells ?? []).map((s) => [s.id_spell, spellToCard(s)])),
  );
  readonly spellToCard = spellToCard;

  /** Cartas das armas da ficha, por id, e a do ataque desarmado (Monge). */
  weaponCards = computed(
    () => new Map((this.sheet()?.character_sheet.weapons ?? []).map((w) => [w.id_weapon, weaponToCard(w)])),
  );
  unarmedCard = computed(() => {
    const unarmed = this.combatFeatures()?.unarmed;
    return unarmed ? unarmedToCard(unarmed) : null;
  });
  /** ========================= A "MÃO" (baralho → cartas em tela cheia) ========================= */

  /** Mão aberta em tela cheia: armas ou magias prontas. */
  activeHand = signal<'weapons' | 'spells' | null>(null);

  /** Armas da ficha + ataque desarmado (Monge), como cartas da mão. Chave: id da arma ou 'unarmed'. */
  weaponHand = computed<HandCard[]>(() => {
    const items: HandCard[] = (this.sheet()?.character_sheet.weapons ?? []).map((w) => ({
      key: String(w.id_weapon),
      card: this.weaponCards().get(w.id_weapon)!,
    }));
    const unarmed = this.unarmedCard();
    if (unarmed) items.push({ key: 'unarmed', card: unarmed });
    return items;
  });
  weaponHandCards = computed(() => this.weaponHand().map((i) => i.card));

  /** Magias prontas pra lançar agora (truques + preparadas; tudo pra quem não prepara). */
  spellHand = computed<HandCard[]>(() =>
    this.spellsByCircle()
      .flatMap((g) => g.spells)
      .filter((s) => this.isCastable(s))
      .map((s) => ({
        key: String(s.id_spell),
        card: this.spellCards().get(s.id_spell) ?? spellToCard(s),
        state: this.spellCardState(s),
      })),
  );
  spellHandCards = computed(() => this.spellHand().map((i) => i.card));

  spellByKey(key: string): Spell | null {
    return (this.sheet()?.character_sheet.spells ?? []).find((s) => String(s.id_spell) === key) ?? null;
  }

  private weaponByKey(key: string): WeaponRow | null {
    return (this.sheet()?.character_sheet.weapons ?? []).find((w) => String(w.id_weapon) === key) ?? null;
  }

  attackBonusByKey(key: string): number {
    if (key === 'unarmed') return this.combatFeatures()?.unarmed?.attack_bonus ?? 0;
    return this.weaponByKey(key)?.attack_bonus ?? 0;
  }

  /** ATACAR na mão: fecha a mão e abre a rolagem do ataque. */
  attackByKey(key: string): void {
    this.activeHand.set(null);
    if (key === 'unarmed') {
      this.rollUnarmed();
      return;
    }
    const weapon = this.weaponByKey(key);
    if (weapon) this.rollAttack(weapon);
  }

  /** Grimório: CARTAS (padrão) ou LISTA compacta. Não é guardado: reabre em CARTAS. */
  grimoireMode = signal<'cards' | 'list'>('cards');

  spellComponents(spell: Spell): string {
    return [spell.is_verbal ? 'V' : '', spell.is_somatic ? 'S' : '', spell.is_material ? 'M' : '']
      .filter(Boolean)
      .join(', ') || '—';
  }

  /** ========================= ESPAÇOS DE MAGIA ========================= */

  slotLevels(): string[] {
    const slots = this.sheet()?.character_sheet.spellcasting_info?.slots_total;
    return slots ? Object.keys(slots).sort() : [];
  }

  slotLevelNumber(key: string): number {
    return parseInt(key.replace('level_', ''), 10);
  }

  slotsTotal(key: string): number {
    return this.sheet()?.character_sheet.spellcasting_info?.slots_total?.[key] ?? 0;
  }

  slotsAvailable(key: string): number {
    const info = this.sheet()?.character_sheet.spellcasting_info;
    const total = info?.slots_total?.[key] ?? 0;
    const expended = info?.slots_expended?.[key] ?? 0;
    return Math.max(0, total - expended);
  }

  pipsFor(key: string): number[] {
    return Array.from({ length: this.slotsTotal(key) }, (_, i) => i);
  }

  /** `closeAfter` fecha o modal ao terminar — usado pelo fluxo de conjurar magia (castSpell), já
   *  que aí a interação acabou. Ajuste manual de espaço (spell-slot-adjust-btn) passa `false`,
   *  pra deixar o jogador continuar ajustando outros níveis sem reabrir a tela. */
  expendSlot(level: number, delta: number, closeAfter = true, onDone?: () => void): void {
    if (this.expendingSlot()) return;
    this.expendingSlot.set(true);
    this.actionError.set(null);
    this.charService.updateSpellSlots(this.idCharacter, level, delta).subscribe({
      next: ({ slots_expended }) => {
        this.patchSpellcasting({ slots_expended });
        this.expendingSlot.set(false);
        onDone?.();
        if (closeAfter) this.closed.emit();
      },
      error: (err) => {
        this.expendingSlot.set(false);
        this.handleActionError(err);
      },
    });
  }

  longRestNow(): void {
    if (this.restingLong()) return;
    this.restingLong.set(true);
    this.actionError.set(null);
    this.charService.longRest(this.idCharacter).subscribe({
      next: ({ slots_expended, current_hit_points, hit_dice_spent }) => {
        this.patchSpellcasting({ slots_expended });
        this.patchCombatStats({ hit_dice_spent }, current_hit_points);
        this.lastHitDieResult.set(null);
        this.restingLong.set(false);
        this.closed.emit();
      },
      error: (err) => {
        this.restingLong.set(false);
        this.handleActionError(err);
      },
    });
  }

  private patchSpellcasting(
    patch: Partial<NonNullable<CharacterSheetResponse['character_sheet']['spellcasting_info']>>,
  ): void {
    const sheet = this.sheet();
    if (!sheet?.character_sheet.spellcasting_info) return;
    this.sheet.set({
      ...sheet,
      character_sheet: {
        ...sheet.character_sheet,
        spellcasting_info: { ...sheet.character_sheet.spellcasting_info, ...patch },
      },
    });
  }

  private patchCombatStats(
    patch: Partial<CharacterSheetResponse['character_sheet']['combat_stats']>,
    currentHp?: number,
  ): void {
    const sheet = this.sheet();
    if (!sheet) return;
    const combat = sheet.character_sheet.combat_stats;
    this.sheet.set({
      ...sheet,
      character_sheet: {
        ...sheet.character_sheet,
        combat_stats: {
          ...combat,
          ...patch,
          hit_points:
            currentHp !== undefined
              ? { ...combat.hit_points, current: currentHp }
              : combat.hit_points,
        },
      },
    });
  }

  /** ========================= RECURSOS CONSUMÍVEIS / HABILIDADES ATIVÁVEIS =========================
   *  Uma classe pode ter mais de um recurso rastreável ao mesmo tempo (ex: Guerreiro). */

  expendingResource = signal(false);

  resourceTrackers(): ResourceTracker[] {
    return this.sheet()?.character_sheet.resource_trackers ?? [];
  }

  resourceTrackerByKey(key: string): ResourceTracker | null {
    return this.resourceTrackers().find((r) => r.name === key) ?? null;
  }

  resourceMaxCount(res: ResourceTracker): number {
    return typeof res.max === 'number' ? res.max : 0;
  }

  resourcePips(res: ResourceTracker): number[] {
    return Array.from({ length: this.resourceMaxCount(res) }, (_, i) => i);
  }

  resourceAvailable(res: ResourceTracker): number {
    if (res.max === 'unlimited') return Infinity;
    return Math.max(0, res.max - res.used);
  }

  resourceAvailableForAbility(ability: ClassAbility): number {
    const res = this.resourceTrackerByKey(ability.resource_key);
    return res ? this.resourceAvailable(res) : 0;
  }

  classAbilities(): ClassAbility[] {
    return this.sheet()?.character_sheet.class_abilities ?? [];
  }

  abilitiesForResource(resourceKey: string): ClassAbility[] {
    return this.classAbilities().filter((a) => a.resource_key === resourceKey);
  }

  private expandedAbilityNames = new Set<string>();

  isAbilityExpanded(name: string): boolean {
    return this.expandedAbilityNames.has(name);
  }

  toggleAbilityDetails(name: string): void {
    if (this.expandedAbilityNames.has(name)) this.expandedAbilityNames.delete(name);
    else this.expandedAbilityNames.add(name);
  }

  canUseClassAbility(ability: ClassAbility): boolean {
    if (this.expendingResource() || this.resourceAvailableForAbility(ability) < ability.cost) {
      return false;
    }
    // Criar Espaço de Magia só serve se houver um espaço gasto daquele círculo pra devolver.
    if (ability.restores_slot) {
      const key = `level_${ability.restores_slot}`;
      return this.slotsTotal(key) - this.slotsAvailable(key) > 0;
    }
    return true;
  }

  /** Inspiração Bárdica: habilidade aguardando o jogador escolher o aliado. */
  allyAbility = signal<ClassAbility | null>(null);
  allyTarget = signal('');

  setAllyTarget(event: Event): void {
    this.allyTarget.set((event.target as HTMLSelectElement).value);
  }

  /** Curar pelo Toque: habilidade aguardando o jogador escolher quantos pontos gastar. */
  variableAbility = signal<ClassAbility | null>(null);
  variableAmount = signal(1);

  setVariableAmount(event: Event): void {
    const value = Math.trunc(Number((event.target as HTMLInputElement).value));
    this.variableAmount.set(Number.isFinite(value) && value > 0 ? value : 1);
  }

  /**
   * "USAR": gasta o recurso, anuncia na mesa ("USOU", com a CD quando houver) e, conforme a
   * habilidade, abre a rolagem (cura/resistência), devolve o espaço de magia (Criar Espaço) ou
   * pede a quantidade antes (Curar pelo Toque). Sem nada disso, só gasta e fecha, como antes.
   */
  useClassAbility(ability: ClassAbility, amount?: number, allyPlayerSession?: string): void {
    if (!this.canUseClassAbility(ability)) return;
    if (ability.targets_ally && allyPlayerSession === undefined) {
      this.allyTarget.set('');
      this.allyAbility.set(ability);
      return;
    }
    if (ability.variable_cost && amount === undefined) {
      this.variableAmount.set(1);
      this.variableAbility.set(ability);
      return;
    }
    const cost = ability.variable_cost ? Math.min(amount ?? 1, this.resourceAvailableForAbility(ability)) : ability.cost;
    const rollConfig = ability.variable_cost
      ? fixedHealConfig(ability.name.replace(/ \(1 PV\)$/, ''), cost)
      : spellRollConfig(abilityAsSpell(ability), 0);
    this.variableAbility.set(null);
    this.expendingResource.set(true);
    this.actionError.set(null);
    this.charService.updateResourceUses(this.idCharacter, ability.resource_key, cost).subscribe({
      next: ({ resource_trackers }) => {
        this.patchResourceTrackers(resource_trackers);
        this.expendingResource.set(false);
        this.announceAbility(ability);
        if (ability.targets_ally && allyPlayerSession && this.sessionId) {
          this.allyAbility.set(null);
          this.gameSessionService
            .grantBardicInspiration(this.sessionId, {
              id_character: this.idCharacter,
              id_player_session: allyPlayerSession,
            })
            .subscribe({ next: () => this.closed.emit(), error: (err) => this.handleActionError(err) });
          return;
        }
        if (ability.activates) {
          this.charService
            .updateActiveEffects(this.idCharacter, { effect: ability.activates, active: true })
            .subscribe({ next: ({ active_effects }) => this.patchActiveEffects(active_effects), error: () => undefined });
        }
        if (ability.unarmed_attacks) {
          this.rollUnarmed(ability.unarmed_attacks);
          return;
        }
        if (ability.restores_slot) {
          this.expendSlot(ability.restores_slot, -1, !rollConfig);
          return;
        }
        if (rollConfig) this.activeRoll.set(rollConfig);
        else this.closed.emit();
      },
      error: (err) => {
        this.expendingResource.set(false);
        this.handleActionError(err);
      },
    });
  }

  private announceAbility(ability: ClassAbility): void {
    if (!this.sessionId) return;
    this.gameSessionService
      .announceSpellCast(this.sessionId, {
        id_character: this.idCharacter,
        actor_name: this.actorName,
        spell_name: ability.name,
        is_ability: true,
        ...spellSaveInfo(abilityAsSpell(ability)),
      })
      .subscribe({ error: () => undefined });
  }

  private patchResourceTrackers(trackers: ResourceTracker[]): void {
    const sheet = this.sheet();
    if (!sheet) return;
    this.sheet.set({
      ...sheet,
      character_sheet: { ...sheet.character_sheet, resource_trackers: trackers },
    });
  }

  /** ========================= DESCANSO CURTO (DADOS DE VIDA) ========================= */

  rollingHitDie = signal(false);
  lastHitDieResult = signal<HitDieRollResult | null>(null);

  hitDiceTotal(): number {
    return this.sheet()?.character_sheet.combat_stats.hit_dice_total ?? 0;
  }

  hitDiceAvailable(): number {
    const stats = this.sheet()?.character_sheet.combat_stats;
    if (!stats) return 0;
    return Math.max(0, stats.hit_dice_total - stats.hit_dice_spent);
  }

  hitDicePips(): number[] {
    return Array.from({ length: this.hitDiceTotal() }, (_, i) => i);
  }

  isAtMaxHp(): boolean {
    const hp = this.sheet()?.character_sheet.combat_stats.hit_points;
    return !!hp && hp.current >= hp.max;
  }

  rollHitDieNow(): void {
    if (this.rollingHitDie()) return;
    this.rollingHitDie.set(true);
    this.actionError.set(null);
    this.charService.rollHitDie(this.idCharacter).subscribe({
      next: (result) => {
        this.lastHitDieResult.set(result);
        this.patchCombatStats({ hit_dice_spent: result.hit_dice_spent }, result.current_hit_points);
        this.rollingHitDie.set(false);
        this.closed.emit();
      },
      error: (err) => {
        this.rollingHitDie.set(false);
        this.handleActionError(err);
      },
    });
  }

  /** ========================= PREPARAR / CONJURAR MAGIAS ========================= */

  preparedCount(): number {
    return (this.sheet()?.character_sheet.spells ?? []).filter((s) => s.is_prepared).length;
  }

  maxPrepared(): number {
    return this.sheet()?.character_sheet.spellcasting_info?.max_prepared_spells ?? 0;
  }

  canPrepareMore(): boolean {
    return this.preparedCount() < this.maxPrepared();
  }

  /** Em combate não dá pra trocar o que está preparado — backend também trava, isso só desabilita a UI. */
  isInActiveCombat(): boolean {
    return !!this.sheet()?.character_sheet.in_active_combat;
  }

  /** Recusado (combate, limite ou API): o checkbox nativo volta pro estado real. */
  togglePrepared(spell: Spell, event?: Event): void {
    const box = event?.target as HTMLInputElement | undefined;
    const revert = () => {
      if (box) box.checked = !!spell.is_prepared;
    };
    if (this.isInActiveCombat()) return revert();
    const next = !spell.is_prepared;
    if (next && !this.canPrepareMore()) return revert();
    this.actionError.set(null);
    this.charService.setSpellPrepared(this.idCharacter, spell.id_spell, next).subscribe({
      next: () => this.applyPreparedLocally(spell.id_spell, next),
      error: (err) => {
        revert();
        this.handleActionError(err);
      },
    });
  }

  private applyPreparedLocally(idSpell: number, isPrepared: boolean): void {
    const sheet = this.sheet();
    if (!sheet) return;
    this.sheet.set({
      ...sheet,
      character_sheet: {
        ...sheet.character_sheet,
        spells: (sheet.character_sheet.spells ?? []).map((s) =>
          s.id_spell === idSpell ? { ...s, is_prepared: isPrepared } : s,
        ),
      },
    });
  }

  isCastable(spell: Spell): boolean {
    if (spell.spellLevel === 0) return true;
    const prepares = this.sheet()?.character_sheet.spellcasting_info?.prepares_spells;
    return !prepares || !!spell.is_prepared;
  }

  availableSlotLevelsFor(spell: Spell): number[] {
    const info = this.sheet()?.character_sheet.spellcasting_info;
    if (spell.spellLevel === 0 || !info?.slots_total) return [];
    return Object.keys(info.slots_total)
      .map((k) => this.slotLevelNumber(k))
      .filter((lvl) => lvl >= spell.spellLevel && this.slotsAvailable(`level_${lvl}`) > 0)
      .sort((a, b) => a - b);
  }

  /** Gasta o espaço (truque não gasta) e, se a magia tiver rolagem cadastrada, abre o modal de
   *  ataque/dano — a tela de ações fecha quando a rolagem termina (`onRolled`). Sem rolagem, só
   *  anuncia e fecha, como antes. */
  /** Em combate, magia de 1 minuto ou mais: mostra o tempo na lista. */
  isLongCastInCombat(spell: Spell): boolean {
    return this.inCombat && isLongCastingTime(spell.casting_time);
  }

  castSpell(spell: Spell, slotLevel: number): void {
    // Aviso, não trava: o mestre pode liberar se a cena permitir.
    if (
      this.isLongCastInCombat(spell) &&
      !confirm(
        `${spell.name} leva ${spell.casting_time} para conjurar — numa rodada de combate (6 segundos) normalmente não dá tempo. Lançar mesmo assim?`,
      )
    ) {
      return;
    }
    this.activeHand.set(null);
    const rollConfig = spellRollConfig(spell, slotLevel);
    // Ataque mágico também soma Bruxaria (vale pra qualquer ataque).
    if (rollConfig?.damage && spell.roll?.kind === 'attack') {
      rollConfig.damage.riders = this.riderChoices('spell');
    }
    // Lançamento (1.5.0): a mesa vê um aviso só, com a carta e as rolagens. Com rolagem, quem
    // lança acompanha no modal (que manda as etapas); sem rolagem, já vai pronto pra mesa.
    const cast = this.castContextFor(spell);
    const openRoll = () => {
      if (!rollConfig) return;
      this.closeSpellDetail();
      this.activeRollCast.set(cast);
      this.activeRoll.set(rollConfig);
      this.ownCast.emit(cast.castId);
    };
    if (!rollConfig) this.publishCastWithoutRolls(cast);
    if (spell.spellLevel === 0) {
      if (rollConfig) openRoll();
      else this.closed.emit();
    } else {
      this.expendSlot(slotLevel, 1, !rollConfig, openRoll);
    }
  }

  private castContextFor(spell: Spell): SpellCastContext {
    const save = spellSaveInfo(spell);
    return {
      castId: newCastId(),
      idSpell: spell.id_spell,
      weapon: null,
      spellName: spell.name,
      actor: this.actorCard ?? this.actorCardFromSheet(),
      card: spellToCard(spell),
      saveDc: save?.save_dc ?? null,
      saveAbility: save?.save_ability ?? null,
      saveNote: save ? saveNote(save.save_dc, save.save_ability) : null,
    };
  }

  /** Magia sem dados: a mesa já recebe o lançamento pronto (só as cartas e a CD, se tiver). */
  private publishCastWithoutRolls(cast: SpellCastContext): void {
    if (!this.sessionId) return;
    this.gameSessionService
      .publishSpellCastStage(this.sessionId, castStagePayload(cast, this.idCharacter, this.actorName, 'done', []))
      .subscribe({ error: () => undefined });
  }

  /** Card do personagem montado da ficha (quando a sessão não passou `actorCard`). */
  private actorCardFromSheet(): CharacterCardData {
    const cs = this.sheet()?.character_sheet;
    return {
      name: this.actorName,
      imageUrl: cs?.image_url ?? null,
      avatarPreset: cs?.avatar_preset ?? null,
      character: cs?.combat_stats?.hit_points
        ? {
            playerName: null,
            className: cs.header?.class_and_level ?? '',
            race: cs.header?.race ?? '',
            level: cs.combat_stats.hit_dice_total,
            hp: {
              current: cs.combat_stats.hit_points.current,
              max: cs.combat_stats.hit_points.max,
              temp: 0,
            },
            xp: cs.header?.experience_points,
            nextLevelXp: cs.header?.next_level_xp,
          }
        : null,
    };
  }
}
