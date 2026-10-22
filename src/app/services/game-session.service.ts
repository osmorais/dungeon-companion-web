import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SKIP_LOADING_OVERLAY } from '../loading-overlay/loading.interceptor';
import {
  CombatEncounterDetail,
  CreateGameSessionPayload,
  GameSessionDetail,
  GameSessionPagedList,
  GameSessionResponse,
  GrantXpPayload,
  GrantXpResult,
  PartyRestPayload,
  PartyRestResult,
  JoinSessionPayload,
  MonsterAbilityKey,
  MonsterSession,
  PlayerSession,
  RollLogEntry,
  RollLogPayload,
  SecretRollRequestPayload,
  SpellCastPayload,
  SpellCastStagePayload,
  StartEncounterParticipantInput,
  SubmitInitiativePayload,
  ReferenceImage,
  ShownReferenceImage,
} from '../models/game-session.interface';

export interface AddMonsterToSessionInput {
  id_monster_catalog?: string;
  monster_api_slug?: string;
  custom_name?: string;
}

@Injectable({
  providedIn: 'root',
})
export class GameSessionService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  createSession(payload: CreateGameSessionPayload): Observable<GameSessionResponse> {
    return this.http.post<GameSessionResponse>(`${this.baseUrl}/api/game-session`, payload);
  }

  /** `silent` evita o overlay de carregamento em tela cheia — usado no polling em segundo plano. */
  getSessionById(id: string, silent = false): Observable<GameSessionDetail> {
    return this.http.get<GameSessionDetail>(`${this.baseUrl}/api/game-session/${id}`, {
      context: silent ? new HttpContext().set(SKIP_LOADING_OVERLAY, true) : undefined,
    });
  }

  getMySessions(page: number, pageSize: number, role?: 'dm' | 'player'): Observable<GameSessionPagedList> {
    return this.http.get<GameSessionPagedList>(`${this.baseUrl}/api/game-session/my-sessions`, {
      params: {
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(role ? { role } : {}),
      },
    });
  }

  joinSession(payload: JoinSessionPayload): Observable<PlayerSession> {
    return this.http.post<PlayerSession>(`${this.baseUrl}/api/game-session/player`, payload);
  }

  deletePlayer(idPlayerSession: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/game-session/player/${idPlayerSession}`, {
      context: this.silentContext(),
    });
  }

  /** Devolve o PV gravado — 1 em vez de 0 quando a Resistência Implacável (Meio-Orc) entra. */
  updatePlayerHp(
    idPlayerSession: string,
    currentHitPoints: number,
    temporaryHitPoints: number,
  ): Observable<{ current_hit_points: number } | null> {
    return this.http.patch<{ current_hit_points: number } | null>(
      `${this.baseUrl}/api/game-session/player/${idPlayerSession}/hp`,
      { current_hit_points: currentHitPoints, temporary_hit_points: temporaryHitPoints },
      { context: this.silentContext() },
    );
  }

  updateNpcHp(idNpcSession: string, currentHitPoints: number): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}/api/game-session/npc/${idNpcSession}/hp`,
      { current_hit_points: currentHitPoints },
      { context: this.silentContext() },
    );
  }

  deleteNpc(idNpcSession: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/game-session/npc/${idNpcSession}`, {
      context: this.silentContext(),
    });
  }

  addNpcToSession(sessionId: string, idCharacter: number): Observable<{ id_npc_session: string; id_game_session: string; id_character: number }> {
    return this.http.post<{ id_npc_session: string; id_game_session: string; id_character: number }>(
      `${this.baseUrl}/api/game-session/${sessionId}/npc`,
      { id_character: idCharacter },
      { context: this.silentContext() },
    );
  }

  addMonsterToSession(sessionId: string, input: AddMonsterToSessionInput): Observable<MonsterSession> {
    return this.http.post<MonsterSession>(
      `${this.baseUrl}/api/game-session/${sessionId}/monster`,
      input,
      { context: this.silentContext() },
    );
  }

  updateMonsterHp(idMonsterSession: string, hpCurrent: number): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}/api/game-session/monster-session/${idMonsterSession}/hp`,
      { hp_current: hpCurrent },
      { context: this.silentContext() },
    );
  }

  updateMonsterStats(
    idMonsterSession: string,
    stats: {
      custom_name: string | null;
      hp_current: number;
      hp_max: number;
      ac: number;
      abilities?: Partial<Record<MonsterAbilityKey, number>>;
    },
  ): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}/api/game-session/monster-session/${idMonsterSession}/stats`,
      stats,
      { context: this.silentContext() },
    );
  }

  uploadMonsterImage(idMonsterSession: string, file: File): Observable<MonsterSession> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<MonsterSession>(
      `${this.baseUrl}/api/game-session/monster-session/${idMonsterSession}/image`,
      formData,
    );
  }

  /** Aplica dano/cura de uma rolagem no alvo — o servidor calcula o PV (jogador em aliado/monstro). */
  applyAmount(
    sessionId: string,
    payload: {
      id_character: number;
      target_kind: 'player' | 'npc' | 'monster';
      target_id: string;
      amount: number;
      kind: 'damage' | 'heal' | 'temp_hp';
      cast_id?: string;
    },
  ): Observable<{ current_hit_points?: number; temporary_hit_points?: number }> {
    return this.http.post<{ current_hit_points?: number; temporary_hit_points?: number }>(
      `${this.baseUrl}/api/game-session/${sessionId}/apply-amount`,
      payload,
      { context: this.silentContext() },
    );
  }

  // ── Imagens de referência (biblioteca do mestre, mostrada em tela cheia pra mesa) ──

  listReferenceImages(sessionId: string): Observable<ReferenceImage[]> {
    return this.http.get<ReferenceImage[]>(
      `${this.baseUrl}/api/game-session/${sessionId}/reference-images`,
    );
  }

  uploadReferenceImage(sessionId: string, file: File, title: string): Observable<ReferenceImage> {
    const formData = new FormData();
    formData.append('image', file);
    if (title.trim()) formData.append('title', title.trim());
    return this.http.post<ReferenceImage>(
      `${this.baseUrl}/api/game-session/${sessionId}/reference-images`,
      formData,
    );
  }

  showReferenceImage(idReferenceImage: string): Observable<ShownReferenceImage> {
    return this.http.post<ShownReferenceImage>(
      `${this.baseUrl}/api/game-session/reference-image/${idReferenceImage}/show`,
      {},
    );
  }

  hideReferenceImage(sessionId: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/api/game-session/${sessionId}/reference-images/hide`,
      {},
    );
  }

  deleteReferenceImage(idReferenceImage: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/api/game-session/reference-image/${idReferenceImage}`,
    );
  }

  revealMonster(idMonsterSession: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/api/game-session/monster-session/${idMonsterSession}/reveal`,
      {},
      { context: this.silentContext() },
    );
  }

  hideMonster(idMonsterSession: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/api/game-session/monster-session/${idMonsterSession}/hide`,
      {},
      { context: this.silentContext() },
    );
  }

  grantXp(idGameSession: string, payload: GrantXpPayload): Observable<GrantXpResult[]> {
    return this.http.post<GrantXpResult[]>(
      `${this.baseUrl}/api/game-session/${idGameSession}/grant-xp`,
      payload,
    );
  }

  /** Anotações privadas do mestre (só o dono da sessão lê/grava). */
  getDmNotes(idGameSession: string): Observable<{ notes: string }> {
    return this.http.get<{ notes: string }>(
      `${this.baseUrl}/api/game-session/${idGameSession}/dm-notes`,
      { context: new HttpContext().set(SKIP_LOADING_OVERLAY, true) },
    );
  }

  updateDmNotes(idGameSession: string, notes: string): Observable<{ notes: string }> {
    return this.http.put<{ notes: string }>(
      `${this.baseUrl}/api/game-session/${idGameSession}/dm-notes`,
      { notes },
      { context: new HttpContext().set(SKIP_LOADING_OVERLAY, true) },
    );
  }

  /** Apaga a sessão inteira (só o mestre) — os jogadores conectados recebem `session_deleted`. */
  deleteSession(idGameSession: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/game-session/${idGameSession}`);
  }

  /** Mestre declara descanso curto/longo pros jogadores/NPCs escolhidos. */
  partyRest(idGameSession: string, payload: PartyRestPayload): Observable<PartyRestResult> {
    return this.http.post<PartyRestResult>(
      `${this.baseUrl}/api/game-session/${idGameSession}/rest`,
      payload,
    );
  }

  /** Cria uma cópia do monstro na sessão com todos os dados atuais (inclusive o PV já sofrido). */
  duplicateMonster(idMonsterSession: string): Observable<MonsterSession> {
    return this.http.post<MonsterSession>(
      `${this.baseUrl}/api/game-session/monster-session/${idMonsterSession}/duplicate`,
      {},
      { context: this.silentContext() },
    );
  }

  defeatMonster(idMonsterSession: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/api/game-session/monster-session/${idMonsterSession}/defeat`,
      {},
      { context: this.silentContext() },
    );
  }

  deleteMonster(idMonsterSession: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/api/game-session/monster-session/${idMonsterSession}`,
      { context: this.silentContext() },
    );
  }

  postRoll(sessionId: string, payload: RollLogPayload): Observable<RollLogEntry> {
    return this.http.post<RollLogEntry>(`${this.baseUrl}/api/game-session/${sessionId}/roll`, payload);
  }

  /** Bardo dá Inspiração Bárdica a um aliado — o dado fica guardado no personagem dele. */
  grantBardicInspiration(
    sessionId: string,
    payload: { id_character: number; id_player_session: string },
  ): Observable<{ sides: number; to: string }> {
    return this.http.post<{ sides: number; to: string }>(
      `${this.baseUrl}/api/game-session/${sessionId}/bardic-inspiration`,
      payload,
    );
  }

  /** Mestre pede um teste secreto a jogadores — cada um rola e só o mestre recebe o resultado. */
  requestSecretRoll(
    sessionId: string,
    payload: SecretRollRequestPayload,
  ): Observable<{ id_player_session: string; request_id: string }[]> {
    return this.http.post<{ id_player_session: string; request_id: string }[]>(
      `${this.baseUrl}/api/game-session/${sessionId}/secret-roll-request`,
      payload,
    );
  }

  /** Só anuncia (broadcast via socket) pro toast de todo mundo na sessão — não persiste nada. */
  announceSpellCast(sessionId: string, payload: SpellCastPayload): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/api/game-session/${sessionId}/spell-cast`, payload);
  }

  /** Etapa de um lançamento de magia — a mesa mostra um aviso só (carta + rolagens). */
  publishSpellCastStage(sessionId: string, payload: SpellCastStagePayload): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/api/game-session/${sessionId}/spell-cast-stage`, payload);
  }

  /** ========================= COMBATE / TURNOS ========================= */

  startEncounter(sessionId: string, participants: StartEncounterParticipantInput[]): Observable<CombatEncounterDetail> {
    return this.http.post<CombatEncounterDetail>(
      `${this.baseUrl}/api/game-session/${sessionId}/combat/start`,
      { participants },
    );
  }

  addCombatParticipants(
    idCombatEncounter: string,
    participants: StartEncounterParticipantInput[],
  ): Observable<CombatEncounterDetail> {
    return this.http.post<CombatEncounterDetail>(
      `${this.baseUrl}/api/game-session/combat/${idCombatEncounter}/add-participants`,
      { participants },
    );
  }

  submitInitiative(idCombatParticipant: string, payload: SubmitInitiativePayload): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/api/game-session/combat-participant/${idCombatParticipant}/initiative`,
      payload,
      { context: this.silentContext() },
    );
  }

  endTurn(idCombatEncounter: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/api/game-session/combat/${idCombatEncounter}/end-turn`,
      {},
      { context: this.silentContext() },
    );
  }

  endEncounter(idCombatEncounter: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/api/game-session/combat/${idCombatEncounter}/end`,
      {},
      { context: this.silentContext() },
    );
  }

  moveParticipant(
    idCombatEncounter: string,
    idCombatParticipant: string,
    direction: 'up' | 'down',
  ): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/api/game-session/combat/${idCombatEncounter}/move-participant`,
      { id_combat_participant: idCombatParticipant, direction },
      { context: this.silentContext() },
    );
  }

  delayTurn(idCombatEncounter: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/api/game-session/combat/${idCombatEncounter}/delay-turn`,
      {},
      { context: this.silentContext() },
    );
  }

  private silentContext(): HttpContext {
    return new HttpContext().set(SKIP_LOADING_OVERLAY, true);
  }
}
