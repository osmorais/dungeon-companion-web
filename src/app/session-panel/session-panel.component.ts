import { Component, ElementRef, HostListener, OnDestroy, afterRenderEffect, inject, input, signal, effect, untracked, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, finalize, interval } from 'rxjs';
import { GameSessionService } from '../services/game-session.service';
import { SessionStateService } from '../services/session-state.service';
import { CharacterService } from '../services/character.service';
import { AuthService } from '../services/auth.service';
import {
  CombatParticipant,
  GameSessionDetail,
  MonsterAbilityKey,
  MonsterActionOp,
  MonsterActionState,
  MonsterSession,
  NpcSession,
  PlayerSession,
  RechargeRoll,
  RevealedMonster,
  RollLogEntry,
} from '../models/game-session.interface';
import { CharacterSummary } from '../models/character-summary.interface';
import { AvatarPreset } from '../models/avatar-preset.interface';
import { CharacterSheetResponse } from '../models/character-response.interface';
import { Spell } from '../models/character-options.interface';
import { AvatarDisplayComponent } from '../avatar-display/avatar-display.component';
import { XpBarComponent } from '../xp-bar/xp-bar.component';
import { HpBarComponent } from '../hp-bar/hp-bar.component';
import { PixelDieComponent } from '../pixel-die/pixel-die.component';
import { PixelNumericDieComponent } from '../pixel-numeric-die/pixel-numeric-die.component';
import { PlayerActionsModalComponent } from '../player-actions-modal/player-actions-modal.component';
import { StartFightModalComponent } from '../start-fight-modal/start-fight-modal.component';
import { DistributeXpModalComponent } from '../distribute-xp-modal/distribute-xp-modal.component';
import { AbilityRollConfig, RollModalComponent } from '../roll-modal/roll-modal.component';
import { MonsterRollRequest } from '../monster-actions/monster-actions.component';
import { AddMonsterModalComponent } from '../add-monster-modal/add-monster-modal.component';
import { TomAssistantComponent } from '../tom-assistant/tom-assistant.component';
import { PlayerInventoryModalComponent } from '../player-inventory-modal/player-inventory-modal.component';
import { DamageImpactComponent } from '../damage-impact/damage-impact.component';
import { ModalBurstComponent } from '../modal-burst/modal-burst.component';
import { SecretRollRequestModalComponent } from '../secret-roll/secret-roll-request-modal.component';
import { apiErrorMessage } from '../auth/auth-errors';
import {
  LairPoint,
  TurnOffset,
  TurnState,
  crossedLairCount,
  playTurnSlide,
  shouldAnimateTurn,
  snapshotTurnOffsets,
} from './turn-transition';
import {
  TURN_CHANGE_TOAST_MS,
  TurnCard,
  TurnChangeToastComponent,
} from '../turn-change-toast/turn-change-toast.component';
import { ReferenceImagesModalComponent } from '../reference-images/reference-images-modal.component';
import { ReferenceImageViewerComponent } from '../reference-images/reference-image-viewer.component';
import {
  SecretRollPromptComponent,
  SecretRollPromptRequest,
} from '../secret-roll/secret-roll-prompt.component';
import { DamageImpactService } from '../services/damage-impact.service';
import { attrLabel } from '../models/level-up.interface';
import { saveNote } from '../roll-modal/spell-roll-config';
import { CharacterCardData } from '../character-card/character-card.component';
import { SpellGrimoireComponent } from '../spell-catalog-list/spell-grimoire.component';
import { spellToCard } from '../game-card/spell-card';
import { weaponInfoToCard } from '../game-card/weapon-card';
import {
  SpellCastContext,
  castVerb,
  monsterCastVerb,
  newCastId,
} from '../spell-cast/spell-cast-context';
import { SPELL_CAST_DONE_MS, SpellCastNoticeComponent } from '../spell-cast/spell-cast-notice.component';
import { MonsterRevealNoticeComponent } from '../monster-reveal/monster-reveal-notice.component';
import { MonsterCarouselComponent } from '../monster-reveal/monster-carousel.component';
import { MonsterDrawerComponent } from '../monster-drawer/monster-drawer.component';
import { MonsterDefeatNoticeComponent } from '../monster-reveal/monster-defeat-notice.component';
import { MonsterRevealInfo, monsterActionToCard, monsterToCard } from '../game-card/monster-card';
import { GameCardData } from '../game-card/game-card.model';
import { CastStageView, castRollView } from '../spell-cast/spell-cast-stage.model';
import { SessionEventPayloadMap } from '../models/session-event.interface';
import { ApplyRequest, ApplyTarget } from '../roll-modal/apply-target';
import { AreaApplyRequest, DmBoardComponent } from '../dm-board/dm-board.component';
import { CharacterDrawerComponent } from '../character-drawer/character-drawer.component';
import { DmBoardTabComponent } from '../dm-board/dm-board-tab.component';
import { LoadingOverlayService } from '../loading-overlay/loading-overlay.service';
import { SkeletonRowsComponent } from '../skeleton/skeleton-rows.component';
import { monsterDisplayName } from './monster-display-name';
import { hpColor, hpPercent } from './hp-display';
import { challengeRatingText, monsterSpeedText } from '../services/monster-format';

@Component({
  selector: 'app-session-panel',
  standalone: true,
  imports: [
    FormsModule,
    CharacterDrawerComponent,
    SpellCastNoticeComponent,
    MonsterRevealNoticeComponent,
    MonsterCarouselComponent,
    MonsterDrawerComponent,
    MonsterDefeatNoticeComponent,
    SpellGrimoireComponent,
    AvatarDisplayComponent,
    XpBarComponent,
    HpBarComponent,
    PixelDieComponent,
    PixelNumericDieComponent,
    PlayerActionsModalComponent,
    StartFightModalComponent,
    DistributeXpModalComponent,
    RollModalComponent,
    AddMonsterModalComponent,
    TomAssistantComponent,
    PlayerInventoryModalComponent,
    DamageImpactComponent,
    ModalBurstComponent,
    SecretRollRequestModalComponent,
    ReferenceImagesModalComponent,
    TurnChangeToastComponent,
    ReferenceImageViewerComponent,
    SecretRollPromptComponent,
    DmBoardComponent,
    DmBoardTabComponent,
    SkeletonRowsComponent,
  ],
  templateUrl: './session-panel.component.html',
  styleUrls: ['./session-panel.component.scss'],
})
export class SessionPanelComponent implements OnDestroy {
  private router = inject(Router);
  private gameSessionService = inject(GameSessionService);
  private sessionState = inject(SessionStateService);
  private charService = inject(CharacterService);
  private authService = inject(AuthService);
  private damageImpact = inject(DamageImpactService);
  /** Na sessão o carregamento é por skeleton em cada parte — sem o overlay do dragão. */
  private releaseLoadingOverlay = inject(LoadingOverlayService).suppressHttp();

