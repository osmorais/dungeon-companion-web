import { Component, HostListener, OnDestroy, inject, input, signal, effect, untracked, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, finalize, interval } from 'rxjs';
import { GameSessionService } from '../services/game-session.service';
import { CharacterService } from '../services/character.service';
import { AuthService } from '../services/auth.service';
import {
  CombatParticipant,
  GameSessionDetail,
  MonsterSession,
  NpcSession,
  PlayerSession,
  RollLogEntry,
} from '../models/game-session.interface';
import { CharacterSummary } from '../models/character-summary.interface';
import { AvatarDisplayComponent } from '../avatar-display/avatar-display.component';
import { PixelDieComponent } from '../pixel-die/pixel-die.component';
import { PixelNumericDieComponent } from '../pixel-numeric-die/pixel-numeric-die.component';
import { PlayerActionsModalComponent } from '../player-actions-modal/player-actions-modal.component';
import { StartFightModalComponent } from '../start-fight-modal/start-fight-modal.component';
import { AbilityRollConfig, RollModalComponent } from '../roll-modal/roll-modal.component';

@Component({
  selector: 'app-session-panel',
  standalone: true,
  imports: [
    AvatarDisplayComponent,
    PixelDieComponent,
    PixelNumericDieComponent,
    PlayerActionsModalComponent,
    StartFightModalComponent,
    RollModalComponent,
  ],
  templateUrl: './session-panel.component.html',
  styleUrls: ['./session-panel.component.scss'],
})
export class SessionPanelComponent implements OnDestroy {
  private router = inject(Router);
  private gameSessionService = inject(GameSessionService);
  private charService = inject(CharacterService);
  private authService = inject(AuthService);

