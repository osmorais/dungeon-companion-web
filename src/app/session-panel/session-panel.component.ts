import { Component, HostListener, OnDestroy, inject, input, signal, effect, untracked, computed } from '@angular/core';
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
  MonsterSession,
  NpcSession,
  PlayerSession,
  RevealedMonster,
  RollLogEntry,
} from '../models/game-session.interface';
import { CharacterSummary } from '../models/character-summary.interface';
import { AvatarPreset } from '../models/avatar-preset.interface';
import { AvatarDisplayComponent } from '../avatar-display/avatar-display.component';
import { PixelDieComponent } from '../pixel-die/pixel-die.component';
import { PixelNumericDieComponent } from '../pixel-numeric-die/pixel-numeric-die.component';
import { PlayerActionsModalComponent } from '../player-actions-modal/player-actions-modal.component';
import { StartFightModalComponent } from '../start-fight-modal/start-fight-modal.component';
import { DistributeXpModalComponent } from '../distribute-xp-modal/distribute-xp-modal.component';
import { AbilityRollConfig, RollModalComponent } from '../roll-modal/roll-modal.component';
import { AddMonsterModalComponent } from '../add-monster-modal/add-monster-modal.component';
import { TomAssistantComponent } from '../tom-assistant/tom-assistant.component';