  id = input<string>();
  /** Volta da ficha aberta pela gaveta de ações (id do personagem): reabre as ações dele. */
  reopenActions = input<string>();

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);
  sessionDetail = this.sessionState.detail;
  error = signal(false);
  refreshing = signal(false);
  hpEdits = signal<Record<string, number>>({});
  savingHp = signal<Set<string>>(new Set());
  npcHpEdits = signal<Record<string, number>>({});
  savingNpcHp = signal<Set<string>>(new Set());
  monsterHpEdits = signal<Record<string, number>>({});
  savingMonsterHp = signal<Set<string>>(new Set());

  addNpcOpen = signal(false);
  addNpcChars = signal<CharacterSummary[]>([]);
  addNpcLoading = signal(false);

  addMonsterOpen = signal(false);
  addingNpcId = signal<number | null>(null);

  private eventsSub: Subscription | null = null;
  private safetyNetSub: Subscription | null = null;
  private pollingSub: Subscription | null = null;
  /**
   * O painel é sincronizado via socket.io (SessionStateService.connectRealtime) — esse
   * intervalo é só uma rede de segurança caso a conexão caia silenciosamente (proxy, sono do Render).
   */
  private readonly SAFETY_NET_MS = 30_000;
  private readonly POLLING_MS = 6_000;

  /** Imagem padrão pra monstros sem `image_url` cadastrada (avatar revelado, modais de anúncio/derrota/detalhe). */
  readonly DEFAULT_MONSTER_IMAGE = 'assets/monster.png';

  /** Quando ligado, desliga o socket e usa polling a cada 6s pra atualizar a sessão. */
  pollingEnabled = signal(false);

  isOwner = computed(() => {
    const detail = this.sessionDetail();
    const user = this.authService.currentUser();
    if (!detail || !user) return false;
    return detail.game_session.user_id === user.id;
  });

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  constructor() {
    effect(() => {
      const detail = this.sessionDetail();
      if (detail && this.reopenActions()) untracked(() => this.reopenActionsFromSheet(detail));
    });

    effect(() => {
      const sessionId = this.id();
      untracked(() => {
        if (!sessionId) return;
        this.fetchSession(sessionId);
      });
    });

    effect(() => {
      const sessionId = this.id();
      const polling = this.pollingEnabled();
      untracked(() => {
        this.disconnectRealtime();
        this.stopPolling();
        if (!sessionId) return;
        if (polling) this.startPolling(sessionId);
        else this.connectRealtime(sessionId);
      });
    });

    effect(() => {
      const detail = this.sessionDetail();
      untracked(() => this.checkForNewRolls(detail));
    });

    /** Troca o monstro em destaque só quando é a vez de um monstro — ver spotlightMonster. */
    effect(() => {
      const current = this.currentTurnParticipant();
      untracked(() => {
        if (current?.participant_type === 'monster') {
          this.spotlightMonsterId.set(current.id_monster_session);
        }
      });
    });

    /** Antes de pedir a rolagem de iniciativa, personagens que preparam magia (Clérigo/Druida/
     *  Paladino/Mago) têm a chance de revisar o que está preparado — ver checkBattlePrepareSpells. */
    effect(() => {
      const pending = this.myPendingInitiativeParticipant();
      untracked(() => {
        if (pending) this.checkBattlePrepareSpells(pending);
      });
    });
  }

  ngOnDestroy() {
    if (this.myTurnDrawerTimer) clearTimeout(this.myTurnDrawerTimer);
    if (this.monsterTurnTimer) clearTimeout(this.monsterTurnTimer);
    this.releaseLoadingOverlay();
    this.disconnectRealtime();
    this.stopPolling();
    if (this.rollToastTimer) clearTimeout(this.rollToastTimer);
    if (this.monsterDefeatedToastTimer) clearTimeout(this.monsterDefeatedToastTimer);
    if (this.monsterAnnouncementTimer) clearTimeout(this.monsterAnnouncementTimer);
    if (this.levelUpEligibleToastTimer) clearTimeout(this.levelUpEligibleToastTimer);
    if (this.spellCastToastTimer) clearTimeout(this.spellCastToastTimer);
    // SessionStateService é singleton (providedIn: 'root') — sem isso, o `detail` de uma sessão
    // visitada antes fica no signal. Ao entrar numa sessão nova, o efeito de "primeira carga"
    // (rollToastFirstLoad) consumiria esse valor obsoleto, e as rolagens de verdade da sessão
    // acabariam todas sendo tratadas como "novas" quando o fetch real chegasse — flood de toast
    // retroativo. Limpar aqui garante que toda entrada em sessão começa de detail === null.
    this.sessionState.detail.set(null);
  }

  /** Guarda a busca silenciosa (independente de `refreshing`, que é só pro botão/estado visível). */
  private pollInFlight = false;

  private connectRealtime(sessionId: string) {
    this.eventsSub = this.sessionState.connectRealtime(sessionId).subscribe((event) => {
      this.sessionState.applyEvent(event);
      if (event.type === 'monster_defeated') {
        this.showMonsterDefeatedToast({
          name: event.name,
          imageUrl: event.image_url,
          monsterType: event.monster_type ?? null,
          size: event.size ?? null,
        });
        this.reactTom('tom-celebrating.png', `${event.name} foi derrotado! Vitória!`);
      }
      if (event.type === 'monster_revealed') {
        this.queueMonsterAnnouncement({
          name: event.name,
          imageUrl: event.image_url,
          monsterType: event.monster_type ?? null,
          size: event.size ?? null,
          lore: event.lore ?? null,
        });
      }
      if (event.type === 'monster_action_state_updated') {
        // Resultado do d6 de recarga fica na ficha até o próximo uso/turno desse monstro.
        this.monsterRechargeRolls.update((all) => {
          const next = { ...all };
          if (event.recharge_rolls?.length) next[event.id_monster_session] = event.recharge_rolls;
          else delete next[event.id_monster_session];
          return next;
        });
      }
      if (event.type === 'player_xp_granted' && event.can_level_up) {
        const player = this.sessionDetail()?.players.find(
          (p) => p.id_player_session === event.id_player_session,
        );
        this.showLevelUpEligibleToast(event.character_name, player?.character?.avatar_preset ?? null);
      }
      if (event.type === 'npc_xp_granted' && event.can_level_up) {
        const npc = this.sessionDetail()?.npcs.find((n) => n.id_npc_session === event.id_npc_session);
        this.showLevelUpEligibleToast(event.character_name, npc?.character?.avatar_preset ?? null);
      }
      if (event.type === 'secret_roll_requested') {
        // O backend só manda pro jogador alvo; ainda assim confere que é pra este usuário.
        if (event.target_user_id === this.authService.currentUser()?.id) {
          this.receiveSecretRoll(event);
        }
      }
      if (event.type === 'session_deleted') {
        this.onSessionDeleted();
      }
      if (event.type === 'party_rested') {
        this.reactTom(
          'tom-like.png',
          event.rest_type === 'long'
            ? 'Descanso longo! Vida cheia, magias de volta. Agora tentem não morrer de novo.'
            : 'Descanso curto: recursos de volta. Quem precisar, gaste seus Dados de Vida em AÇÕES.',
        );
      }
      if (event.type === 'amount_applied') {
        this.onAmountApplied(event);
      }
      if (event.type === 'spell_cast_stage') {
        this.onSpellCastStage(event);
      }
      if (event.type === 'spell_cast') {
        this.showSpellCastToast(
          event.id_character,
          event.actor_name,
          event.spell_name,
          event.save_dc && event.save_ability ? saveNote(event.save_dc, event.save_ability) : null,
          !!event.is_ability,
        );
      }
    });
    this.safetyNetSub = interval(this.SAFETY_NET_MS).subscribe(() => {
      if (!this.pollInFlight) this.fetchSession(sessionId, true);
    });
  }

  private disconnectRealtime() {
    this.eventsSub?.unsubscribe();
    this.eventsSub = null;
    this.safetyNetSub?.unsubscribe();
    this.safetyNetSub = null;
  }

  private startPolling(sessionId: string) {
    this.pollingSub = interval(this.POLLING_MS).subscribe(() => {
      if (!this.pollInFlight) this.fetchSession(sessionId, true);
    });
  }

  private stopPolling() {
    this.pollingSub?.unsubscribe();
    this.pollingSub = null;
  }

  /** Liga/desliga o impacto de dano em tela cheia — preferência só deste navegador. */
  screenEffectsEnabled = this.damageImpact.enabled;

  toggleScreenEffects(): void {
    this.damageImpact.toggleEnabled();
  }

  togglePolling() {
    this.pollingEnabled.update(v => !v);
  }

  /**
   * `silent` marca uma busca em segundo plano (polling/safety-net): não rola a página de volta pra
   * seção de jogadores e não descarta edições de HP que o usuário esteja digitando. O overlay
   * de carregamento em tela cheia é sempre pulado nesse painel — o feedback visual fica no
   * próprio botão de atualizar.
   */
  private fetchSession(sessionId: string, silent = false) {
    if (silent) this.pollInFlight = true;
    else this.refreshing.set(true);

    this.sessionState.loadFull(sessionId).subscribe({
      next: () => {
        this.error.set(false);

        if (silent) {
          this.pollInFlight = false;
          return;
        }

        this.hpEdits.set({});
        this.playerDamageInputs.set({});
        this.npcHpEdits.set({});
        this.npcDamageInputs.set({});
        this.monsterHpEdits.set({});
        this.monsterDamageInputs.set({});
        this.refreshing.set(false);
        setTimeout(() => {
          document.getElementById('players-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      },
      error: () => {
        this.error.set(true);
        if (silent) this.pollInFlight = false;
        else this.refreshing.set(false);
      },
    });
  }

  refreshSession() {
    const sessionId = this.id();
    if (!sessionId) return;
    this.fetchSession(sessionId);
  }

  get availableToAdd(): CharacterSummary[] {
    const addedIds = new Set(this.sessionDetail()?.npcs.map(n => n.id_character) ?? []);
    return this.addNpcChars().filter(c => !addedIds.has(c.id_character));
  }

  openAddNpcModal() {
    this.addNpcOpen.set(true);
    if (this.addNpcChars().length > 0) return;
    this.addNpcLoading.set(true);
    this.charService.getCharacters(1, 100).subscribe({
      next: res => {
        this.addNpcChars.set(res.CharacterPagedList ?? []);
        this.addNpcLoading.set(false);
      },
      error: () => this.addNpcLoading.set(false),
    });
  }

  closeAddNpcModal() {
    this.addNpcOpen.set(false);
  }

  openAddMonsterModal() {
    this.addMonsterOpen.set(true);
  }

  closeAddMonsterModal() {
    this.addMonsterOpen.set(false);
    this.refreshSession();
  }

  /**
   * Sem refetch após o POST: o backend ecoa `npc_added` de volta pro próprio autor via socket
   * (a room inclui quem disparou a ação), então esperar o evento evita um GET redundante e a
   * corrida de outro GET desatualizado sobrescrever um update mais novo vindo do socket.
   */
  addNpc(char: CharacterSummary) {
    const sessionId = this.id();
    if (!sessionId || this.addingNpcId() !== null) return;
    this.addingNpcId.set(char.id_character);
    this.gameSessionService.addNpcToSession(sessionId, char.id_character).pipe(
      finalize(() => this.addingNpcId.set(null)),
    ).subscribe();
  }

  deleteNpc(idNpcSession: string) {
    this.gameSessionService.deleteNpc(idNpcSession).subscribe({
      next: () => {
        this.sessionState.patch(detail => ({
          ...detail,
          npcs: detail.npcs.filter(n => n.id_npc_session !== idNpcSession),
        }));
        this.npcHpEdits.update(edits => {
          const n = { ...edits };
          delete n[idNpcSession];
          return n;
        });
      },
    });
  }

  canViewSheet(player: PlayerSession): boolean {
    if (this.isOwner()) return true;
    return player.user_id === this.authService.currentUser()?.id;
  }

  deletePlayer(idPlayerSession: string) {
    this.gameSessionService.deletePlayer(idPlayerSession).subscribe({
      next: () => {
        this.sessionState.patch(detail => ({
          ...detail,
          players: detail.players.filter(p => p.id_player_session !== idPlayerSession),
        }));
      },
    });
  }

  /** ========================= AÇÕES DO PERSONAGEM ========================= */

  /** `turnFocus`: abriu sozinha porque começou a vez do personagem (destaque SUA VEZ). */
  activeActionsCharacter = signal<{ id: number; name: string; turnFocus?: boolean } | null>(null);

  openPlayerActions(idCharacter: number, name: string) {
    this.activeActionsCharacter.set({ id: idCharacter, name });
  }

  closePlayerActions() {
    this.activeActionsCharacter.set(null);
  }

  /** PV ao vivo (com o editado na mesa) do jogador dono do personagem; NPC/sem jogador → null (a gaveta usa a ficha). */
  liveHpFor(idCharacter: number): { current: number; max: number; temp: number } | null {
    const player = this.sessionDetail()?.players.find((p) => p.id_character === idCharacter && p.character);
    if (!player?.character) return null;
    return { current: this.editedHp(player), max: player.character.max_hit_points, temp: this.editedTempHp(player) };
  }

  /** O personagem (jogador ou NPC) é o da vez no combate. */
  isCharacterCurrentTurn(idCharacter: number): boolean {
    const detail = this.sessionDetail();
    if (!detail) return false;
    const player = detail.players.find((p) => p.id_character === idCharacter);
    if (player) return this.isPlayerCurrentTurn(player);
    const npc = detail.npcs.find((n) => n.id_character === idCharacter);
    return !!npc && this.isNpcCurrentTurn(npc);
  }

  /** ITENS do destaque da gaveta de ações (jogador): inventário do próprio personagem. */
  openMyInventory(): void {
    const me = this.myPlayer();
    if (me?.character) this.openPlayerInventory(me.id_player_session, me.id_character, me.character.name);
  }

  /**
   * Alvos em que o dano/cura de uma rolagem pode ser aplicado direto (opcional), seguindo as
   * permissões de PV que já existem: o mestre aplica em qualquer jogador, NPC ou monstro; o
   * jogador só no PV do próprio personagem (`canEditHp`).
   */
  applyTargetsFor(idCharacter: number): ApplyTarget[] {
    const detail = this.sessionDetail();
    if (!detail) return [];
    // O personagem que rolou vem primeiro (o mais comum é curar a si mesmo).
    const players = detail.players
      .filter((p) => p.character)
      .sort((a, b) => Number(b.id_character === idCharacter) - Number(a.id_character === idCharacter))
      .map((p) => ({
        key: `player:${p.id_player_session}`,
        label: p.character!.name ?? p.player_name,
        allowsTempHp: true,
        defenses: p.character!.defenses,
      }));
    const npcs = detail.npcs
      .filter((n) => n.character)
      .map((n) => ({
        key: `npc:${n.id_npc_session}`,
        label: n.character!.name,
        allowsTempHp: false,
        defenses: n.character!.defenses,
      }));
    // Jogador: só monstros revelados (sem PV), e só dano. Mestre: todos.
    const monsters = this.isOwner()
      ? detail.monsters.map((m) => ({
          key: `monster:${m.id_monster_session}`,
          label: this.monsterDisplayName(m),
          allowsTempHp: false,
        }))
      : detail.revealed_monsters.map((m) => ({
          key: `monster:${m.id_monster_session}`,
          label: m.name,
          allowsTempHp: false,
          damageOnly: true,
        }));
    return [...players, ...npcs, ...monsters];
  }

  /** Outros jogadores com personagem (Inspiração Bárdica escolhe um deles). */
  alliesFor(idCharacter: number): { id_player_session: string; name: string }[] {
    return (this.sessionDetail()?.players ?? [])
      .filter((p) => p.character && p.id_character !== idCharacter)
      .map((p) => ({ id_player_session: p.id_player_session, name: p.character!.name }));
  }

  /** Vez atual do combate ativo ("<combate>:<rodada>:<participante>") — trava as somas 1×/turno
   *  (Ataque Furtivo, Golpe Divino, Matador de Inimigos). `null` sem combate ativo. */
  combatTurnKey(): string | null {
    const encounter = this.sessionDetail()?.combat?.encounter;
    if (!encounter || encounter.status !== 'active' || !encounter.current_turn_participant_id) return null;
    return `${encounter.id_combat_encounter}:${encounter.round_number}:${encounter.current_turn_participant_id}`;
  }

  /** Aplica o resultado de uma rolagem no alvo, com as mesmas regras do dano/cura em lote. */
  applyRollToTarget({ targetKey, amount, kind, castId }: ApplyRequest): void {
    const detail = this.sessionDetail();
    if (!detail || amount <= 0) return;
    const [type, id] = targetKey.split(':');
    if (!this.isOwner()) {
      this.applyViaServer(type as 'player' | 'npc' | 'monster', id, amount, kind, castId);
      return;
    }
    if (type === 'player') {
      const player = detail.players.find((p) => p.id_player_session === id);
      if (!player?.character || this.savingHp().has(id)) return;
      if (kind === 'damage') {
        this.applyPlayerDamage(player, amount);
      } else if (kind === 'heal') {
        // Cura de magia não vira PV temporário: só até o máximo.
        const next = Math.min(player.character.max_hit_points, this.editedHp(player) + amount);
        this.commitPlayerHp(player, next, this.editedTempHp(player));
      } else {
        // PV temporários não acumulam: fica o maior.
        this.commitPlayerHp(player, this.editedHp(player), Math.max(this.editedTempHp(player), amount));
      }
      return;
    }
    const sign = kind === 'damage' ? -1 : 1;
    if (type === 'npc') {
      const npc = detail.npcs.find((n) => n.id_npc_session === id);
      if (npc?.character) this.applyNpcHpDelta(npc, sign, amount);
    } else if (type === 'monster') {
      const monster = detail.monsters.find((m) => m.id_monster_session === id);
      if (monster) this.applyMonsterHpDelta(monster, sign, amount);
    }
  }

  /**
   * Jogador aplicando em aliado/NPC/monstro revelado: manda só a quantidade e o servidor calcula
   * o PV (o jogador não grava PV dos outros diretamente). O PV novo chega também pelo socket.
   */
  private applyViaServer(
    type: 'player' | 'npc' | 'monster',
    id: string,
    amount: number,
    kind: ApplyRequest['kind'],
    castId?: string,
  ): void {
    const sessionId = this.sessionDetail()?.game_session.id_game_session;
    const actor = this.activeActionsCharacter();
    if (!sessionId || !actor) return;
    this.gameSessionService
      .applyAmount(sessionId, {
        id_character: actor.id,
        target_kind: type,
        target_id: id,
        amount,
        kind,
        ...(castId ? { cast_id: castId } : {}),
      })
      .subscribe({
        next: (result) => {
          if (result.current_hit_points === undefined) return;
          this.sessionState.patch((d) => ({
            ...d,
            players: d.players.map((p) =>
              type === 'player' && p.id_player_session === id && p.character
                ? {
                    ...p,
                    character: {
                      ...p.character,
                      current_hit_points: result.current_hit_points!,
                      temporary_hit_points: result.temporary_hit_points ?? p.character.temporary_hit_points,
                    },
                  }
                : p,
            ),
            npcs: d.npcs.map((n) =>
              type === 'npc' && n.id_npc_session === id && n.character
                ? { ...n, character: { ...n.character, current_hit_points: result.current_hit_points! } }
                : n,
            ),
          }));
        },
        // Raro (alvo saiu da sessão, monstro escondido no meio): o modal de ações está aberto por
        // cima do painel, então o aviso vai num alert.
        error: (err) => alert(apiErrorMessage(err, 'Não foi possível aplicar no alvo.')),
      });
  }

  /** ========================= INVENTÁRIO DO JOGADOR ========================= */

  activeInventoryPlayer = signal<{
    idPlayerSession: string;
    idCharacter: number;
    playerName: string;
  } | null>(null);

  openPlayerInventory(idPlayerSession: string, idCharacter: number, playerName: string): void {
    this.activeInventoryPlayer.set({ idPlayerSession, idCharacter, playerName });
  }

  closePlayerInventory(): void {
    this.activeInventoryPlayer.set(null);
  }

  /** Passa a sessão atual via query param pra ficha saber voltar pra cá (goBack), em vez de
   *  sempre voltar pra lista de personagens. */
  /** `fromActions`: aberta pela gaveta de ações — o voltar da ficha reabre as ações. */
  /** Personagem do jogador que está olhando (não basta ser o mestre). */
  isMyCharacter(player: PlayerSession): boolean {
    return !!player.character && player.user_id === this.authService.currentUser()?.id;
  }

  /** Barra de XP brilhando (dá pra subir): vai pra ficha já com a subida de nível aberta. */
  openLevelUp(idCharacter: number) {
    this.router.navigate(['/character-sheet', idCharacter], {
      queryParams: { sessionId: this.id(), levelUp: 1 },
    });
  }

  viewCharacterSheet(idCharacter: number, fromActions = false) {
    this.router.navigate(['/character-sheet', idCharacter], {
      queryParams: { sessionId: this.id(), ...(fromActions ? { fromActions: idCharacter } : {}) },
    });
  }

  /**
   * Volta da ficha (`?reopenActions=<id_character>`): quando a sessão carrega, reabre a gaveta de
   * ações daquele personagem (se quem está vendo pode abrir) e tira o parâmetro da URL.
   */
  private reopenActionsFromSheet(detail: GameSessionDetail): void {
    const id = Number(this.reopenActions());
    if (!id) return;
    const player = detail.players.find((p) => p.id_character === id && p.character);
    const npc = this.isOwner() ? detail.npcs.find((n) => n.id_character === id) : undefined;
    if (player && this.canViewSheet(player)) this.openPlayerActions(id, player.character!.name);
    else if (npc) this.openPlayerActions(id, npc.character?.name ?? `NPC #${id}`);
    this.router.navigate(['/session', this.id()], { replaceUrl: true });
  }

  private playerOf(idCharacter: number): PlayerSession | undefined {
    return this.sessionDetail()?.players.find((p) => p.id_character === idCharacter && p.character);
  }

  /** DANO/CURA na gaveta de ações: o dono do personagem (ou o mestre) mexe no PV dele ali. */
  canAdjustHpFor(idCharacter: number): boolean {
    const player = this.playerOf(idCharacter);
    return !!player && this.canEditHp(player);
  }

  isSavingHpFor(idCharacter: number): boolean {
    const player = this.playerOf(idCharacter);
    return !!player && this.savingHp().has(player.id_player_session);
  }

  adjustHpFor(idCharacter: number, { kind, amount }: { kind: 'damage' | 'heal'; amount: number }): void {
    const player = this.playerOf(idCharacter);
    if (!player || !this.canEditHp(player)) return;
    if (kind === 'damage') this.applyPlayerDamage(player, amount);
    else this.applyPlayerHeal(player, amount);
    // Mesmo impacto em tela cheia das rolagens: golpe no dano, névoa na cura. A força vem da
    // fração da vida máxima (um "dado" do tamanho do PV máximo).
    this.damageImpact.trigger({
      dice_notation: `1d${Math.max(1, player.character!.max_hit_points)}`,
      modifier: 0,
      total: amount,
      roll_type: kind === 'heal' ? 'heal' : 'damage',
      label: kind === 'heal' ? 'Cura' : 'Dano',
    });
  }

  canEditHp(player: PlayerSession): boolean {
    if (!player.character) return false;
    if (this.isOwner()) return true;
    return player.user_id === this.authService.currentUser()?.id;
  }

  editedHp(player: PlayerSession): number {
    return this.hpEdits()[player.id_player_session] ?? player.character!.current_hit_points;
  }

  tempHpEdits = signal<Record<string, number>>({});

  editedTempHp(player: PlayerSession): number {
    return this.tempHpEdits()[player.id_player_session] ?? player.character!.temporary_hit_points;
  }

  /**
   * Mesmo padrão de dano/cura em lote dos monstros (ver SessionPanelComponent.applyMonsterHpDelta):
   * digita um valor e aplica como dano ou cura de uma vez, já salvando na hora.
   */
  playerDamageInputs = signal<Record<string, number>>({});

  playerDamageInput(player: PlayerSession): number {
    return this.playerDamageInputs()[player.id_player_session] ?? 0;
  }

  setPlayerDamageInput(player: PlayerSession, event: Event) {
    const raw = Number((event.target as HTMLInputElement).value);
    const value = Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : 0;
    this.playerDamageInputs.update(v => ({ ...v, [player.id_player_session]: value }));
  }

  private clearPlayerDamageInput(player: PlayerSession): void {
    const id = player.id_player_session;
    this.playerDamageInputs.update(v => {
      const n = { ...v };
      delete n[id];
      return n;
    });
  }

  /** Dano consome primeiro a vida temporária, só sobrando pra vida normal depois que ela zera
   *  (regra do livro — PV temporários são um amortecedor à parte do PV real). */
  applyPlayerDamage(player: PlayerSession, amount = this.playerDamageInput(player)) {
    const id = player.id_player_session;
    if (!amount || this.savingHp().has(id)) return;

    const currentTemp = this.editedTempHp(player);
    const nextTemp = Math.max(0, currentTemp - amount);
    const spillover = Math.max(0, amount - currentTemp);
    const nextHp = Math.max(0, this.editedHp(player) - spillover);

    if (amount === this.playerDamageInput(player)) this.clearPlayerDamageInput(player);
    this.commitPlayerHp(player, nextHp, nextTemp);
  }

  /**
   * Cura nunca restaura vida temporária (regra do livro). Se o valor curado ultrapassar o
   * máximo de PV, o excedente vira um pedido de vida temporária nova — como ela não acumula com
   * uma já existente, abre confirmação em vez de aplicar direto.
   */
  applyPlayerHeal(player: PlayerSession, amount = this.playerDamageInput(player)) {
    const id = player.id_player_session;
    if (!amount || this.savingHp().has(id)) return;

    const max = player.character!.max_hit_points;
    const wouldBe = this.editedHp(player) + amount;
    if (amount === this.playerDamageInput(player)) this.clearPlayerDamageInput(player);

    if (wouldBe <= max) {
      this.commitPlayerHp(player, wouldBe, this.editedTempHp(player));
      return;
    }

    this.pendingTempHp.set({
      player,
      newAmount: wouldBe - max,
      existingAmount: this.editedTempHp(player),
    });
  }

  /** ========================= CONFIRMAÇÃO DE VIDA TEMPORÁRIA ========================= */

  pendingTempHp = signal<{ player: PlayerSession; newAmount: number; existingAmount: number } | null>(
    null,
  );

  /** Cura até o máximo, mas recusa a vida temporária proposta. */
  declineTempHp(): void {
    const pending = this.pendingTempHp();
    this.pendingTempHp.set(null);
    if (!pending) return;
    this.commitPlayerHp(
      pending.player,
      pending.player.character!.max_hit_points,
      this.editedTempHp(pending.player),
    );
  }

  /** Cura até o máximo e aplica a vida temporária escolhida — a nova, ou mantém a já existente
   *  (nunca soma as duas, regra do livro). */
  confirmTempHp(useNew: boolean): void {
    const pending = this.pendingTempHp();
    this.pendingTempHp.set(null);
    if (!pending) return;
    const temp = useNew ? pending.newAmount : pending.existingAmount;
    this.commitPlayerHp(pending.player, pending.player.character!.max_hit_points, temp);
  }

  private commitPlayerHp(player: PlayerSession, newHp: number, newTempHp: number): void {
    const id = player.id_player_session;
    this.hpEdits.update(edits => ({ ...edits, [id]: newHp }));
    this.tempHpEdits.update(edits => ({ ...edits, [id]: newTempHp }));
    this.saveHp(player);
  }

  saveHp(player: PlayerSession) {
    const newHp = this.editedHp(player);
    const newTempHp = this.editedTempHp(player);
    const id = player.id_player_session;
    this.savingHp.update(s => { const n = new Set(s); n.add(id); return n; });
    this.gameSessionService.updatePlayerHp(id, newHp, newTempHp).pipe(
      finalize(() => this.savingHp.update(s => { const n = new Set(s); n.delete(id); return n; })),
    ).subscribe({
      next: (response) => {
        // A API pode gravar outro valor (Resistência Implacável: 1 em vez de 0).
        const storedHp = response?.current_hit_points ?? newHp;
        this.sessionState.patch(detail => ({
          ...detail,
          players: detail.players.map(p =>
            p.id_player_session === id
              ? {
                  ...p,
                  character: p.character
                    ? { ...p.character, current_hit_points: storedHp, temporary_hit_points: newTempHp }
                    : p.character,
                }
              : p,
          ),
        }));
        this.hpEdits.update(edits => {
          const n = { ...edits };
          delete n[id];
          return n;
        });
        this.tempHpEdits.update(edits => {
          const n = { ...edits };
          delete n[id];
          return n;
        });
      },
    });
  }

  editedNpcHp(npc: NpcSession): number {
    return this.npcHpEdits()[npc.id_npc_session] ?? npc.character!.current_hit_points;
  }

  npcDamageInputs = signal<Record<string, number>>({});

  npcDamageInput(npc: NpcSession): number {
    return this.npcDamageInputs()[npc.id_npc_session] ?? 0;
  }

  setNpcDamageInput(npc: NpcSession, event: Event) {
    const raw = Number((event.target as HTMLInputElement).value);
    const value = Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : 0;
    this.npcDamageInputs.update(v => ({ ...v, [npc.id_npc_session]: value }));
  }

  applyNpcDamage(npc: NpcSession) {
    this.applyNpcHpDelta(npc, -1);
  }

  applyNpcHeal(npc: NpcSession) {
    this.applyNpcHpDelta(npc, 1);
  }

  private applyNpcHpDelta(npc: NpcSession, sign: 1 | -1, amount = this.npcDamageInput(npc)) {
    const id = npc.id_npc_session;
    if (!amount || this.savingNpcHp().has(id)) return;

    const max = npc.character!.max_hit_points;
    const next = Math.min(max, Math.max(0, this.editedNpcHp(npc) + sign * amount));
    this.npcHpEdits.update(edits => ({ ...edits, [id]: next }));
    this.npcDamageInputs.update(v => {
      const n = { ...v };
      delete n[id];
      return n;
    });
    this.saveNpcHp(npc);
  }

  saveNpcHp(npc: NpcSession) {
    const newHp = this.editedNpcHp(npc);
    const id = npc.id_npc_session;
    this.savingNpcHp.update(s => { const n = new Set(s); n.add(id); return n; });
    this.gameSessionService.updateNpcHp(id, newHp).pipe(
      finalize(() => this.savingNpcHp.update(s => { const n = new Set(s); n.delete(id); return n; })),
    ).subscribe({
      next: () => {
        this.sessionState.patch(detail => ({
          ...detail,
          npcs: detail.npcs.map(n =>
            n.id_npc_session === id
              ? { ...n, character: n.character ? { ...n.character, current_hit_points: newHp } : n.character }
              : n,
          ),
        }));
        this.npcHpEdits.update(edits => {
          const n = { ...edits };
          delete n[id];
          return n;
        });
      },
    });
  }

  monsterDisplayName(monster: MonsterSession): string {
    return monsterDisplayName(monster);
  }

  /** ========================= PV DOS MONSTROS ========================= */

  editedMonsterHp(monster: MonsterSession): number {
    return this.monsterHpEdits()[monster.id_monster_session] ?? monster.hp_current;
  }

  /**
   * PV de monstro costuma ser um número grande (dezenas/centenas) — clicar em +/- um por um pra
   * aplicar uma rolagem de dano/cura é inviável. Esse input aplica um delta de uma vez e já salva
   * na hora (sem +/- nem botão "salvar" separados, ao contrário de player/NPC).
   */
  monsterDamageInputs = signal<Record<string, number>>({});

  monsterDamageInput(monster: MonsterSession): number {
    return this.monsterDamageInputs()[monster.id_monster_session] ?? 0;
  }

  setMonsterDamageInput(monster: MonsterSession, event: Event) {
    const raw = Number((event.target as HTMLInputElement).value);
    const value = Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : 0;
    this.monsterDamageInputs.update(v => ({ ...v, [monster.id_monster_session]: value }));
  }

  applyMonsterDamage(monster: MonsterSession) {
    this.applyMonsterHpDelta(monster, -1);
  }

  applyMonsterHeal(monster: MonsterSession) {
    this.applyMonsterHpDelta(monster, 1);
  }

  private applyMonsterHpDelta(
    monster: MonsterSession,
    sign: 1 | -1,
    amount = this.monsterDamageInput(monster),
  ) {
    const id = monster.id_monster_session;
    if (!amount || this.savingMonsterHp().has(id)) return;

    const next = Math.min(monster.hp_max, Math.max(0, this.editedMonsterHp(monster) + sign * amount));
    this.monsterHpEdits.update(edits => ({ ...edits, [id]: next }));
    this.monsterDamageInputs.update(v => {
      const n = { ...v };
      delete n[id];
      return n;
    });
    this.saveMonsterHp(monster);
  }

  saveMonsterHp(monster: MonsterSession) {
    const newHp = this.editedMonsterHp(monster);
    const id = monster.id_monster_session;
    this.savingMonsterHp.update(s => { const n = new Set(s); n.add(id); return n; });
    this.gameSessionService.updateMonsterHp(id, newHp).pipe(
      finalize(() => this.savingMonsterHp.update(s => { const n = new Set(s); n.delete(id); return n; })),
    ).subscribe({
      next: () => {
        this.sessionState.patch(detail => ({
          ...detail,
          monsters: detail.monsters.map(m =>
            m.id_monster_session === id ? { ...m, hp_current: newHp } : m,
          ),
        }));
        this.monsterHpEdits.update(edits => {
          const n = { ...edits };
          delete n[id];
          return n;
        });
      },
    });
  }

  deleteMonster(monster: MonsterSession) {
    this.gameSessionService.deleteMonster(monster.id_monster_session).subscribe({
      next: () => this.removeMonsterFromState(monster.id_monster_session),
    });
  }

  duplicatingMonsterId = signal<string | null>(null);

  /** A cópia entra na sessão via o evento `monster_added` (socket) — mesmo padrão de
   *  add-monster-modal, sem patch manual de estado aqui. */
  duplicateMonster(monster: MonsterSession, event: Event): void {
    event.stopPropagation();
    if (this.duplicatingMonsterId()) return;
    this.duplicatingMonsterId.set(monster.id_monster_session);
    this.gameSessionService
      .duplicateMonster(monster.id_monster_session)
      .pipe(finalize(() => this.duplicatingMonsterId.set(null)))
      .subscribe();
  }

  defeatingMonsterId = signal<string | null>(null);

  /** Marca o monstro como derrotado depois de conceder XP (sempre passa pelo modal de distribuição primeiro). */
  private defeatMonster(monster: MonsterSession) {
    if (this.defeatingMonsterId()) return;
    this.defeatingMonsterId.set(monster.id_monster_session);
    this.gameSessionService.defeatMonster(monster.id_monster_session).pipe(
      finalize(() => this.defeatingMonsterId.set(null)),
    ).subscribe({
      next: () => this.removeMonsterFromState(monster.id_monster_session),
    });
  }

  /** ========================= DISTRIBUIÇÃO DE XP ========================= */

  showDistributeXpModal = signal(false);
  xpModalSuggestedAmount = signal<number | null>(null);
  xpModalPreselected = signal<string[]>([]);
  /** Monstros a marcar como derrotados quando o XP for concedido — um só (botão "derrotar") ou
   *  vários (todos os monstros do combate, ao encerrá-lo). Vazio no fluxo avulso (sem monstro). */
  private xpModalPendingMonsters = signal<MonsterSession[]>([]);
  /** Só setado no fluxo de encerrar combate — depois de derrotar os monstros, também finaliza o encontro. */
  private xpModalEndsCombat = signal<string | null>(null);

  /** Botão avulso "DISTRIBUIR XP" — sem sugestão de valor nem destinatários pré-marcados. */
  openDistributeXpModal(): void {
    this.xpModalSuggestedAmount.set(null);
    this.xpModalPreselected.set([]);
    this.xpModalPendingMonsters.set([]);
    this.xpModalEndsCombat.set(null);
    this.showDistributeXpModal.set(true);
  }

  /** Antes de marcar um monstro como derrotado, sempre pergunta a distribuição de XP — sugere o
   *  XP do monstro e pré-marca os jogadores do combate ativo (ambos ajustáveis pelo mestre). */
  openDefeatMonsterXpModal(monster: MonsterSession): void {
    if (this.defeatingMonsterId()) return;
    this.xpModalSuggestedAmount.set(monster.data_snapshot?.xp ?? null);
    this.xpModalPreselected.set(this.currentCombatPlayerSessionIds());
    this.xpModalPendingMonsters.set([monster]);
    this.xpModalEndsCombat.set(null);
    this.showDistributeXpModal.set(true);
  }

  closeDistributeXpModal(): void {
    this.showDistributeXpModal.set(false);
    this.xpModalPendingMonsters.set([]);
    this.xpModalEndsCombat.set(null);
  }

  /** Só marca o(s) monstro(s) como derrotado(s) — e encerra o combate, se for o caso — depois que o XP foi concedido com sucesso. */
  onXpGranted(): void {
    const monsters = this.xpModalPendingMonsters();
    const idCombatEncounter = this.xpModalEndsCombat();
    this.showDistributeXpModal.set(false);
    this.xpModalPendingMonsters.set([]);
    this.xpModalEndsCombat.set(null);
    for (const monster of monsters) this.defeatMonster(monster);
    if (idCombatEncounter) this.finishEncounter(idCombatEncounter);
  }

  private currentCombatPlayerSessionIds(): string[] {
    const combat = this.combat();
    if (!combat) return [];
    return combat.participants
      .filter((p): p is typeof p & { id_player_session: string } => p.participant_type === 'player' && !!p.id_player_session)
      .map(p => p.id_player_session);
  }

  private currentCombatMonsters(): MonsterSession[] {
    const combat = this.combat();
    if (!combat) return [];
    const monsterIds = new Set(
      combat.participants
        .filter((p): p is typeof p & { id_monster_session: string } => p.participant_type === 'monster' && !!p.id_monster_session)
        .map(p => p.id_monster_session),
    );
    return (this.sessionDetail()?.monsters ?? []).filter(m => monsterIds.has(m.id_monster_session));
  }

  private removeMonsterFromState(idMonsterSession: string): void {
    this.sessionState.patch(detail => ({
      ...detail,
      monsters: detail.monsters.filter(m => m.id_monster_session !== idMonsterSession),
      revealed_monsters: detail.revealed_monsters.filter(
        r => r.id_monster_session !== idMonsterSession,
      ),
    }));
    this.monsterHpEdits.update(edits => {
      const n = { ...edits };
      delete n[idMonsterSession];
      return n;
    });
  }

  /** ========================= REVELAÇÃO DE MONSTROS ========================= */

  revealedMonsters = computed(() => this.sessionDetail()?.revealed_monsters ?? []);
  revealingMonsterId = signal<string | null>(null);

  /**
   * Monstro revelado em destaque (card grande, estilo card de jogador) — só um por vez, mesmo
   * com vários revelados. Por padrão mostra o de melhor iniciativa (combat.participants já vem
   * ordenado por iniciativa); o effect logo abaixo troca pro próximo só quando é a vez dele,
   * mantendo o atual durante turnos de jogadores/NPCs ("fica até o próximo monstro aparecer").
   */
  private spotlightMonsterId = signal<string | null>(null);

  spotlightMonster = computed<RevealedMonster | null>(() => {
    const revealed = this.revealedMonsters();
    if (revealed.length === 0) return null;

    const spotlighted = revealed.find((m) => m.id_monster_session === this.spotlightMonsterId());
    if (spotlighted) return spotlighted;

    const combat = this.combat();
    const bestInInitiative = combat?.participants.find(
      (p) => p.participant_type === 'monster' && revealed.some((m) => m.id_monster_session === p.id_monster_session),
    );
    if (bestInInitiative) {
      return revealed.find((m) => m.id_monster_session === bestInInitiative.id_monster_session)!;
    }
    return revealed[0];
  });

  /** Sem refetch — o socket ecoa `monster_revealed`/`monster_hidden` de volta (ver addNpc acima). */
  toggleMonsterReveal(monster: MonsterSession, event: Event): void {
    event.stopPropagation();
    if (this.revealingMonsterId()) return;
    this.revealingMonsterId.set(monster.id_monster_session);
    const action$ = monster.is_revealed
      ? this.gameSessionService.hideMonster(monster.id_monster_session)
      : this.gameSessionService.revealMonster(monster.id_monster_session);
    action$.pipe(finalize(() => this.revealingMonsterId.set(null))).subscribe();
  }

  /** ========================= FICHA DO MONSTRO (gaveta do mestre, 1.13.0) ========================= */

  activeMonsterDetail = signal<MonsterSession | null>(null);
  /** O monstro da gaveta como está agora na mesa (PV, usos e imagem mudam com ela aberta). */
  liveMonsterDetail = computed(() => {
    const open = this.activeMonsterDetail();
    if (!open) return null;
    return (
      this.sessionDetail()?.monsters.find((m) => m.id_monster_session === open.id_monster_session) ??
      open
    );
  });

  /** DANO/CURA no PV do monstro, pela gaveta. */
  applyMonsterDrawerHp(monster: MonsterSession, { kind, amount }: { kind: 'damage' | 'heal'; amount: number }): void {
    if (amount > 0) this.applyMonsterHpDelta(monster, kind === 'damage' ? -1 : 1, amount);
  }

  /** Mestre tocou na carta de um monstro (carrossel do combate): abre a gaveta dele. */
  openMonsterDetailById(idMonsterSession: string): void {
    const monster = this.sessionDetail()?.monsters.find((m) => m.id_monster_session === idMonsterSession);
    if (monster) this.openMonsterDetail(monster);
  }
  /** Rolagem de uma ação/teste do monstro (1.11.0): a ficha fecha enquanto rola e volta depois. */
  activeMonsterRoll = signal<{
    monster: MonsterSession;
    config: AbilityRollConfig;
    /** Ação com carta: a rolagem abre na tela de lançamento (1.13.0). */
    cast: SpellCastContext | null;
  } | null>(null);
  /** Erro ao gastar um uso (ex.: recarga ainda não voltou) — aparece na ficha do monstro. */
  monsterActionError = signal<string | null>(null);
  /** d6 de recarga do início do turno, por monstro (mostrado na ficha dele). */
  monsterRechargeRolls = signal<Partial<Record<string, RechargeRoll[]>>>({});

  /** Ação com uso limitado gasta antes de rolar (a API recusa se acabou, e a rolagem não abre). */
  openMonsterRoll(monster: MonsterSession, request: MonsterRollRequest): void {
    this.monsterActionError.set(null);
    if (!request.consume) {
      this.startMonsterRoll(monster, request);
      return;
    }
    this.gameSessionService
      .updateMonsterActionState(monster.id_monster_session, request.consume)
      .subscribe({
        next: (state) => {
          this.setMonsterActionState(monster.id_monster_session, state);
          this.startMonsterRoll(monster, request);
        },
        error: (err) =>
          this.monsterActionError.set(apiErrorMessage(err, 'Não foi possível usar essa ação.')),
      });
  }

  /** A gaveta do monstro fica aberta por baixo da rolagem (camada acima): o multiataque guiado não
   *  perde a contagem entre um ataque e outro. */
  private startMonsterRoll(monster: MonsterSession, request: MonsterRollRequest): void {
    const cast = request.card ? this.monsterCast(monster, request) : null;
    if (cast && !cast.private) this.markOwnCast(cast.castId);
    this.activeMonsterRoll.set({ monster, config: request.config, cast });
  }

  /**
   * Ação do monstro na tela de lançamento (1.13.0): a carta do monstro age e a carta da ação vai
   * pra mesa. Monstro escondido: o mestre vê o palco, mas nada é publicado (`private`).
   */
  private monsterCast(monster: MonsterSession, request: MonsterRollRequest): SpellCastContext {
    const action = request.card!;
    const name = this.monsterDisplayName(monster);
    return {
      castId: newCastId(),
      idSpell: null,
      weapon: null,
      monsterAction: action,
      idMonsterSession: monster.id_monster_session,
      private: !monster.is_revealed,
      spellName: action.name,
      actor: {
        name,
        imageUrl: monster.image_url,
        avatarPreset: null,
        monsterCard: this.monsterCardFor(monster.id_monster_session),
      },
      card: monsterActionToCard(action, monster.image_url),
      saveDc: request.castSave?.dc ?? null,
      saveAbility: request.castSave?.ability ?? null,
      saveNote: request.castSave ? saveNote(request.castSave.dc, request.castSave.ability) : null,
    };
  }

  /** Uso sem rolagem: habilidade só de texto, restaurar um uso, descanso, covil. */
  applyMonsterOp(monster: MonsterSession, op: MonsterActionOp): void {
    this.monsterActionError.set(null);
    this.gameSessionService.updateMonsterActionState(monster.id_monster_session, op).subscribe({
      next: (state) => this.setMonsterActionState(monster.id_monster_session, state),
      error: (err) =>
        this.monsterActionError.set(apiErrorMessage(err, 'Não foi possível atualizar os usos.')),
    });
  }

  /** Aplica já (o socket ecoa o mesmo estado depois, sem refetch). */
  private setMonsterActionState(idMonsterSession: string, state: MonsterActionState): void {
    this.sessionState.applyEvent({
      type: 'monster_action_state_updated',
      id_game_session: this.sessionDetail()?.game_session.id_game_session ?? '',
      id_monster_session: idMonsterSession,
      action_state: state,
    });
  }

  /** Usos atuais do monstro (a ficha aberta guarda a cópia de quando abriu). */
  liveActionState(monster: MonsterSession): MonsterActionState | null {
    const current = this.sessionDetail()?.monsters.find(
      (m) => m.id_monster_session === monster.id_monster_session,
    );
    return current?.action_state ?? null;
  }

  /** É a vez deste monstro no combate (a ficha mostra a faixa e o FINALIZAR TURNO). */
  isMonsterTurn(monster: MonsterSession): boolean {
    const combat = this.combat();
    if (combat?.encounter.status !== 'active') return false;
    const current = combat.participants.find(
      (p) => p.id_combat_participant === combat.encounter.current_turn_participant_id,
    );
    return current?.participant_type === 'monster' && current.id_monster_session === monster.id_monster_session;
  }

  closeMonsterRoll(): void {
    const roll = this.activeMonsterRoll();
    this.activeMonsterRoll.set(null);
    if (!roll) return;
    // Volta pra ficha com o estado atual (PV pode ter mudado com o dano aplicado).
    const current = this.sessionDetail()?.monsters.find(
      (m) => m.id_monster_session === roll.monster.id_monster_session,
    );
    if (current) this.activeMonsterDetail.set(current);
  }

  /** Alvos do monstro: jogadores e NPCs (com as defesas) e os outros monstros. */
  monsterApplyTargets(monster: MonsterSession): ApplyTarget[] {
    return this.applyTargetsFor(-1).filter((t) => t.key !== `monster:${monster.id_monster_session}`);
  }

  openMonsterDetail(monster: MonsterSession) {
    this.activeMonsterDetail.set(monster);
  }

  closeMonsterDetail() {
    this.activeMonsterDetail.set(null);
    this.editingMonsterStats.set(false);
    this.monsterStatsError.set(null);
  }

  /** ========================= DETALHE DO MONSTRO: EDITAR STATUS ========================= */

  readonly MONSTER_ABILITY_FIELDS: { key: MonsterAbilityKey; label: string }[] = [
    { key: 'strength', label: 'FOR' },
    { key: 'dexterity', label: 'DES' },
    { key: 'constitution', label: 'CON' },
    { key: 'intelligence', label: 'INT' },
    { key: 'wisdom', label: 'SAB' },
    { key: 'charisma', label: 'CAR' },
  ];

  editingMonsterStats = signal(false);
  savingMonsterStats = signal(false);
  monsterStatsError = signal<string | null>(null);
  monsterStatsDraft = signal<
    { custom_name: string; hp_current: number; hp_max: number; ac: number } & Record<
      MonsterAbilityKey,
      number
    >
  >({
    custom_name: '',
    hp_current: 0,
    hp_max: 0,
    ac: 0,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  });

  startEditMonsterStats(monster: MonsterSession): void {
    this.monsterStatsDraft.set({
      custom_name: monster.custom_name ?? '',
      hp_current: monster.hp_current,
      hp_max: monster.hp_max,
      ac: monster.ac,
      strength: monster.data_snapshot.strength,
      dexterity: monster.data_snapshot.dexterity,
      constitution: monster.data_snapshot.constitution,
      intelligence: monster.data_snapshot.intelligence,
      wisdom: monster.data_snapshot.wisdom,
      charisma: monster.data_snapshot.charisma,
    });
    this.monsterStatsError.set(null);
    this.editingMonsterStats.set(true);
  }

  cancelEditMonsterStats(): void {
    this.editingMonsterStats.set(false);
    this.monsterStatsError.set(null);
  }

  /**
   * `(ngModelChange)` já emite o valor novo do input (string/number), não um `Event` do DOM —
   * ao contrário de `(change)`/`(input)`. Tratar `$event` como Event aqui lançava uma exceção
   * silenciosa a cada tecla, então o rascunho nunca mudava e "salvar" reenviava os valores antigos.
   */
  setMonsterStatsDraftName(value: string): void {
    this.monsterStatsDraft.update((d) => ({ ...d, custom_name: value }));
  }

  setMonsterStatsDraftNumber(field: 'hp_current' | 'hp_max' | 'ac', value: string | number): void {
    const raw = Number(value);
    const parsed = Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : 0;
    this.monsterStatsDraft.update((d) => ({ ...d, [field]: parsed }));
  }

  setMonsterStatsDraftAbility(field: MonsterAbilityKey, value: string | number): void {
    const raw = Number(value);
    const parsed = Number.isFinite(raw) ? Math.min(30, Math.max(1, Math.trunc(raw))) : 1;
    this.monsterStatsDraft.update((d) => ({ ...d, [field]: parsed }));
  }

  saveMonsterStats(monster: MonsterSession): void {
    if (this.savingMonsterStats()) return;
    const draft = this.monsterStatsDraft();
    if (draft.hp_max < 1) {
      this.monsterStatsError.set('PV máximo precisa ser maior que zero.');
      return;
    }

    const abilities: Record<MonsterAbilityKey, number> = {
      strength: draft.strength,
      dexterity: draft.dexterity,
      constitution: draft.constitution,
      intelligence: draft.intelligence,
      wisdom: draft.wisdom,
      charisma: draft.charisma,
    };
    const payload = {
      custom_name: draft.custom_name.trim() || null,
      hp_current: Math.min(draft.hp_current, draft.hp_max),
      hp_max: draft.hp_max,
      ac: draft.ac,
      abilities,
    };
    this.savingMonsterStats.set(true);
    this.monsterStatsError.set(null);
    this.gameSessionService
      .updateMonsterStats(monster.id_monster_session, payload)
      .pipe(finalize(() => this.savingMonsterStats.set(false)))
      .subscribe({
        next: () => {
          const updated: MonsterSession = {
            ...monster,
            custom_name: payload.custom_name ?? undefined,
            hp_current: payload.hp_current,
            hp_max: payload.hp_max,
            ac: payload.ac,
            data_snapshot: { ...monster.data_snapshot, ...abilities },
          };
          this.activeMonsterDetail.set(updated);
          this.sessionState.patch((detail) => ({
            ...detail,
            monsters: detail.monsters.map((m) =>
              m.id_monster_session === monster.id_monster_session ? updated : m,
            ),
          }));
          this.editingMonsterStats.set(false);
        },
        error: () => {
          this.monsterStatsError.set('Não foi possível salvar os status. Tente novamente.');
        },
      });
  }

  /** ========================= DETALHE DO MONSTRO: IMAGEM CUSTOMIZADA ========================= */

  private static readonly MAX_MONSTER_IMAGE_BYTES = 10 * 1024 * 1024;

  uploadingMonsterImage = signal(false);
  monsterImageUploadError = signal<string | null>(null);

  onMonsterImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permite selecionar o mesmo arquivo de novo depois de um erro
    if (!file) return;

    const monster = this.activeMonsterDetail();
    if (!monster || this.uploadingMonsterImage()) return;

    if (!file.type.startsWith('image/')) {
      this.monsterImageUploadError.set('O arquivo precisa ser uma imagem.');
      return;
    }
    if (file.size > SessionPanelComponent.MAX_MONSTER_IMAGE_BYTES) {
      this.monsterImageUploadError.set('Imagem muito grande — o limite é 10 MB.');
      return;
    }

    this.monsterImageUploadError.set(null);
    this.uploadingMonsterImage.set(true);
    this.gameSessionService.uploadMonsterImage(monster.id_monster_session, file).subscribe({
      next: (updated) => {
        // Também atualiza via socket (monster_image_updated) pra quem só vê a lista, mas o
        // modal aberto guarda um retrato próprio do monstro — precisa desse patch direto.
        this.activeMonsterDetail.set(updated);
        this.uploadingMonsterImage.set(false);
      },
      error: () => {
        this.monsterImageUploadError.set('Não foi possível enviar a imagem. Tente novamente.');
        this.uploadingMonsterImage.set(false);
      },
    });
  }

  monsterAcValue(monster: MonsterSession): number | null {
    return monster.data_snapshot.armor_class?.[0]?.value ?? null;
  }

  monsterSpeedText(monster: MonsterSession): string {
    return monsterSpeedText(monster.data_snapshot.speed);
  }

  crText = challengeRatingText;

  hpPercent(current: number, max: number): number {
    return hpPercent(current, max);
  }


  /**
   * Barra de PV com dois segmentos (verde = vida real, azul = vida temporária). As larguras são
   * relativas a max+tempHp (não a max sozinho) pra nunca estourar 100% de largura somados, mesmo
   * com muita vida temporária — o texto ao lado (ex: "12/20 +8") mostra os valores exatos.
   */
  hpGreenPercent(current: number, max: number, tempHp: number): number {
    const total = max + tempHp;
    if (total <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((current / total) * 100)));
  }

  hpTempPercent(current: number, max: number, tempHp: number): number {
    const total = max + tempHp;
    if (total <= 0 || tempHp <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((tempHp / total) * 100)));
  }

  hpColor(current: number, max: number): string {
    return hpColor(current, max);
  }


  goBack() {
    this.router.navigate(['/']);
  }

  /** ========================= ROLAGENS ========================= */

  rollSides(roll: RollLogEntry): number {
    const match = roll.dice_notation.match(/d(\d+)/);
    return match ? parseInt(match[1], 10) : 20;
  }

  isD6(roll: RollLogEntry): boolean {
    return this.rollSides(roll) === 6;
  }

  /** Marca o dado que não foi escolhido numa rolagem com vantagem/desvantagem. */
  isRollValueDropped(roll: RollLogEntry, value: number): boolean {
    // 'dice', 'damage' e 'heal' sempre somam todos os dados (nunca descartam um por vantagem/desvantagem).
    if (
      roll.roll_type === 'dice' ||
      roll.roll_type === 'damage' ||
      roll.roll_type === 'heal' ||
      roll.rolls.length < 2
    )
      return false;
    const chosen = roll.total - roll.modifier;
    return value !== chosen;
  }

  advantageSuffix(roll: RollLogEntry): string {
    if (roll.advantage_state === 'advantage') return ' (VANT)';
    if (roll.advantage_state === 'disadvantage') return ' (DESV)';
    return '';
  }

  formatMod(value: number): string {
    return value >= 0 ? `+${value}` : `${value}`;
  }

  /** ========================= TOOLTIP DE ATRIBUTOS (HOVER NO AVATAR) =========================
   *  Só desktop (mouse) — busca a ficha completa sob demanda (com cache), já que CA/iniciativa/
   *  deslocamento/atributos/ouro não vêm no resumo leve da sessão, só na ficha completa. Qualquer
   *  colega de sessão pode ver o de qualquer outro (backend: CharacterSheetService.loadCharacter
   *  libera pra "colega de sessão", não só dono/mestre) — ao contrário de canViewSheet, que
   *  continua restrito ao botão "VER FICHA"/"AÇÕES". */

  private avatarTooltipCache = new Map<number, CharacterSheetResponse>();
  private avatarTooltipTimeout: ReturnType<typeof setTimeout> | null = null;
  avatarTooltipCharacterId = signal<number | null>(null);
  avatarTooltipSheet = signal<CharacterSheetResponse | null>(null);

  readonly attrLabel = attrLabel;

  onAvatarHoverStart(idCharacter: number): void {
    this.avatarTooltipCharacterId.set(idCharacter);
    const cached = this.avatarTooltipCache.get(idCharacter);
    if (cached) {
      this.avatarTooltipSheet.set(cached);
      return;
    }
    this.avatarTooltipSheet.set(null);
    if (this.avatarTooltipTimeout) clearTimeout(this.avatarTooltipTimeout);
    // Pequeno atraso pra não disparar uma requisição a cada hover rápido passando pela linha de cards.
    this.avatarTooltipTimeout = setTimeout(() => {
      if (this.avatarTooltipCharacterId() !== idCharacter) return;
      this.charService.getCharacterById(idCharacter, true).subscribe({
        next: (sheet) => {
          this.avatarTooltipCache.set(idCharacter, sheet);
          if (this.avatarTooltipCharacterId() === idCharacter) this.avatarTooltipSheet.set(sheet);
        },
      });
    }, 300);
  }

  onAvatarHoverEnd(): void {
    if (this.avatarTooltipTimeout) {
      clearTimeout(this.avatarTooltipTimeout);
      this.avatarTooltipTimeout = null;
    }
    this.avatarTooltipCharacterId.set(null);
    this.avatarTooltipSheet.set(null);
  }

  avatarTooltipVisibleFor(idCharacter: number): boolean {
    return this.avatarTooltipCharacterId() === idCharacter;
  }

  /** Mesma ordem alfabética (CAR/CON/DES/FOR/INT/SAB) já usada na ficha completa (via `| keyvalue`). */
  avatarTooltipAttrs(sheet: CharacterSheetResponse): { key: string; score: number; modifier: number }[] {
    const attrs = sheet.character_sheet.attributes_and_saves;
    return Object.keys(attrs)
      .sort()
      .map((key) => ({ key, score: attrs[key].score, modifier: attrs[key].modifier }));
  }

  /** ========================= TOAST DE ROLAGEM (broadcast) ========================= */

  readonly ROLL_TOAST_MS = 10_000;

  activeRollToast = signal<RollLogEntry | null>(null);
  private seenRollIds = new Set<string>();
  private rollToastFirstLoad = true;
  private rollToastQueue: RollLogEntry[] = [];
  private rollToastTimer: ReturnType<typeof setTimeout> | null = null;

  /** Ids de rolagens já liberadas pro histórico — só entram aqui depois que o toast de tela
   *  cheia correspondente já foi exibido (ou nunca vai ser, ver `checkForNewRolls`). Existe pra
   *  o histórico de rolagens recentes não "vazar" o resultado antes da notificação, quando várias
   *  rolagens chegam em sequência e ficam empilhadas na fila do toast. */
  private revealedRollIdsState = signal<ReadonlySet<string>>(new Set());
  visibleRecentRolls = computed(() => {
    const rolls = this.sessionDetail()?.recent_rolls ?? [];
    const revealed = this.revealedRollIdsState();
    return rolls.filter((r) => revealed.has(r.id_roll));
  });

  private revealRolls(ids: Iterable<string>): void {
    const next = new Set(this.revealedRollIdsState());
    let changed = false;
    for (const id of ids) {
      if (!next.has(id)) {
        next.add(id);
        changed = true;
      }
    }
    if (changed) this.revealedRollIdsState.set(next);
  }

  /**
   * Detecta rolagens que chegaram desde a última atualização da sessão (de qualquer jogador) e
   * as enfileira pra exibir em tela cheia por alguns segundos. No primeiro carregamento só marca
   * o histórico existente como "visto", sem disparar o modal pra rolagens antigas.
   */
  private checkForNewRolls(detail: GameSessionDetail | null): void {
    if (!detail) return;
    const rolls = detail.recent_rolls;

    if (this.rollToastFirstLoad) {
      this.rollToastFirstLoad = false;
      rolls.forEach((r) => this.seenRollIds.add(r.id_roll));
      this.revealRolls(rolls.map((r) => r.id_roll));
      return;
    }

    const newRolls = rolls
      .filter((r) => !this.seenRollIds.has(r.id_roll))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (newRolls.length === 0) return;
    newRolls.forEach((r) => this.seenRollIds.add(r.id_roll));

    // Enquanto o próprio jogador está rolando (ação ou iniciativa), ele já vê a animação no
    // roll-modal correspondente — evita empilhar o toast de tela cheia por cima disso. Como
    // essas rolagens nunca passam pela fila de toast, liberam pro histórico (e pro Tom) na hora.
    if (this.activeActionsCharacter() || this.activeInitiativeRoll()) {
      this.revealRolls(newRolls.map((r) => r.id_roll));
      const lastVisible = [...newRolls].reverse().find((r) => !r.is_hidden);
      if (lastVisible) this.reactTomToRoll(lastVisible);
      return;
    }

    // Rolagens de um lançamento de magia aparecem no aviso do lançamento (onSpellCastStage), não
    // num aviso avulso — entram direto no histórico.
    const castRolls = newRolls.filter((r) => r.cast_id);
    if (castRolls.length) this.revealRolls(castRolls.map((r) => r.id_roll));
    const loose = newRolls.filter((r) => !r.cast_id);
    if (loose.length === 0) return;

    this.rollToastQueue.push(...loose);
    if (!this.activeRollToast()) this.playNextRollToast();
  }

  private playNextRollToast(): void {
    if (this.rollToastTimer) {
      clearTimeout(this.rollToastTimer);
      this.rollToastTimer = null;
    }
    const next = this.rollToastQueue.shift();
    this.activeRollToast.set(next ?? null);
    if (next) {
      // Só entra no histórico — e o Tom só comenta — quando o toast realmente aparece em tela, não
      // quando é enfileirado (com várias rolagens seguidas, o Tom adiantava o resultado).
      this.revealRolls([next.id_roll]);
      if (!next.is_hidden) this.reactTomToRoll(next);
      // Dano: o impacto em tela cheia toca junto com o toast (quem rolou já viu no roll-modal).
      if ((next.roll_type === 'damage' || next.roll_type === 'heal') && !next.is_hidden) {
        this.damageImpact.trigger(next);
      }
      this.rollToastTimer = setTimeout(() => this.playNextRollToast(), this.ROLL_TOAST_MS);
    }
  }

  closeRollToast(): void {
    this.playNextRollToast();
  }

  /** ========================= TOAST: MONSTRO DERROTADO (broadcast) ========================= */

  /** A carta treme e explode (~1,6 s) e o nome fica pra leitura (1.11.0). */
  readonly MONSTER_DEFEATED_TOAST_MS = 8_000;

  /** `key` incremental — sem isso, dois monstros derrotados seguidos com o mesmo nome não
   *  recriariam o aviso (a carta não explodiria de novo; ver o @for do template). */
  activeMonsterDefeatedToast = signal<(MonsterRevealInfo & { key: number }) | null>(null);
  private monsterDefeatedToastTimer: ReturnType<typeof setTimeout> | null = null;
  private monsterDefeatedCounter = 0;

  /** Só o mestre dispara (defeatMonster), mas o evento ecoa pelo socket pra todo mundo, autor incluso. */
  private showMonsterDefeatedToast(info: MonsterRevealInfo): void {
    if (this.monsterDefeatedToastTimer) clearTimeout(this.monsterDefeatedToastTimer);
    this.monsterDefeatedCounter++;
    this.activeMonsterDefeatedToast.set({ ...info, key: this.monsterDefeatedCounter });
    this.monsterDefeatedToastTimer = setTimeout(
      () => this.activeMonsterDefeatedToast.set(null),
      this.MONSTER_DEFEATED_TOAST_MS,
    );
  }

  closeMonsterDefeatedToast(): void {
    if (this.monsterDefeatedToastTimer) clearTimeout(this.monsterDefeatedToastTimer);
    this.activeMonsterDefeatedToast.set(null);
  }

  /** ============ AVISO: LANÇAMENTO DE MAGIA (1.5.0) E ATAQUE COM ARMA (1.6.1) ============
   *  Um aviso só por lançamento, que vai crescendo: card do personagem + carta da magia + as
   *  rolagens (ataque → acertou/errou → dano). Quem lança manda as etapas (`spell_cast_stage`);
   *  as rolagens vêm pelo `roll_added` (com `cast_id`) e são achadas no histórico pelo id. Some
   *  SPELL_CAST_DONE_MS depois de "terminou", ou depois de CAST_NOTICE_SAFETY_MS sem notícia
   *  (quem lança fechou a aba no meio). Vários lançamentos seguidos entram em fila. */

  readonly CAST_NOTICE_SAFETY_MS = 120_000;

  private castStages = new Map<string, SessionEventPayloadMap['spell_cast_stage']>();
  private castStagesVersion = signal(0);
  private castNoticeQueue: string[] = [];
  activeCastId = signal<string | null>(null);
  private castNoticeTimer: ReturnType<typeof setTimeout> | null = null;
  /** Lançamentos com rolagem de quem está olhando: ele acompanha no modal de rolagem. */
  private ownCastIds = new Set<string>();
  /** Fechados (ou terminados) — etapas atrasadas desses não reabrem o aviso. */
  private closedCastIds = new Set<string>();
  /** Dano/cura que já tocaram o impacto e o Tom (uma vez por rolagem). */
  private castReactedRollIds = new Set<string>();

  activeCastView = computed<CastStageView | null>(() => {
    const id = this.activeCastId();
    return id ? this.buildCastView(id) : null;
  });

  /**
   * O mesmo aviso montado pelos eventos da mesa, pro palco de quem lança (roll-modal): todo mundo
   * vê a carta entrar e os dados aparecerem com o mesmo evento, ao mesmo tempo.
   */
  readonly castViewFor = (castId: string): CastStageView | null => this.buildCastView(castId);

  private buildCastView(id: string): CastStageView | null {
    this.castStagesVersion();
    const stage = this.castStages.get(id);
    if (!stage) return null;
    // Magia (carta buscada pela API) ou ataque com arma (carta vinda de quem atacou, 1.6.1).
    const weapon = stage.weapon ?? null;
    const monsterAction = stage.monster_action ?? null;
    const monster = stage.monster ?? null;
    const card = monsterAction
      ? monsterActionToCard(monsterAction, monster?.image_url ?? null)
      : weapon
        ? weaponInfoToCard(weapon)
        : stage.spell
          ? spellToCard({ ...stage.spell, description: null })
          : null;
    if (!card) return null;
    const byId = new Map((this.sessionDetail()?.recent_rolls ?? []).map((r) => [r.id_roll, r]));
    return {
      key: id,
      actorName: stage.actor_name,
      verb: monsterAction ? monsterCastVerb(monsterAction) : castVerb(!!weapon),
      spellName: monsterAction?.name ?? weapon?.name ?? stage.spell?.name ?? '',
      // Ação de monstro (1.13.0): quem age é a carta do monstro, com o que a mesa vê dele.
      actor: monster
        ? {
            name: monster.name,
            imageUrl: monster.image_url,
            avatarPreset: null,
            // A descrição não vem na etapa: sai da lista (revelados do jogador / monstros do mestre).
            monsterCard: monsterToCard({
              name: monster.name,
              imageUrl: monster.image_url,
              monsterType: monster.monster_type,
              size: monster.size,
              lore: this.monsterLore(monster.id_monster_session),
            }),
          }
        : this.characterCardFor(stage.id_character ?? -1, stage.actor_name),
      card,
      rolls: stage.rolls.flatMap((ref) => {
        const entry = byId.get(ref.id_roll);
        return entry ? [castRollView(ref, entry)] : [];
      }),
      saveNote: stage.save_dc && stage.save_ability ? saveNote(stage.save_dc, stage.save_ability) : null,
      applied: stage.applied ?? [],
      done: stage.phase === 'done',
    };
  }

  /** A gaveta de ações avisou que este lançamento é de quem está olhando (acompanha no modal). */
  markOwnCast(castId: string): void {
    this.ownCastIds.add(castId);
  }

  onSpellCastStage(stage: SessionEventPayloadMap['spell_cast_stage']): void {
    const me = this.authService.currentUser()?.id;
    const own = stage.user_id === me && this.ownCastIds.has(stage.cast_id);
    if (stage.phase === 'cancel') {
      this.cancelCast(stage.cast_id);
      return;
    }
    if (!own && this.closedCastIds.has(stage.cast_id)) return;
    // Etapa fora de ordem: "terminou" já chegou, uma "em andamento" atrasada não volta atrás.
    if (this.castStages.get(stage.cast_id)?.phase === 'done' && stage.phase === 'open') return;
    this.castStages.set(stage.cast_id, stage);
    this.castStagesVersion.update((v) => v + 1);
    // Quem lança acompanha no próprio painel (que lê este mesmo estado), não no aviso da mesa.
    if (own) return;

    const active = this.activeCastId();
    if (!active) {
      this.activeCastId.set(stage.cast_id);
    } else if (active !== stage.cast_id) {
      if (!this.castNoticeQueue.includes(stage.cast_id)) this.castNoticeQueue.push(stage.cast_id);
      return;
    }
    this.onActiveCastUpdated(stage);
  }

  /**
   * O palco revelou o total de uma rolagem (depois da carta virar e dos dados pararem): só agora o
   * impacto de dano em tela cheia e o comentário do Tom tocam — juntos com o número na tela.
   */
  onCastRollRevealed(idRoll: string): void {
    if (this.castReactedRollIds.has(idRoll)) return;
    const entry = this.sessionDetail()?.recent_rolls.find((r) => r.id_roll === idRoll);
    if (!entry) return;
    this.castReactedRollIds.add(idRoll);
    if (entry.roll_type === 'damage' || entry.roll_type === 'heal') this.damageImpact.trigger(entry);
    this.reactTomToRoll(entry);
  }

  /** Tempo pra sumir: alguns segundos depois de "terminou", ou o máximo sem notícia. */
  private onActiveCastUpdated(stage: SessionEventPayloadMap['spell_cast_stage']): void {
    if (this.castNoticeTimer) clearTimeout(this.castNoticeTimer);
    this.castNoticeTimer = setTimeout(
      () => this.closeCastNotice(),
      stage.phase === 'done' ? SPELL_CAST_DONE_MS : this.CAST_NOTICE_SAFETY_MS,
    );
  }

  /** Quem lança fechou sem rolar: o aviso some na hora (ou sai da fila). */
  private cancelCast(castId: string): void {
    this.castNoticeQueue = this.castNoticeQueue.filter((id) => id !== castId);
    if (this.activeCastId() === castId) {
      this.closeCastNotice();
      return;
    }
    this.closedCastIds.add(castId);
    this.castStages.delete(castId);
    this.castStagesVersion.update((v) => v + 1);
  }

  closeCastNotice(): void {
    if (this.castNoticeTimer) clearTimeout(this.castNoticeTimer);
    this.castNoticeTimer = null;
    const id = this.activeCastId();
    if (id) {
      this.closedCastIds.add(id);
      this.castStages.delete(id);
    }
    const next = this.castNoticeQueue.shift() ?? null;
    this.activeCastId.set(next);
    const stage = next ? this.castStages.get(next) : undefined;
    if (stage) this.onActiveCastUpdated(stage);
  }

  /** Card do personagem (jogador ou NPC), como na sessão — aviso de lançamento e gaveta de ações. */
  characterCardFor(idCharacter: number, fallbackName: string): CharacterCardData {
    const detail = this.sessionDetail();
    const player = detail?.players.find((p) => p.id_character === idCharacter && p.character);
    const npc = player ? undefined : detail?.npcs.find((n) => n.id_character === idCharacter);
    const summary = player?.character ?? npc?.character ?? null;
    return {
      name: summary?.name ?? fallbackName,
      imageUrl: this.imageUrlForCharacter(idCharacter),
      avatarPreset: this.avatarPresetForCharacter(idCharacter),
      character: summary
        ? {
            playerName: player ? player.player_name : null,
            className: summary.class,
            race: summary.race,
            level: summary.level,
            hp: {
              current: player ? this.editedHp(player) : summary.current_hit_points,
              max: summary.max_hit_points,
              temp: player ? this.editedTempHp(player) : (summary.temporary_hit_points ?? 0),
            },
            xp: summary.experience_points,
            nextLevelXp: summary.next_level_xp,
          }
        : null,
    };
  }

  /** ========================= TOAST: MAGIA LANÇADA (broadcast) =========================
   *  Puramente informativo — não persiste nada (ao contrário da rolagem), só o socket
   *  `spell_cast` reflete pra todo mundo na sessão, autor incluso. */

  readonly SPELL_CAST_TOAST_MS = 6_000;

  activeSpellCastToast = signal<{
    idCharacter: number;
    actorName: string;
    spellName: string;
    /** Ex: "CD 14 de Destreza" — só magia de resistência. */
    saveNote: string | null;
    /** Habilidade de classe → "USOU"; magia → "LANÇOU". */
    isAbility: boolean;
    /** Verbo próprio (ex.: "APLICOU" no aviso de dano/cura aplicado), no lugar de USOU/LANÇOU. */
    verb?: string;
    /** Alvos do aviso "aplicou" — vários alvos seguidos do mesmo valor viram um aviso só. */
    targets?: string[];
    key: number;
  } | null>(null);
  private spellCastToastTimer: ReturnType<typeof setTimeout> | null = null;
  private spellCastToastCounter = 0;

  /** Aplicação dentro de um lançamento aparece no aviso dele (etapa com `applied`), sem aviso
   *  avulso por cima; fora de lançamento continua o aviso "APLICOU". */
  onAmountApplied(event: SessionEventPayloadMap['amount_applied']): void {
    if (event.cast_id) return;
    this.showAmountAppliedToast(
      event.id_character,
      event.actor_name,
      event.amount,
      event.kind,
      event.target_label,
    );
  }

  /** "Ana APLICOU 8 de dano em Goblin" — o mesmo valor em vários alvos seguidos junta os nomes. */
  showAmountAppliedToast(
    idCharacter: number,
    actorName: string,
    amount: number,
    kind: 'damage' | 'heal' | 'temp_hp',
    target: string,
  ): void {
    const what =
      kind === 'damage' ? `${amount} de dano` : kind === 'heal' ? `${amount} de cura` : `${amount} PV temporários`;
    const current = this.activeSpellCastToast();
    const targets =
      current?.verb === 'APLICOU' && current.idCharacter === idCharacter && current.spellName === what
        ? [...(current.targets ?? []), target]
        : [target];
    this.showSpellCastToast(idCharacter, actorName, what, `em ${targets.join(', ')}`);
    this.activeSpellCastToast.update((t) => (t ? { ...t, verb: 'APLICOU', targets } : t));
  }

  private showSpellCastToast(
    idCharacter: number,
    actorName: string,
    spellName: string,
    saveNote: string | null = null,
    isAbility = false,
  ): void {
    if (this.spellCastToastTimer) clearTimeout(this.spellCastToastTimer);
    this.spellCastToastCounter++;
    this.activeSpellCastToast.set({
      idCharacter,
      actorName,
      spellName,
      saveNote,
      isAbility,
      key: this.spellCastToastCounter,
    });
    this.spellCastToastTimer = setTimeout(
      () => this.activeSpellCastToast.set(null),
      this.SPELL_CAST_TOAST_MS,
    );
  }

  closeSpellCastToast(): void {
    if (this.spellCastToastTimer) clearTimeout(this.spellCastToastTimer);
    this.activeSpellCastToast.set(null);
  }

  /** ========================= TOM: REAÇÕES A EVENTOS DA SESSÃO =========================
   *  Mesmo mascote da criação de personagem, mas aqui ele só comenta o que está acontecendo —
   *  parado no canto esquerdo (variant="left"), sem guiar nenhum fluxo. Volta pro estado neutro
   *  sozinho depois de alguns segundos. */

  readonly TOM_REACTION_MS = 6_000;
  private readonly tomIdleState = { image: 'tom.png', message: '' };

  tomState = signal<{ image: string; message: string }>(this.tomIdleState);
  private tomReactionTimer: ReturnType<typeof setTimeout> | null = null;

  private reactTom(image: string, message: string): void {
    if (this.tomReactionTimer) clearTimeout(this.tomReactionTimer);
    this.tomState.set({ image, message });
    this.tomReactionTimer = setTimeout(() => this.tomState.set(this.tomIdleState), this.TOM_REACTION_MS);
  }

  /** Uma das opções, sorteada — evita que a mesma piada apareça toda vez que alguém tira o
   *  mesmo resultado. */
  private pickTomLine(options: string[]): string {
    return options[Math.floor(Math.random() * options.length)];
  }

  /** Só comenta rolagens de d20 (ataque/perícia/resistência/iniciativa) — dano e dados livres
   *  ficam de fora pra não reagir a todo dado rolado na sessão. Vantagem/desvantagem: o valor
   *  "puro" do dado escolhido é `total - modifier`, já que só o dado contado entra na soma.
   *  Nat 20/1 têm reação própria (regra do d20, usa o dado puro); fora isso, a escala usa
   *  `total` com bônus incluído: <8 ruim, 8-14 mais ou menos, 15+ bem — Tom é irônico/sarcástico
   *  o tempo todo e ri abertamente das rolagens ruins. */
  private reactTomToRoll(roll: RollLogEntry): void {
    if (!['attack', 'skill', 'save', 'initiative'].includes(roll.roll_type)) return;
    const name = roll.actor_name;
    const natural = roll.total - roll.modifier;
    if (natural === 20) {
      this.reactTom('tom-celebrating.png', this.pickTomLine([
        `NAT 20, ${name}?! Guarda essa data no calendário.`,
        `Uau. ${name} acertou o crítico. Nem eu esperava por essa.`,
        `20 natural! Até relógio parado acerta a hora, ${name}.`,
      ]));
    } else if (natural === 1) {
      this.reactTom('tom-stop.png', this.pickTomLine([
        `HAHAHA! Nat 1, ${name}? Isso vai ficar guardado.`,
        `1 natural... desculpa, eu ri. De verdade, ${name}.`,
        `Que vergonha alheia, ${name}. NAT 1!`,
      ]));
    } else if (roll.total >= 15) {
      this.reactTom('tom-like.png', this.pickTomLine([
        `Ora ora, ${name} mandou bem (${roll.total}). Quem diria.`,
        `${roll.total}! Olha só quem resolveu aparecer hoje, ${name}.`,
        `Nada mal, ${name}. ${roll.total} até que impressiona.`,
      ]));
    } else if (roll.total < 8) {
      this.reactTom('tom-stop.png', this.pickTomLine([
        `HAHA, ${roll.total}? Isso foi memorável, ${name}.`,
        `Ai, ${name}... ${roll.total}. Eu avisei pra treinar mais.`,
        `${roll.total}?! Eu ri igual, relaxa, ${name}.`,
      ]));
    } else {
      this.reactTom('tom.png', this.pickTomLine([
        `${roll.total}, ${name}. Nem herói, nem vilão da história.`,
        `${roll.total}... mediano que nem meu dia, ${name}.`,
        `${name} tirou ${roll.total}. Vai que cola.`,
      ]));
    }
  }

  /** Confirmação de acerto/erro contra a CA do alvo, vinda do roll-modal (via player-actions-modal). */
  onAttackResolved(actorName: string, hit: boolean): void {
    if (hit) {
      this.reactTom('tom-celebrating.png', this.pickTomLine([
        `${actorName} acertou! Nem tudo está perdido.`,
        `Olha isso, ${actorName} acertou o ataque. Impressionante, por incrível que pareça.`,
      ]));
    } else {
      this.reactTom('tom-stop.png', this.pickTomLine([
        `HAHA, ${actorName} errou feio. Bora, tenta de novo.`,
        `Ih, errou, ${actorName}. Vou fingir que não vi isso.`,
      ]));
    }
  }

  /** ========================= TOAST: PERSONAGEM PODE SUBIR DE NÍVEL (broadcast) ========================= */

  readonly LEVEL_UP_ELIGIBLE_TOAST_MS = 6_000;

  /** Um aviso só pra todos que ficam aptos juntos (XP pra vários de uma vez) — antes cada evento
   *  substituía o anterior e a mesa só via um nome. */
  activeLevelUpEligibleToast = signal<{
    entries: { name: string; avatarPreset: AvatarPreset | null }[];
    key: number;
  } | null>(null);
  private levelUpEligibleToastTimer: ReturnType<typeof setTimeout> | null = null;
  private levelUpEligibleCounter = 0;

  /** "THORIN SUBIU DE NÍVEL!" / "THORIN E ANA SUBIRAM DE NÍVEL!" */
  levelUpEligibleText(entries: { name: string }[]): string {
    const names = entries.map((e) => e.name);
    const joined = names.length > 1 ? `${names.slice(0, -1).join(', ')} E ${names[names.length - 1]}` : names[0];
    return `${joined} ${names.length > 1 ? 'SUBIRAM' : 'SUBIU'} DE NÍVEL!`;
  }

  showLevelUpEligibleToast(name: string, avatarPreset: AvatarPreset | null): void {
    if (this.levelUpEligibleToastTimer) clearTimeout(this.levelUpEligibleToastTimer);
    const current = this.activeLevelUpEligibleToast();
    if (current) {
      // Junta no aviso aberto (sem repetir o nome); mesma `key` pra não refazer a explosão.
      if (!current.entries.some((e) => e.name === name)) {
        this.activeLevelUpEligibleToast.set({ ...current, entries: [...current.entries, { name, avatarPreset }] });
      }
    } else {
      this.levelUpEligibleCounter++;
      this.activeLevelUpEligibleToast.set({ entries: [{ name, avatarPreset }], key: this.levelUpEligibleCounter });
    }
    this.levelUpEligibleToastTimer = setTimeout(
      () => this.activeLevelUpEligibleToast.set(null),
      this.LEVEL_UP_ELIGIBLE_TOAST_MS,
    );
  }

  closeLevelUpEligibleToast(): void {
    if (this.levelUpEligibleToastTimer) clearTimeout(this.levelUpEligibleToastTimer);
    this.activeLevelUpEligibleToast.set(null);
  }

  /** ========================= MODAL: MONSTRO REVELADO (broadcast) ========================= */

  /** Tempo do aviso: a carta caindo e virando (~2,4 s) e a leitura da descrição (1.11.0). */
  readonly MONSTER_ANNOUNCEMENT_MS = 30_000;

  /** `key` incremental — mesmo motivo do roll-toast/monster-defeated-toast: força o @for a
   *  recriar o painel mesmo se dois monstros seguidos tiverem o mesmo nome. */
  activeMonsterAnnouncement = signal<(MonsterRevealInfo & { key: number }) | null>(null);
  private monsterAnnouncementQueue: MonsterRevealInfo[] = [];
  private monsterAnnouncementTimer: ReturnType<typeof setTimeout> | null = null;
  private monsterAnnouncementCounter = 0;

  /**
   * Dispara ao revelar um monstro manualmente (toggleMonsterReveal) e ao entrar em combate
   * (o backend revela e anuncia automaticamente quem ainda não tinha sido revelado, antes do
   * combat_started) — mesmo evento de socket (`monster_revealed`) pros dois casos. Fila porque
   * um combate pode revelar vários monstros de uma vez; mostra um de cada vez.
   */
  private queueMonsterAnnouncement(info: MonsterRevealInfo): void {
    this.monsterAnnouncementQueue.push(info);
    if (!this.activeMonsterAnnouncement()) this.showNextMonsterAnnouncement();
  }

  private showNextMonsterAnnouncement(): void {
    const next = this.monsterAnnouncementQueue.shift();
    if (!next) {
      this.activeMonsterAnnouncement.set(null);
      return;
    }
    this.monsterAnnouncementCounter++;
    this.activeMonsterAnnouncement.set({ ...next, key: this.monsterAnnouncementCounter });
    this.monsterAnnouncementTimer = setTimeout(
      () => this.showNextMonsterAnnouncement(),
      this.MONSTER_ANNOUNCEMENT_MS,
    );
  }

  closeMonsterAnnouncement(): void {
    if (this.monsterAnnouncementTimer) clearTimeout(this.monsterAnnouncementTimer);
    this.showNextMonsterAnnouncement();
  }

  /** Avatar de um personagem da sessão (jogador ou NPC), buscando pelo id_character — base de
   *  rollToastAvatarPreset e do toast de magia lançada. */
  avatarPresetForCharacter(idCharacter: number | null): AvatarPreset | null {
    if (idCharacter === null) return null;
    const detail = this.sessionDetail();
    if (!detail) return null;
    const player = detail.players.find((p) => p.id_character === idCharacter);
    if (player) return player.character?.avatar_preset ?? null;
    const npc = detail.npcs.find((n) => n.id_character === idCharacter);
    return npc?.character?.avatar_preset ?? null;
  }

  /** Foto de fundo de um personagem da sessão (à parte do avatar_preset) — mesma busca de
   *  avatarPresetForCharacter, retornando a imagem de verdade em vez do preset. */
  imageUrlForCharacter(idCharacter: number | null): string | null {
    if (idCharacter === null) return null;
    const detail = this.sessionDetail();
    if (!detail) return null;
    const player = detail.players.find((p) => p.id_character === idCharacter);
    if (player) return player.character?.image_url ?? null;
    const npc = detail.npcs.find((n) => n.id_character === idCharacter);
    return npc?.character?.image_url ?? null;
  }

  /** Avatar de quem rolou, buscando entre jogadores e NPCs da sessão pelo id_character da rolagem. */
  rollToastAvatarPreset(roll: RollLogEntry): AvatarPreset | null {
    return this.avatarPresetForCharacter(roll.id_character);
  }

  /** Foto de fundo do painel de rolagem (à parte do avatar_preset) — mesma busca de
   *  rollToastAvatarPreset, retornando a imagem de verdade em vez do preset. */
  rollToastImageUrl(roll: RollLogEntry): string | null {
    return this.imageUrlForCharacter(roll.id_character);
  }

  /** ========================= COMBATE / TURNOS ========================= */

  combatStartOpen = signal(false);
  endingTurn = signal(false);
  endingCombat = signal(false);
  movingParticipantId = signal<string | null>(null);
  delayingTurn = signal(false);
  activeInitiativeRoll = signal<{
    idCombatParticipant: string;
    idCharacter: number;
    actorName: string;
    config: AbilityRollConfig;
  } | null>(null);
  /**
   * Participantes cuja iniciativa já foi enviada por este cliente. Existe pra evitar que o
   * banner "a batalha vai começar" reapareça no intervalo entre enviar a rolagem e o socket
   * trazer o sessionDetail atualizado — sem isso dava pra rolar de novo nessa janela.
   */
  private initiativeSubmitted = signal<Set<string>>(new Set());

  combat = computed(() => this.sessionDetail()?.combat ?? null);

  /** Participante (jogador) do usuário atual que ainda não rolou iniciativa nessa luta — inclui
   *  quem entrou depois num combate já 'active' (ver CombatService.addParticipants no backend). */
  myPendingInitiativeParticipant = computed<CombatParticipant | null>(() => {
    const combat = this.combat();
    const detail = this.sessionDetail();
    const user = this.authService.currentUser();
    if (!combat || combat.encounter.status === 'finished' || !detail || !user) return null;

    const submitted = this.initiativeSubmitted();
    return (
      combat.participants.find(
        (p) =>
          p.participant_type === 'player' &&
          p.initiative_total === null &&
          !submitted.has(p.id_combat_participant) &&
          detail.players.some((pl) => pl.id_player_session === p.id_player_session && pl.user_id === user.id),
      ) ?? null
    );
  });

  /** ========================= ANIMAÇÃO DE TROCA DE VEZ ========================= */

  // Opcional: nos testes o componente é criado sem view (sem ElementRef).
  private host = inject<ElementRef<HTMLElement>>(ElementRef, { optional: true });
  private turnState: TurnState = { encounterId: null, currentId: null };
  private turnOffsets = new Map<string, TurnOffset>();
  /** Já viu o estado do combate uma vez (recarregar a página no meio da vez não abre a gaveta). */
  private turnStateSeen = false;
  private myTurnDrawerTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingMyTurn: string | null = null;

  /** Depois de cada renderização em que o combate mudou: se a vez passou pra outro
   *  participante, desliza o marcador do card antigo pro novo; e guarda as posições pra próxima. */
  private turnAnimation = afterRenderEffect(() => {
    const combat = this.combat();
    const next: TurnState = {
      encounterId: combat?.encounter.id_combat_encounter ?? null,
      currentId: combat?.encounter.status === 'active' ? combat.encounter.current_turn_participant_id : null,
    };
    const list = this.host?.nativeElement.querySelector<HTMLElement>('.combat-order-list') ?? null;
    const animate = shouldAnimateTurn(this.turnState, next);
    if (animate) {
      if (list) playTurnSlide(list, this.turnOffsets.get(this.turnState.currentId!), next.currentId!);
      this.showTurnChangeToast(this.turnState.currentId!, next.currentId!);
    }
    // Começou a vez do meu personagem (troca de vez ou início do combate): a gaveta de ações abre
    // sozinha depois do aviso de troca de vez.
    if (
      this.turnStateSeen &&
      next.currentId &&
      next.currentId !== this.turnState.currentId &&
      this.myPlayerForParticipant(next.currentId)
    ) {
      this.scheduleMyTurnDrawer(next.currentId, animate ? TURN_CHANGE_TOAST_MS : 0);
    }
    // Começou a vez de um monstro: pro mestre, a ficha dele abre sozinha (ações e FINALIZAR TURNO).
    if (
      this.turnStateSeen &&
      this.isOwner() &&
      next.currentId &&
      next.currentId !== this.turnState.currentId &&
      this.monsterForParticipant(next.currentId)
    ) {
      this.scheduleMonsterTurnSheet(next.currentId, animate ? TURN_CHANGE_TOAST_MS : 0);
    }
    this.checkLairCount(next);
    this.turnStateSeen = true;
    this.turnState = next;
    this.turnOffsets = snapshotTurnOffsets(list);
  });

  /** Aviso em tela cheia pra mesa quando a vez passa (além do pulso na lista de iniciativa). */
  turnChangeToast = signal<{
    key: number;
    from: TurnCard | null;
    to: TurnCard;
    round: number;
    isMine: boolean;
  } | null>(null);
  private turnChangeToastTimer: ReturnType<typeof setTimeout> | null = null;
  private turnChangeToastCounter = 0;

  /** Nome, foto e avatar de um participante do combate como a mesa o vê. */
  turnCardFor(p: CombatParticipant): TurnCard {
    const detail = this.sessionDetail();
    const name = this.combatParticipantName(p);
    if (p.participant_type === 'monster') {
      const image = this.isOwner()
        ? detail?.monsters.find((m) => m.id_monster_session === p.id_monster_session)?.image_url
        : detail?.revealed_monsters.find((m) => m.id_monster_session === p.id_monster_session)?.image_url;
      // A carta do monstro (1.13.0); escondido, pro jogador continua o "misterioso" sem carta.
      const monsterCard = p.id_monster_session ? this.monsterCardFor(p.id_monster_session) : null;
      return { name, imageUrl: image || this.DEFAULT_MONSTER_IMAGE, avatarPreset: null, monsterCard };
    }
    const player =
      p.participant_type === 'player'
        ? detail?.players.find((pl) => pl.id_player_session === p.id_player_session)
        : undefined;
    const npc =
      p.participant_type === 'npc' ? detail?.npcs.find((n) => n.id_npc_session === p.id_npc_session) : undefined;
    const idCharacter = player?.id_character ?? npc?.id_character ?? null;
    // Card inteiro (como na sessão): jogador, classe, raça, nível e PV.
    if (idCharacter === null) return { name, imageUrl: null, avatarPreset: null, character: null };
    return { ...this.characterCardFor(idCharacter, name), name };
  }


  /**
   * Carta do monstro pros avisos (troca de vez, tela de lançamento): o mestre vê a de qualquer
   * monstro da mesa; o jogador, só a dos revelados (`null` = escondido).
   */
  monsterCardFor(idMonsterSession: string): GameCardData | null {
    const detail = this.sessionDetail();
    if (this.isOwner()) {
      const m = detail?.monsters.find((x) => x.id_monster_session === idMonsterSession);
      if (!m) return null;
      return monsterToCard({
        name: this.monsterDisplayName(m),
        imageUrl: m.image_url,
        monsterType: m.data_snapshot.type,
        size: m.data_snapshot.size,
        lore: m.lore,
      });
    }
    const r = detail?.revealed_monsters.find((x) => x.id_monster_session === idMonsterSession);
    if (!r) return null;
    return monsterToCard({
      name: r.name,
      imageUrl: r.image_url,
      monsterType: r.monster_type,
      size: r.size,
      lore: r.lore,
    });
  }

  private monsterLore(idMonsterSession: string): string | null {
    const detail = this.sessionDetail();
    return (
      detail?.revealed_monsters.find((m) => m.id_monster_session === idMonsterSession)?.lore ??
      detail?.monsters.find((m) => m.id_monster_session === idMonsterSession)?.lore ??
      null
    );
  }

  /** Jogador deste navegador dono do participante (só personagem de jogador). */
  private myPlayerForParticipant(participantId: string): PlayerSession | null {
    const p = this.combat()?.participants.find((c) => c.id_combat_participant === participantId);
    const user = this.authService.currentUser();
    if (!p || p.participant_type !== 'player' || !user) return null;
    return (
      this.sessionDetail()?.players.find(
        (pl) => pl.id_player_session === p.id_player_session && pl.user_id === user.id && pl.character,
      ) ?? null
    );
  }

  private monsterTurnTimer: ReturnType<typeof setTimeout> | null = null;

  /** Ações de covil (1.11.0): monstros no covil quando a vez passou pela contagem 20 (só o mestre). */
  lairReminder = signal<MonsterSession[] | null>(null);
  /** Última vez vista pra conta do covil (combate e rodada). */
  private lairPrev: (LairPoint & { encounterId: string; currentId: string }) | null = null;

  private checkLairCount(next: TurnState): void {
    const combat = this.combat();
    const current = combat?.participants.find((p) => p.id_combat_participant === next.currentId);
    if (!combat || !next.encounterId || !next.currentId || !current) {
      this.lairPrev = null;
      return;
    }
    const point = {
      encounterId: next.encounterId,
      currentId: next.currentId,
      initiative: current.initiative_total ?? 0,
      round: combat.encounter.round_number,
    };
    const prev = this.lairPrev?.encounterId === point.encounterId ? this.lairPrev : null;
    const changed = !prev || prev.currentId !== point.currentId || prev.round !== point.round;
    this.lairPrev = point;
    // Recarregar a página no meio do combate não repete o lembrete.
    if (!changed || !this.turnStateSeen || !this.isOwner() || !crossedLairCount(prev, point)) return;
    const inCombat = new Set(combat.participants.map((p) => p.id_monster_session));
    const inLair = (this.sessionDetail()?.monsters ?? []).filter(
      (m) =>
        inCombat.has(m.id_monster_session) && m.action_state?.in_lair && !!m.data_snapshot.lair_actions,
    );
    if (inLair.length) this.lairReminder.set(inLair);
  }

  openLairMonster(monster: MonsterSession): void {
    this.lairReminder.set(null);
    this.openMonsterDetail(monster);
  }

  private monsterForParticipant(participantId: string): MonsterSession | null {
    const p = this.combat()?.participants.find((c) => c.id_combat_participant === participantId);
    if (!p || p.participant_type !== 'monster') return null;
    return this.sessionDetail()?.monsters.find((m) => m.id_monster_session === p.id_monster_session) ?? null;
  }

  private scheduleMonsterTurnSheet(participantId: string, delayMs: number): void {
    if (this.monsterTurnTimer) clearTimeout(this.monsterTurnTimer);
    this.monsterTurnTimer = setTimeout(() => this.openMonsterTurnSheet(participantId), delayMs);
  }

  /** Abre a ficha do monstro da vez — se ainda é a vez dele e o mestre não está rolando nada. */
  openMonsterTurnSheet(participantId: string): void {
    this.monsterTurnTimer = null;
    if (this.combat()?.encounter.current_turn_participant_id !== participantId) return;
    if (this.activeMonsterRoll() || this.dmRollOpen()) return;
    const monster = this.monsterForParticipant(participantId);
    if (monster) this.openMonsterDetail(monster);
  }

  private scheduleMyTurnDrawer(participantId: string, delayMs: number): void {
    if (this.myTurnDrawerTimer) clearTimeout(this.myTurnDrawerTimer);
    this.pendingMyTurn = participantId;
    this.myTurnDrawerTimer = setTimeout(() => this.openMyTurnDrawer(), delayMs);
  }

  /** Abre a gaveta do personagem da vez com o destaque SUA VEZ — se a vez ainda é dele e não há
   *  outra gaveta aberta. As ações (atacar, magias, testes) continuam todas disponíveis. */
  openMyTurnDrawer(): void {
    if (this.myTurnDrawerTimer) clearTimeout(this.myTurnDrawerTimer);
    this.myTurnDrawerTimer = null;
    const participantId = this.pendingMyTurn;
    this.pendingMyTurn = null;
    const combat = this.combat();
    if (!participantId || combat?.encounter.current_turn_participant_id !== participantId) return;
    const player = this.myPlayerForParticipant(participantId);
    const open = this.activeActionsCharacter();
    if (!player || (open && open.id !== player.id_character)) return;
    this.activeActionsCharacter.set({
      id: player.id_character,
      name: player.character!.name,
      turnFocus: true,
    });
  }

  showTurnChangeToast(fromId: string, toId: string): void {
    const combat = this.combat();
    const to = combat?.participants.find((p) => p.id_combat_participant === toId);
    if (!combat || !to) return;
    const from = combat.participants.find((p) => p.id_combat_participant === fromId);
    const user = this.authService.currentUser();
    const isMine =
      to.participant_type === 'player' &&
      !!user &&
      !!this.sessionDetail()?.players.some(
        (pl) => pl.id_player_session === to.id_player_session && pl.user_id === user.id,
      );
    if (this.turnChangeToastTimer) clearTimeout(this.turnChangeToastTimer);
    this.turnChangeToastCounter++;
    this.turnChangeToast.set({
      key: this.turnChangeToastCounter,
      from: from ? this.turnCardFor(from) : null,
      to: this.turnCardFor(to),
      round: combat.encounter.round_number,
      isMine,
    });
    this.turnChangeToastTimer = setTimeout(() => this.turnChangeToast.set(null), TURN_CHANGE_TOAST_MS);
  }

  closeTurnChangeToast(): void {
    if (this.turnChangeToastTimer) clearTimeout(this.turnChangeToastTimer);
    this.turnChangeToast.set(null);
    // Fechou o aviso antes do tempo: a gaveta da vez abre já.
    if (this.pendingMyTurn) this.openMyTurnDrawer();
  }

  currentTurnParticipant = computed<CombatParticipant | null>(() => {
    const combat = this.combat();
    if (!combat || combat.encounter.status !== 'active') return null;
    return combat.participants.find((p) => p.is_current_turn) ?? null;
  });

  /** ========================= PREPARAR MAGIAS ANTES DA LUTA ========================= */

  /** Já verificado (ou em verificação) pra esse participante — evita reconsultar a cada
   *  re-render enquanto a rolagem de iniciativa continuar pendente. */
  private battlePrepareCheckedFor = new Set<string>();
  checkingBattlePrepare = signal(false);
  showBattlePreparePrompt = signal(false);
  showBattlePrepareModal = signal(false);
  private battlePrepareSheet = signal<CharacterSheetResponse | null>(null);
  /** Recusa da API (ex.: já rolou a iniciativa) — aparece no modal em vez de sumir em silêncio. */
  battlePrepareError = signal<string | null>(null);

  private checkBattlePrepareSpells(pending: CombatParticipant): void {
    if (this.battlePrepareCheckedFor.has(pending.id_combat_participant)) return;
    const detail = this.sessionDetail();
    const player = detail?.players.find((p) => p.id_player_session === pending.id_player_session);
    if (!player) return;
    this.battlePrepareCheckedFor.add(pending.id_combat_participant);

    this.checkingBattlePrepare.set(true);
    this.charService.getCharacterById(player.id_character).subscribe({
      next: (sheet) => {
        this.checkingBattlePrepare.set(false);
        const info = sheet.character_sheet.spellcasting_info;
        const hasLeveledSpells = (sheet.character_sheet.spells ?? []).some((s) => s.spellLevel > 0);
        if (info?.prepares_spells && hasLeveledSpells) {
          this.battlePrepareSheet.set(sheet);
          this.showBattlePreparePrompt.set(true);
        }
      },
      error: () => this.checkingBattlePrepare.set(false),
    });
  }

  declineBattlePrepare(): void {
    this.showBattlePreparePrompt.set(false);
    this.battlePrepareSheet.set(null);
  }

  openBattlePrepareModal(): void {
    this.showBattlePreparePrompt.set(false);
    this.battlePrepareError.set(null);
    this.showBattlePrepareModal.set(true);
  }

  closeBattlePrepareModal(): void {
    this.showBattlePrepareModal.set(false);
    this.battlePrepareSheet.set(null);
    this.battlePrepareError.set(null);
  }

  battlePrepareCircleName(circle: number): string {
    return `${circle}º CÍRCULO`;
  }

  /** Mesmo agrupamento de spellsByCircle (character-sheet.component), sem os truques — nível 0
   *  nunca precisa de preparo. */
  battlePrepareGroups(): { circle: number; spells: Spell[] }[] {
    const spells = this.battlePrepareSheet()?.character_sheet.spells ?? [];
    const map = new Map<number, Spell[]>();
    for (const spell of spells) {
      if (spell.spellLevel === 0) continue;
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

  battlePreparedCount(): number {
    return (this.battlePrepareSheet()?.character_sheet.spells ?? []).filter((s) => s.is_prepared).length;
  }

  battlePrepareMax(): number {
    return this.battlePrepareSheet()?.character_sheet.spellcasting_info?.max_prepared_spells ?? 0;
  }

  battleCanPrepareMore(): boolean {
    return this.battlePreparedCount() < this.battlePrepareMax();
  }

  /**
   * O checkbox nativo se marca sozinho no clique — se o preparo for recusado (limite ou API), ele
   * volta pro estado real (`box.checked`), senão ficaria marcado sem ter gravado nada.
   */
  battleTogglePrepared(spell: Spell, event?: Event): void {
    const box = event?.target as HTMLInputElement | undefined;
    const revert = () => {
      if (box) box.checked = !!spell.is_prepared;
    };
    const id = this.battlePrepareSheet()?.character_sheet.id_character;
    if (!id) return revert();
    const next = !spell.is_prepared;
    if (next && !this.battleCanPrepareMore()) return revert();

    this.battlePrepareError.set(null);
    this.charService.setSpellPrepared(id, spell.id_spell, next).subscribe({
      error: (err) => {
        revert();
        this.battlePrepareError.set(apiErrorMessage(err, 'Não foi possível preparar a magia.'));
      },
      next: () => {
        this.battlePrepareSheet.update((sheet) =>
          sheet
            ? {
                ...sheet,
                character_sheet: {
                  ...sheet.character_sheet,
                  spells: (sheet.character_sheet.spells ?? []).map((s) =>
                    s.id_spell === spell.id_spell ? { ...s, is_prepared: next } : s,
                  ),
                },
              }
            : sheet,
        );
      },
    });
  }

  canEndCurrentTurn = computed(() => {
    const current = this.currentTurnParticipant();
    if (!current) return false;
    if (this.isOwner()) return true;
    if (current.participant_type !== 'player') return false;
    const user = this.authService.currentUser();
    const detail = this.sessionDetail();
    return (
      !!user &&
      !!detail &&
      detail.players.some((pl) => pl.id_player_session === current.id_player_session && pl.user_id === user.id)
    );
  });

  /** Mesma permissão de "finalizar turno" (mestre, ou o dono do turno atual) — só falta ainda
   *  não ter sido atrasado nesta rodada (só dá pra atrasar uma vez por rodada). */
  canDelayCurrentTurn = computed(() => {
    const current = this.currentTurnParticipant();
    return !!current && !current.delayed_this_round;
  });

  /** ========================= ROLAGEM DO MESTRE (pública ou oculta) ========================= */

  /** ========================= IMAGENS DE REFERÊNCIA ========================= */

  /** Mestre: biblioteca de imagens da sessão. */
  referenceImagesOpen = signal(false);
  /** Imagem que esta tela fechou só pra si (volta a aparecer quando o mestre mostrar outra). */
  dismissedReferenceImageId = signal<string | null>(null);
  /** Imagem em tela cheia agora — a que o mestre está mostrando, se esta tela não fechou. */
  visibleReferenceImage = computed(() => {
    const shown = this.sessionDetail()?.shown_reference_image ?? null;
    return shown && shown.id_reference_image !== this.dismissedReferenceImageId() ? shown : null;
  });

  /** Quando nenhuma imagem está aberta, esquece o "fechei pra mim" — a próxima aparece de novo. */
  private resetDismissedReferenceImage = effect(() => {
    if (!this.sessionDetail()?.shown_reference_image) {
      untracked(() => this.dismissedReferenceImageId.set(null));
    }
  });

  openReferenceImages(): void {
    this.referenceImagesOpen.set(true);
  }

  closeReferenceImages(): void {
    this.referenceImagesOpen.set(false);
  }

  dismissReferenceImage(): void {
    this.dismissedReferenceImageId.set(
      this.sessionDetail()?.shown_reference_image?.id_reference_image ?? null,
    );
  }

  hideReferenceImageForAll(): void {
    const id = this.id();
    if (!id) return;
    this.gameSessionService.hideReferenceImage(id).subscribe();
  }

  /** ========================= TESTE SECRETO ========================= */

  /** Jogador: o mestre apagou a sessão — para de atualizar e mostra o aviso (o mestre já saiu). */
  sessionEnded = signal(false);

  onSessionDeleted(): void {
    if (this.isOwner()) return;
    this.disconnectRealtime();
    this.stopPolling();
    this.sessionEnded.set(true);
  }

  /** Mestre apagou a sessão pelo quadro — volta pra lista de sessões dele. */
  onDmDeletedSession(): void {
    this.dmBoardOpen.set(false);
    this.router.navigate(['/my-sessions']);
  }

  /** Mestre: quadro do mestre (gaveta de baixo). Ações que abrem modal fecham a gaveta antes. */
  dmBoardOpen = signal(false);

  /** Mestre: grimório com todas as magias, aberto pelo Quadro do Mestre (fechar volta pro quadro). */
  dmGrimoireOpen = signal(false);

  /** Celular: quadro ROLAGENS começa recolhido (só a legenda, com a contagem). */
  mobileRollsOpen = signal(false);

  /**
   * Jogador: o próprio jogador (com personagem) — dono da gaveta AÇÕES DE PERSONAGEM.
   * O mestre não tem: os botões dele continuam nos cards de cada aventureiro.
   */
  myPlayer = computed(() => {
    if (this.isOwner()) return null;
    const userId = this.authService.currentUser()?.id;
    return this.sessionDetail()?.players.find((p) => p.user_id === userId && p.character) ?? null;
  });

  openDmBoard(): void {
    this.dmBoardOpen.set(true);
  }

  closeDmBoard(): void {
    this.dmBoardOpen.set(false);
  }

  /**
   * Quadro do mestre: dano/cura em vários alvos de uma vez (bola de fogo, armadilha, cura em
   * massa). Cada alvo passa pelo mesmo caminho do DANO/CURA do card, com o valor já reduzido à
   * metade quando o mestre marcou ½. Cura em jogador para no máximo (não vira PV temporário).
   */
  applyAreaAmount({ kind, targets }: AreaApplyRequest): void {
    const detail = this.sessionDetail();
    if (!detail) return;
    const sign = kind === 'heal' ? 1 : -1;
    for (const { type, id, amount } of targets) {
      if (type === 'player') {
        const player = detail.players.find((p) => p.id_player_session === id);
        if (!player?.character) continue;
        if (kind === 'damage') {
          this.applyPlayerDamage(player, amount);
        } else if (!this.savingHp().has(id)) {
          const healed = Math.min(player.character.max_hit_points, this.editedHp(player) + amount);
          this.commitPlayerHp(player, healed, this.editedTempHp(player));
        }
      } else if (type === 'npc') {
        const npc = detail.npcs.find((n) => n.id_npc_session === id);
        if (npc?.character) this.applyNpcHpDelta(npc, sign, amount);
      } else {
        const monster = detail.monsters.find((m) => m.id_monster_session === id);
        if (monster) this.applyMonsterHpDelta(monster, sign, amount);
      }
    }
  }

  /** Mestre: modal de pedir teste secreto. */
  secretRequestOpen = signal(false);
  /** Jogador: pedidos recebidos, um de cada vez. */
  pendingSecretRolls = signal<SecretRollPromptRequest[]>([]);

  openSecretRequest(): void {
    this.secretRequestOpen.set(true);
  }

  closeSecretRequest(): void {
    this.secretRequestOpen.set(false);
  }

  receiveSecretRoll(request: SecretRollPromptRequest): void {
    this.pendingSecretRolls.update((queue) =>
      queue.some((r) => r.request_id === request.request_id) ? queue : [...queue, request],
    );
  }

  finishSecretRoll(): void {
    this.pendingSecretRolls.update((queue) => queue.slice(1));
  }

  dmRollOpen = signal(false);

  get dmActorName(): string {
    // return this.sessionDetail()?.game_session.dm_name ?? 'Mestre';
    return 'Mestre';
  }

  openDmRoll(): void {
    this.dmRollOpen.set(true);
  }

  closeDmRoll(): void {
    this.dmRollOpen.set(false);
  }

  openStartFightModal(): void {
    this.combatStartOpen.set(true);
  }

  closeStartFightModal(): void {
    this.combatStartOpen.set(false);
    this.refreshSession();
  }

  addToCombatOpen = signal(false);

  openAddToCombatModal(): void {
    this.addToCombatOpen.set(true);
  }

  closeAddToCombatModal(): void {
    this.addToCombatOpen.set(false);
    this.refreshSession();
  }

  isPlayerCurrentTurn(player: PlayerSession): boolean {
    const current = this.currentTurnParticipant();
    return !!current && current.participant_type === 'player' && current.id_player_session === player.id_player_session;
  }

  isNpcCurrentTurn(npc: NpcSession): boolean {
    const current = this.currentTurnParticipant();
    return !!current && current.participant_type === 'npc' && current.id_npc_session === npc.id_npc_session;
  }

  isMonsterCurrentTurn(monster: MonsterSession): boolean {
    const current = this.currentTurnParticipant();
    return (
      !!current &&
      current.participant_type === 'monster' &&
      current.id_monster_session === monster.id_monster_session
    );
  }

  combatParticipantName(p: CombatParticipant): string {
    const detail = this.sessionDetail();
    if (!detail) return '???';
    if (p.participant_type === 'player') {
      const player = detail.players.find((pl) => pl.id_player_session === p.id_player_session);
      return player?.character?.name ?? player?.player_name ?? 'Jogador';
    }
    if (p.participant_type === 'monster') {
      if (this.isOwner()) {
        const monster = detail.monsters.find((m) => m.id_monster_session === p.id_monster_session);
        return monster ? this.monsterDisplayName(monster) : 'Monstro';
      }
      const revealed = detail.revealed_monsters.find((m) => m.id_monster_session === p.id_monster_session);
      return revealed?.name ?? 'Monstro misterioso';
    }
    const npc = detail.npcs.find((n) => n.id_npc_session === p.id_npc_session);
    return npc?.character?.name ?? 'NPC';
  }

  /** Faixa da vez no combate. `action` = é a vez de quem está olhando agir (mostra o d20). */
  turnBanner(current: CombatParticipant): { text: string; action: boolean } {
    const name = this.combatParticipantName(current);
    if (current.participant_type === 'npc' || current.participant_type === 'monster') {
      const label = current.participant_type === 'monster' ? 'MONSTRO' : 'NPC';
      return this.isOwner()
        ? { text: `TURNO DE ${name} — AJA PELO ${label}!`, action: true }
        : { text: `AGUARDANDO O MESTRE (${name})...`, action: false };
    }
    const user = this.authService.currentUser();
    const detail = this.sessionDetail();
    const isMe =
      !!user &&
      !!detail &&
      detail.players.some((pl) => pl.id_player_session === current.id_player_session && pl.user_id === user.id);
    return isMe
      ? { text: `É A SUA VEZ, ${name}!`, action: true }
      : { text: `AGUARDANDO ${name}...`, action: false };
  }

  openInitiativeRoll(pending: CombatParticipant): void {
    const detail = this.sessionDetail();
    const player = detail?.players.find((pl) => pl.id_player_session === pending.id_player_session);
    if (!player?.character) return;

    this.activeInitiativeRoll.set({
      idCombatParticipant: pending.id_combat_participant,
      idCharacter: player.id_character,
      actorName: player.character.name,
      config: { mode: 'ability', rollType: 'initiative', label: 'Iniciativa', modifier: pending.dex_modifier },
    });
  }

  closeInitiativeRoll(): void {
    this.activeInitiativeRoll.set(null);
  }

  /**
   * Iniciativa só pode ser rolada uma vez (o servidor rejeita uma segunda submissão) — fecha o
   * modal assim que a rolagem termina, antes que o jogador possa clicar em "ROLAR NOVAMENTE" e
   * ver um resultado diferente do que já foi de fato registrado. Depois disso ele vê a mesma
   * rolagem no feed da sessão, igual a todo mundo.
   */
  onInitiativeRolled(idCombatParticipant: string, result: { rolls: number[]; modifier: number; total: number }): void {
    this.closeInitiativeRoll();
    this.initiativeSubmitted.update((set) => new Set(set).add(idCombatParticipant));
    this.gameSessionService.submitInitiative(idCombatParticipant, result).subscribe({
      error: () => {
        // Falhou de verdade (rede etc.) — libera pra tentar de novo. Se o erro for porque já
        // tinha rolado antes, não tem problema nenhum manter marcado como enviado.
        this.initiativeSubmitted.update((set) => {
          const next = new Set(set);
          next.delete(idCombatParticipant);
          return next;
        });
      },
    });
  }

  /** Sem refetch — o socket ecoa `turn_ended` de volta (ver addNpc acima). */
  endTurn(): void {
    const combat = this.combat();
    if (!combat || this.endingTurn()) return;
    this.endingTurn.set(true);
    this.gameSessionService
      .endTurn(combat.encounter.id_combat_encounter)
      .pipe(finalize(() => this.endingTurn.set(false)))
      .subscribe();
  }

  /** Mestre reordena a iniciativa — move um participante uma posição pra cima/baixo. Sem
   *  refetch, mesmo padrão de endTurn. */
  moveParticipant(idCombatParticipant: string, direction: 'up' | 'down'): void {
    const combat = this.combat();
    if (!combat || this.movingParticipantId()) return;
    this.movingParticipantId.set(idCombatParticipant);
    this.gameSessionService
      .moveParticipant(combat.encounter.id_combat_encounter, idCombatParticipant, direction)
      .pipe(finalize(() => this.movingParticipantId.set(null)))
      .subscribe();
  }

  /** Jogador (ou mestre, pelo NPC/monstro da vez) atrasa o turno atual — passa a agir por
   *  último nesta rodada. Sem refetch, mesmo padrão de endTurn. */
  delayTurn(): void {
    const combat = this.combat();
    if (!combat || this.delayingTurn()) return;
    this.delayingTurn.set(true);
    this.gameSessionService
      .delayTurn(combat.encounter.id_combat_encounter)
      .pipe(finalize(() => this.delayingTurn.set(false)))
      .subscribe();
  }

  /** Se o combate tem monstros, pergunta antes se foram derrotados (pra passar pelo fluxo de
   *  XP); senão encerra direto — igual ao comportamento de hoje. */
  endCombat(): void {
    const combat = this.combat();
    if (!combat || this.endingCombat()) return;
    if (this.currentCombatMonsters().length > 0) {
      this.showEndCombatConfirm.set(true);
      return;
    }
    this.finishEncounter(combat.encounter.id_combat_encounter);
  }

  /** Sem refetch — o socket ecoa `combat_ended` de volta (ver addNpc acima). */
  private finishEncounter(idCombatEncounter: string): void {
    if (this.endingCombat()) return;
    this.endingCombat.set(true);
    this.gameSessionService
      .endEncounter(idCombatEncounter)
      .pipe(finalize(() => this.endingCombat.set(false)))
      .subscribe();
  }

  /** ========================= ENCERRAR COMBATE: MONSTROS FORAM DERROTADOS? ========================= */

  showEndCombatConfirm = signal(false);

  /** "Sim" — abre a distribuição de XP (soma o XP de todos os monstros do combate); só derrota
   *  os monstros e encerra o combate depois que o XP for concedido (ver onXpGranted). */
  confirmMonstersDefeated(): void {
    const combat = this.combat();
    this.showEndCombatConfirm.set(false);
    if (!combat) return;

    const monsters = this.currentCombatMonsters();
    const totalXp = monsters.reduce((sum, m) => sum + (m.data_snapshot?.xp ?? 0), 0);

    this.xpModalSuggestedAmount.set(totalXp || null);
    this.xpModalPreselected.set(this.currentCombatPlayerSessionIds());
    this.xpModalPendingMonsters.set(monsters);
    this.xpModalEndsCombat.set(combat.encounter.id_combat_encounter);
    this.showDistributeXpModal.set(true);
  }

  /** "Não" — encerra o combate normalmente, sem conceder XP nem derrotar ninguém. */
  declineMonstersDefeated(): void {
    const combat = this.combat();
    this.showEndCombatConfirm.set(false);
    if (combat) this.finishEncounter(combat.encounter.id_combat_encounter);
  }
}