  id = input<string>();

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);
  sessionDetail = signal<GameSessionDetail | null>(null);
  error = signal(false);
  refreshing = signal(false);
  hpEdits = signal<Record<string, number>>({});
  savingHp = signal<Set<string>>(new Set());
  npcHpEdits = signal<Record<string, number>>({});
  savingNpcHp = signal<Set<string>>(new Set());

  addNpcOpen = signal(false);
  addNpcChars = signal<CharacterSummary[]>([]);
  addNpcLoading = signal(false);
  addingNpcId = signal<number | null>(null);

  private eventsSub: Subscription | null = null;
  private safetyNetSub: Subscription | null = null;
  /**
   * O painel é sincronizado via SSE (GameSessionService.connectEvents) — esse intervalo é só
   * uma rede de segurança caso a conexão de eventos caia silenciosamente (proxy, sono do Render).
   */
  private readonly SAFETY_NET_MS = 30_000;

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
        this.connectRealtime(sessionId);
      });
    });
  }

  ngOnDestroy() {
    this.disconnectRealtime();
  }

  /** Guarda a busca silenciosa (independente de `refreshing`, que é só pro botão/estado visível). */
  private pollInFlight = false;

  private connectRealtime(sessionId: string) {
    this.disconnectRealtime();
    this.eventsSub = this.gameSessionService.connectEvents(sessionId).subscribe(() => {
      if (!this.pollInFlight) this.fetchSession(sessionId, true);
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

  /**
   * `silent` é usado pelo polling em segundo plano: não aciona o overlay de carregamento em
   * tela cheia, não rola a página de volta pra seção de jogadores, e não descarta edições de HP
   * que o usuário esteja digitando no momento.
   */
  private fetchSession(sessionId: string, silent = false) {
    if (silent) this.pollInFlight = true;
    else this.refreshing.set(true);

    this.gameSessionService.getSessionById(sessionId, silent).subscribe({
      next: detail => {
        this.sessionDetail.set(detail);
        this.error.set(false);

        if (silent) {
          this.pollInFlight = false;
          return;
        }

        this.hpEdits.set({});
        this.npcHpEdits.set({});
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

  addNpc(char: CharacterSummary) {
    const sessionId = this.id();
    if (!sessionId || this.addingNpcId() !== null) return;
    this.addingNpcId.set(char.id_character);
    this.gameSessionService.addNpcToSession(sessionId, char.id_character).pipe(
      finalize(() => this.addingNpcId.set(null)),
    ).subscribe({
      next: () => this.refreshSession(),
    });
  }

  deleteNpc(idNpcSession: string) {
    this.gameSessionService.deleteNpc(idNpcSession).subscribe({
      next: () => {
        this.sessionDetail.update(detail => {
          if (!detail) return detail;
          return { ...detail, npcs: detail.npcs.filter(n => n.id_npc_session !== idNpcSession) };
        });
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
        this.sessionDetail.update(detail => {
          if (!detail) return detail;
          return { ...detail, players: detail.players.filter(p => p.id_player_session !== idPlayerSession) };
        });
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

  hasHpChange(player: PlayerSession): boolean {
    const id = player.id_player_session;
    const edits = this.hpEdits();
    if (!(id in edits)) return false;
    return edits[id] !== player.character!.current_hit_points;
  }

  decrementHp(player: PlayerSession) {
    const current = this.editedHp(player);
    if (current <= 0) return;
    this.hpEdits.update(edits => ({ ...edits, [player.id_player_session]: current - 1 }));
  }

  incrementHp(player: PlayerSession) {
    const current = this.editedHp(player);
    const max = player.character!.max_hit_points;
    if (current >= max) return;
    this.hpEdits.update(edits => ({ ...edits, [player.id_player_session]: current + 1 }));
  }

  saveHp(player: PlayerSession) {
    const newHp = this.editedHp(player);
    const id = player.id_player_session;
    this.savingHp.update(s => { const n = new Set(s); n.add(id); return n; });
    this.gameSessionService.updatePlayerHp(id, newHp).pipe(
      finalize(() => this.savingHp.update(s => { const n = new Set(s); n.delete(id); return n; })),
    ).subscribe({
      next: () => {
        this.sessionDetail.update(detail => {
          if (!detail) return detail;
          return {
            ...detail,
            players: detail.players.map(p =>
              p.id_player_session === id
                ? { ...p, character: p.character ? { ...p.character, current_hit_points: newHp } : p.character }
                : p,
            ),
          };
        });
        this.hpEdits.update(edits => {
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

  hasNpcHpChange(npc: NpcSession): boolean {
    const id = npc.id_npc_session;
    const edits = this.npcHpEdits();
    if (!(id in edits)) return false;
    return edits[id] !== npc.character!.current_hit_points;
  }

  decrementNpcHp(npc: NpcSession) {
    const current = this.editedNpcHp(npc);
    if (current <= 0) return;
    this.npcHpEdits.update(edits => ({ ...edits, [npc.id_npc_session]: current - 1 }));
  }

  incrementNpcHp(npc: NpcSession) {
    const current = this.editedNpcHp(npc);
    const max = npc.character!.max_hit_points;
    if (current >= max) return;
    this.npcHpEdits.update(edits => ({ ...edits, [npc.id_npc_session]: current + 1 }));
  }

  saveNpcHp(npc: NpcSession) {
    const newHp = this.editedNpcHp(npc);
    const id = npc.id_npc_session;
    this.savingNpcHp.update(s => { const n = new Set(s); n.add(id); return n; });
    this.gameSessionService.updateNpcHp(id, newHp).pipe(
      finalize(() => this.savingNpcHp.update(s => { const n = new Set(s); n.delete(id); return n; })),
    ).subscribe({
      next: () => {
        this.sessionDetail.update(detail => {
          if (!detail) return detail;
          return {
            ...detail,
            npcs: detail.npcs.map(n =>
              n.id_npc_session === id
                ? { ...n, character: n.character ? { ...n.character, current_hit_points: newHp } : n.character }
                : n,
            ),
          };
        });
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

  hpPercent(current: number, max: number): number {
    if (max <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
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
    if (roll.roll_type === 'dice' || roll.rolls.length < 2) return false;
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

  /** ========================= COMBATE / TURNOS ========================= */

  combatStartOpen = signal(false);
  endingTurn = signal(false);
  endingCombat = signal(false);
  activeInitiativeRoll = signal<{
    idCombatParticipant: string;
    idCharacter: number;
    actorName: string;
    config: AbilityRollConfig;
  } | null>(null);
  /**
   * Participantes cuja iniciativa já foi enviada por este cliente. Existe pra evitar que o
   * banner "a batalha vai começar" reapareça no intervalo entre enviar a rolagem e o SSE
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

  combatParticipantName(p: CombatParticipant): string {
    const detail = this.sessionDetail();
    if (!detail) return '???';
    if (p.participant_type === 'player') {
      const player = detail.players.find((pl) => pl.id_player_session === p.id_player_session);
      return player?.character?.name ?? player?.player_name ?? 'Jogador';
    }
    const npc = detail.npcs.find((n) => n.id_npc_session === p.id_npc_session);
    return npc?.character?.name ?? 'NPC';
  }

  turnBannerText(current: CombatParticipant): string {
    const name = this.combatParticipantName(current);
    if (current.participant_type === 'npc') {
      return this.isOwner() ? `🎲 TURNO DE ${name} — AJA PELO NPC!` : `AGUARDANDO O MESTRE (${name})...`;
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

  onInitiativeRolled(idCombatParticipant: string, result: { rolls: number[]; modifier: number; total: number }): void {
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

  endTurn(): void {
    const combat = this.combat();
    if (!combat || this.endingTurn()) return;
    this.endingTurn.set(true);
    this.gameSessionService
      .endTurn(combat.encounter.id_combat_encounter)
      .pipe(finalize(() => this.endingTurn.set(false)))
      .subscribe({ next: () => this.refreshSession() });
  }

  endCombat(): void {
    const combat = this.combat();
    if (!combat || this.endingCombat()) return;
    this.endingCombat.set(true);
    this.gameSessionService
      .endEncounter(combat.encounter.id_combat_encounter)
      .pipe(finalize(() => this.endingCombat.set(false)))
      .subscribe({ next: () => this.refreshSession() });
  }
}