@Component({
  selector: 'app-session-panel',
  standalone: true,
  imports: [
    FormsModule,
    AvatarDisplayComponent,
    PixelDieComponent,
    PixelNumericDieComponent,
    PlayerActionsModalComponent,
    StartFightModalComponent,
    DistributeXpModalComponent,
    RollModalComponent,
    AddMonsterModalComponent,
    TomAssistantComponent,
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

  id = input<string>();

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
  }

  ngOnDestroy() {
    this.disconnectRealtime();
    this.stopPolling();
    if (this.rollToastTimer) clearTimeout(this.rollToastTimer);
    if (this.monsterDefeatedToastTimer) clearTimeout(this.monsterDefeatedToastTimer);
    if (this.monsterAnnouncementTimer) clearTimeout(this.monsterAnnouncementTimer);
    if (this.levelUpEligibleToastTimer) clearTimeout(this.levelUpEligibleToastTimer);
  }

  /** Guarda a busca silenciosa (independente de `refreshing`, que é só pro botão/estado visível). */
  private pollInFlight = false;

  private connectRealtime(sessionId: string) {
    this.eventsSub = this.sessionState.connectRealtime(sessionId).subscribe((event) => {
      this.sessionState.applyEvent(event);
      if (event.type === 'monster_defeated') {
        this.showMonsterDefeatedToast(event.name, event.image_url);
        this.reactTom('tom-celebrating.png', `${event.name} foi derrotado! Vitória!`);
      }
      if (event.type === 'monster_revealed') {
        this.queueMonsterAnnouncement(event.name, event.image_url);
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

  activeActionsCharacter = signal<{ id: number; name: string } | null>(null);

  openPlayerActions(idCharacter: number, name: string) {
    this.activeActionsCharacter.set({ id: idCharacter, name });
  }

  closePlayerActions() {
    this.activeActionsCharacter.set(null);
  }

  viewCharacterSheet(idCharacter: number) {
    this.router.navigate(['/character-sheet', idCharacter]);
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
  applyPlayerDamage(player: PlayerSession) {
    const id = player.id_player_session;
    const amount = this.playerDamageInput(player);
    if (!amount || this.savingHp().has(id)) return;

    const currentTemp = this.editedTempHp(player);
    const nextTemp = Math.max(0, currentTemp - amount);
    const spillover = Math.max(0, amount - currentTemp);
    const nextHp = Math.max(0, this.editedHp(player) - spillover);

    this.clearPlayerDamageInput(player);
    this.commitPlayerHp(player, nextHp, nextTemp);
  }

  /**
   * Cura nunca restaura vida temporária (regra do livro). Se o valor curado ultrapassar o
   * máximo de PV, o excedente vira um pedido de vida temporária nova — como ela não acumula com
   * uma já existente, abre confirmação em vez de aplicar direto.
   */
  applyPlayerHeal(player: PlayerSession) {
    const id = player.id_player_session;
    const amount = this.playerDamageInput(player);
    if (!amount || this.savingHp().has(id)) return;

    const max = player.character!.max_hit_points;
    const wouldBe = this.editedHp(player) + amount;
    this.clearPlayerDamageInput(player);

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
      next: () => {
        this.sessionState.patch(detail => ({
          ...detail,
          players: detail.players.map(p =>
            p.id_player_session === id
              ? {
                  ...p,
                  character: p.character
                    ? { ...p.character, current_hit_points: newHp, temporary_hit_points: newTempHp }
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

  private applyNpcHpDelta(npc: NpcSession, sign: 1 | -1) {
    const id = npc.id_npc_session;
    const amount = this.npcDamageInput(npc);
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
    if (monster.custom_name) return monster.custom_name;
    return monster.monster_api_slug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
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

  private applyMonsterHpDelta(monster: MonsterSession, sign: 1 | -1) {
    const id = monster.id_monster_session;
    const amount = this.monsterDamageInput(monster);
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

  /** ========================= DETALHE DO MONSTRO (modal) ========================= */

  activeMonsterDetail = signal<MonsterSession | null>(null);

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
    return Object.entries(monster.data_snapshot.speed ?? {})
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  }

  hpPercent(current: number, max: number): number {
    if (max <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
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
    const pct = max <= 0 ? 0 : Math.max(0, Math.min(1, current / max));
    let r: number, g: number, b: number;
    if (pct >= 0.5) {
      // verde → amarelo (100% → 50%)
      const t = (pct - 0.5) / 0.5;
      r = Math.round(255 - (255 - 76) * t);
      g = Math.round(193 + (175 - 193) * t);
      b = Math.round(7 + (80 - 7) * t);
    } else {
      // amarelo → vermelho (50% → 0%)
      const t = pct / 0.5;
      r = Math.round(229 + (255 - 229) * t);
      g = Math.round(57 + (193 - 57) * t);
      b = Math.round(53 + (7 - 53) * t);
    }
    return `rgb(${r}, ${g}, ${b})`;
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
    // 'dice' e 'damage' sempre somam todos os dados (nunca descartam um por vantagem/desvantagem).
    if (roll.roll_type === 'dice' || roll.roll_type === 'damage' || roll.rolls.length < 2) return false;
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

    const lastVisible = [...newRolls].reverse().find((r) => !r.is_hidden);
    if (lastVisible) this.reactTomToRoll(lastVisible);

    // Enquanto o próprio jogador está rolando (ação ou iniciativa), ele já vê a animação no
    // roll-modal correspondente — evita empilhar o toast de tela cheia por cima disso. Como
    // essas rolagens nunca passam pela fila de toast, liberam pro histórico na hora.
    if (this.activeActionsCharacter() || this.activeInitiativeRoll()) {
      this.revealRolls(newRolls.map((r) => r.id_roll));
      return;
    }

    this.rollToastQueue.push(...newRolls);
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
      // Só entra no histórico quando o toast realmente aparece em tela, não quando é enfileirado.
      this.revealRolls([next.id_roll]);
      this.rollToastTimer = setTimeout(() => this.playNextRollToast(), this.ROLL_TOAST_MS);
    }
  }

  closeRollToast(): void {
    this.playNextRollToast();
  }

  /** ========================= TOAST: MONSTRO DERROTADO (broadcast) ========================= */

  readonly MONSTER_DEFEATED_TOAST_MS = 6_000;

  /** `key` incremental — sem isso, dois monstros derrotados seguidos com o mesmo nome não
   *  forçariam a barra de tempo a recomeçar (ver comentário no @for do template). */
  activeMonsterDefeatedToast = signal<{ name: string; imageUrl: string | null; key: number } | null>(
    null,
  );
  private monsterDefeatedToastTimer: ReturnType<typeof setTimeout> | null = null;
  private monsterDefeatedCounter = 0;

  /** Só o mestre dispara (defeatMonster), mas o evento ecoa pelo socket pra todo mundo, autor incluso. */
  private showMonsterDefeatedToast(name: string, imageUrl: string | null): void {
    if (this.monsterDefeatedToastTimer) clearTimeout(this.monsterDefeatedToastTimer);
    this.monsterDefeatedCounter++;
    this.activeMonsterDefeatedToast.set({ name, imageUrl, key: this.monsterDefeatedCounter });
    this.monsterDefeatedToastTimer = setTimeout(
      () => this.activeMonsterDefeatedToast.set(null),
      this.MONSTER_DEFEATED_TOAST_MS,
    );
  }

  closeMonsterDefeatedToast(): void {
    if (this.monsterDefeatedToastTimer) clearTimeout(this.monsterDefeatedToastTimer);
    this.activeMonsterDefeatedToast.set(null);
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

  /** Só comenta rolagens de d20 (ataque/perícia/resistência/iniciativa) — dano e dados livres
   *  ficam de fora pra não reagir a todo dado rolado na sessão. Vantagem/desvantagem: o valor
   *  "puro" do dado escolhido é `total - modifier`, já que só o dado contado entra na soma.
   *  Nat 20/1 usam o dado puro (regra do d20); "bom"/"ruim" usa `total` com bônus incluído —
   *  um 11 com +6 de bônus (total 17) é uma rolagem boa, mesmo o dado puro não sendo alto. */
  private reactTomToRoll(roll: RollLogEntry): void {
    if (!['attack', 'skill', 'save', 'initiative'].includes(roll.roll_type)) return;
    const natural = roll.total - roll.modifier;
    if (natural === 20) {
      this.reactTom('tom-celebrating.png', `20 natural de ${roll.actor_name}! Incrível!`);
    } else if (natural === 1) {
      this.reactTom('tom-stop.png', `1 natural... que azar, ${roll.actor_name}.`);
    } else if (roll.total >= 15) {
      this.reactTom('tom-like.png', `Boa rolagem, ${roll.actor_name}!`);
    } else if (roll.total <= 5) {
      this.reactTom('tom-stop.png', `Hmm, não foi dessa vez, ${roll.actor_name}.`);
    } else {
      this.reactTom('tom.png', `${roll.actor_name} tirou ${roll.total}. Nem tão bem, nem tão mal.`);
    }
  }

  /** Confirmação de acerto/erro contra a CA do alvo, vinda do roll-modal (via player-actions-modal). */
  onAttackResolved(actorName: string, hit: boolean): void {
    if (hit) {
      this.reactTom('tom-celebrating.png', `${actorName} acertou o ataque!`);
    } else {
      this.reactTom('tom-stop.png', `${actorName} errou o ataque...`);
    }
  }

  /** ========================= TOAST: PERSONAGEM PODE SUBIR DE NÍVEL (broadcast) ========================= */

  readonly LEVEL_UP_ELIGIBLE_TOAST_MS = 6_000;

  activeLevelUpEligibleToast = signal<
    { name: string; avatarPreset: AvatarPreset | null; key: number } | null
  >(null);
  private levelUpEligibleToastTimer: ReturnType<typeof setTimeout> | null = null;
  private levelUpEligibleCounter = 0;

  private showLevelUpEligibleToast(name: string, avatarPreset: AvatarPreset | null): void {
    if (this.levelUpEligibleToastTimer) clearTimeout(this.levelUpEligibleToastTimer);
    this.levelUpEligibleCounter++;
    this.activeLevelUpEligibleToast.set({ name, avatarPreset, key: this.levelUpEligibleCounter });
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

  readonly MONSTER_ANNOUNCEMENT_MS = 5_000;

  /** `key` incremental — mesmo motivo do roll-toast/monster-defeated-toast: força o @for a
   *  recriar o painel mesmo se dois monstros seguidos tiverem o mesmo nome. */
  activeMonsterAnnouncement = signal<{ name: string; imageUrl: string | null; key: number } | null>(
    null,
  );
  private monsterAnnouncementQueue: { name: string; imageUrl: string | null }[] = [];
  private monsterAnnouncementTimer: ReturnType<typeof setTimeout> | null = null;
  private monsterAnnouncementCounter = 0;

  /**
   * Dispara ao revelar um monstro manualmente (toggleMonsterReveal) e ao entrar em combate
   * (o backend revela e anuncia automaticamente quem ainda não tinha sido revelado, antes do
   * combat_started) — mesmo evento de socket (`monster_revealed`) pros dois casos. Fila porque
   * um combate pode revelar vários monstros de uma vez; mostra um de cada vez.
   */
  private queueMonsterAnnouncement(name: string, imageUrl: string | null): void {
    this.monsterAnnouncementQueue.push({ name, imageUrl });
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

  /** Avatar de quem rolou, buscando entre jogadores e NPCs da sessão pelo id_character da rolagem. */
  rollToastAvatarPreset(roll: RollLogEntry): AvatarPreset | null {
    if (roll.id_character === null) return null;
    const detail = this.sessionDetail();
    if (!detail) return null;
    const player = detail.players.find((p) => p.id_character === roll.id_character);
    if (player) return player.character?.avatar_preset ?? null;
    const npc = detail.npcs.find((n) => n.id_character === roll.id_character);
    return npc?.character?.avatar_preset ?? null;
  }

  /** Foto de fundo do painel de rolagem (à parte do avatar_preset) — mesma busca de
   *  rollToastAvatarPreset, retornando a imagem de verdade em vez do preset. */
  rollToastImageUrl(roll: RollLogEntry): string | null {
    if (roll.id_character === null) return null;
    const detail = this.sessionDetail();
    if (!detail) return null;
    const player = detail.players.find((p) => p.id_character === roll.id_character);
    if (player) return player.character?.image_url ?? null;
    const npc = detail.npcs.find((n) => n.id_character === roll.id_character);
    return npc?.character?.image_url ?? null;
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

  /** Participante (jogador) do usuário atual que ainda não rolou iniciativa nessa luta. */
  myPendingInitiativeParticipant = computed<CombatParticipant | null>(() => {
    const combat = this.combat();
    const detail = this.sessionDetail();
    const user = this.authService.currentUser();
    if (!combat || combat.encounter.status !== 'rolling_initiative' || !detail || !user) return null;

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

  currentTurnParticipant = computed<CombatParticipant | null>(() => {
    const combat = this.combat();
    if (!combat || combat.encounter.status !== 'active') return null;
    return combat.participants.find((p) => p.is_current_turn) ?? null;
  });

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

  turnBannerText(current: CombatParticipant): string {
    const name = this.combatParticipantName(current);
    if (current.participant_type === 'npc' || current.participant_type === 'monster') {
      const label = current.participant_type === 'monster' ? 'MONSTRO' : 'NPC';
      return this.isOwner() ? `🎲 TURNO DE ${name} — AJA PELO ${label}!` : `AGUARDANDO O MESTRE (${name})...`;
    }
    const user = this.authService.currentUser();
    const detail = this.sessionDetail();
    const isMe =
      !!user &&
      !!detail &&
      detail.players.some((pl) => pl.id_player_session === current.id_player_session && pl.user_id === user.id);
    return isMe ? `🎲 É A SUA VEZ, ${name}!` : `AGUARDANDO ${name}...`;
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
