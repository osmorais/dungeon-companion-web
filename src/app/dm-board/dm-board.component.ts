import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import {
  GameSessionDetail,
  MonsterSession,
  PlayerSession,
  RollLogEntry,
} from '../models/game-session.interface';
import { CharacterSheetResponse } from '../models/character-response.interface';
import { CharacterService } from '../services/character.service';
import { GameSessionService } from '../services/game-session.service';
import { monsterDisplayName } from '../session-panel/monster-display-name';
import { apiErrorMessage } from '../auth/auth-errors';

/** Linha da visão rápida do grupo: PV vem do detalhe da sessão (ao vivo), o resto da ficha. */
export interface GroupRow {
  idPlayerSession: string;
  name: string;
  hp: string;
  ac: number | null;
  passivePerception: number | null;
  spellSaveDc: number | null;
  effects: string[];
}

/** Alvo da mesa no quadro (descanso e dano em área). `key` = `${type}:${id}`. */
export interface BoardTarget {
  key: string;
  type: 'player' | 'npc' | 'monster';
  id: string;
  name: string;
}

/** Dano/cura em área: cada alvo já com o valor final (metade quando marcado ½). */
export interface AreaApplyRequest {
  kind: 'damage' | 'heal';
  targets: { type: BoardTarget['type']; id: string; amount: number }[];
}

/**
 * Quadro do mestre: gaveta lateral, só pro dono da sessão, que agrupa as funções de mesa (dados,
 * rolagens ocultas, grupo, descanso, área, cena, combate, recompensas, sessão). Fora as fichas da
 * visão do grupo e o descanso do grupo, não chama a API — cada botão emite um evento e o
 * session-panel abre o modal/faz a ação que já fazia antes (o PV editado fica num lugar só).
 */
@Component({
  selector: 'app-dm-board',
  standalone: true,
  templateUrl: './dm-board.component.html',
  styleUrls: ['./dm-board.component.scss'],
})
export class DmBoardComponent implements OnInit, OnDestroy {
  private charService = inject(CharacterService);
  private gameSessionService = inject(GameSessionService);

  @Input({ required: true }) detail!: GameSessionDetail;
  @Input() pollingEnabled = false;
  @Input() screenEffectsEnabled = false;
  @Input() endingCombat = false;
  /** Monstro com revelar/esconder em andamento — desabilita o botão dele. */
  @Input() revealingMonsterId: string | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() rollDice = new EventEmitter<void>();
  @Output() secretRoll = new EventEmitter<void>();
  @Output() referenceImages = new EventEmitter<void>();
  @Output() toggleReveal = new EventEmitter<{ monster: MonsterSession; event: Event }>();
  @Output() startFight = new EventEmitter<void>();
  @Output() addToCombat = new EventEmitter<void>();
  @Output() endCombat = new EventEmitter<void>();
  @Output() distributeXp = new EventEmitter<void>();
  @Output() addNpc = new EventEmitter<void>();
  @Output() addMonster = new EventEmitter<void>();
  @Output() applyArea = new EventEmitter<AreaApplyRequest>();
  /** A sessão foi apagada pelo quadro — o session-panel sai da tela. */
  @Output() sessionDeleted = new EventEmitter<void>();
  @Output() togglePolling = new EventEmitter<void>();
  @Output() toggleScreenEffects = new EventEmitter<void>();

  readonly monsterName = monsterDisplayName;

  /** Fichas dos personagens dos jogadores, por id_character — buscadas ao abrir o quadro. */
  sheets = signal<ReadonlyMap<number, CharacterSheetResponse>>(new Map());
  loadingSheets = signal(false);

  ngOnInit(): void {
    this.loadSheets();
    this.loadNotes();
  }

  /**
   * CA, Percepção passiva e CD vêm da ficha calculada na hora (as colunas gravadas no personagem
   * ficam velhas depois de trocar armadura/subir de nível). Uma ficha que falhar só fica com "—".
   */
  loadSheets(): void {
    const ids = [
      ...new Set(this.detail.players.filter((p) => p.character).map((p) => p.id_character)),
    ];
    if (ids.length === 0 || this.loadingSheets()) return;
    this.loadingSheets.set(true);
    forkJoin(
      ids.map((id) => this.charService.getCharacterById(id, true).pipe(catchError(() => of(null)))),
    )
      .pipe(finalize(() => this.loadingSheets.set(false)))
      .subscribe((sheets) => {
        const next = new Map<number, CharacterSheetResponse>();
        sheets.forEach((sheet, i) => {
          if (sheet) next.set(ids[i], sheet);
        });
        this.sheets.set(next);
      });
  }

  get groupRows(): GroupRow[] {
    return this.detail.players
      .filter(
        (p): p is PlayerSession & { character: NonNullable<PlayerSession['character']> } =>
          !!p.character,
      )
      .map((p) => {
        const sheet = this.sheets().get(p.id_character)?.character_sheet;
        const effects = [...(sheet?.combat_features?.active_effects.active ?? [])];
        const inspiration = sheet?.combat_features?.active_effects.bardic_inspiration;
        if (inspiration) effects.push(`Inspiração Bárdica (d${inspiration.sides})`);
        const temp = p.character.temporary_hit_points;
        return {
          idPlayerSession: p.id_player_session,
          name: p.character.name,
          hp: `${p.character.current_hit_points}/${p.character.max_hit_points}${temp > 0 ? ` +${temp}` : ''}`,
          ac: sheet?.combat_stats.armor_class ?? null,
          passivePerception: sheet?.combat_stats.passive_perception ?? null,
          spellSaveDc: sheet?.spellcasting_info?.spell_save_dc ?? null,
          effects,
        };
      });
  }

  /**
   * Rolagens ocultas do mestre e respostas a testes secretos (a API só manda essas pro mestre),
   * da mais nova pra mais velha — `recent_rolls` já vem nessa ordem e guarda as últimas 30.
   */
  get hiddenRolls(): RollLogEntry[] {
    return this.detail.recent_rolls.filter((r) => r.is_hidden);
  }

  /** Teste secreto é respondido pelo jogador (tem personagem); a oculta é do próprio mestre. */
  isSecretAnswer(roll: RollLogEntry): boolean {
    return roll.id_character !== null;
  }

  get combatLabel(): string {
    const combat = this.detail.combat;
    if (!combat) return 'NENHUM COMBATE EM ANDAMENTO.';
    if (combat.encounter.status === 'rolling_initiative') return 'AGUARDANDO INICIATIVA...';
    return `RONDA ${combat.encounter.round_number}`;
  }

  get revealedCount(): number {
    return this.detail.monsters.filter((m) => m.is_revealed).length;
  }

  /** Jogadores e NPCs com personagem — quem pode descansar. */
  get partyTargets(): BoardTarget[] {
    return [
      ...this.detail.players
        .filter((p) => p.character)
        .map((p) => ({
          key: `player:${p.id_player_session}`,
          type: 'player' as const,
          id: p.id_player_session,
          name: p.character!.name,
        })),
      ...this.detail.npcs
        .filter((n) => n.character)
        .map((n) => ({
          key: `npc:${n.id_npc_session}`,
          type: 'npc' as const,
          id: n.id_npc_session,
          name: n.character!.name,
        })),
    ];
  }

  /** Grupo + monstros da sessão — quem pode levar dano/cura em área. */
  get areaTargets(): BoardTarget[] {
    return [
      ...this.partyTargets,
      ...this.detail.monsters.map((m) => ({
        key: `monster:${m.id_monster_session}`,
        type: 'monster' as const,
        id: m.id_monster_session,
        name: monsterDisplayName(m),
      })),
    ];
  }

  // ---------- Descanso do grupo ----------

  restType = signal<'short' | 'long' | null>(null);
  restSelected = signal<ReadonlySet<string>>(new Set());
  resting = signal(false);
  restMessage = signal<string | null>(null);
  restError = signal<string | null>(null);

  /** Abre a confirmação com todo o grupo marcado. */
  startRest(type: 'short' | 'long'): void {
    this.restType.set(type);
    this.restSelected.set(new Set(this.partyTargets.map((t) => t.key)));
    this.restMessage.set(null);
    this.restError.set(null);
  }

  cancelRest(): void {
    this.restType.set(null);
  }

  toggleRestTarget(key: string): void {
    this.restSelected.set(toggled(this.restSelected(), key));
  }

  confirmRest(): void {
    const type = this.restType();
    const selected = this.partyTargets.filter((t) => this.restSelected().has(t.key));
    if (!type || selected.length === 0 || this.resting()) return;
    this.resting.set(true);
    this.restError.set(null);
    this.gameSessionService
      .partyRest(this.detail.game_session.id_game_session, {
        rest_type: type,
        id_player_sessions: selected.filter((t) => t.type === 'player').map((t) => t.id),
        id_npc_sessions: selected.filter((t) => t.type === 'npc').map((t) => t.id),
      })
      .pipe(finalize(() => this.resting.set(false)))
      .subscribe({
        next: ({ rested, skipped }) => {
          const parts = [];
          if (rested.length) parts.push(`DESCANSARAM: ${rested.join(', ')}.`);
          if (skipped.length) {
            parts.push(
              `FICARAM DE FORA: ${skipped.map((s) => `${s.name} (${s.reason})`).join(', ')}.`,
            );
          }
          this.restMessage.set(parts.join(' '));
          this.restType.set(null);
          // CA/efeitos mudam no descanso longo (Fúria acaba) — atualiza a visão do grupo.
          if (type === 'long') this.loadSheets();
        },
        error: (err) =>
          this.restError.set(apiErrorMessage(err, 'Não foi possível registrar o descanso.')),
      });
  }

  // ---------- Dano/cura em área ----------

  areaAmount = signal(0);
  areaSelected = signal<ReadonlySet<string>>(new Set());
  /** Alvos que levam metade (passou na resistência, resistência ao tipo de dano). */
  areaHalf = signal<ReadonlySet<string>>(new Set());

  setAreaAmount(event: Event): void {
    const value = Math.floor(Number((event.target as HTMLInputElement).value));
    this.areaAmount.set(Number.isFinite(value) && value > 0 ? value : 0);
  }

  toggleAreaTarget(key: string): void {
    this.areaSelected.set(toggled(this.areaSelected(), key));
  }

  toggleAreaHalf(key: string): void {
    this.areaHalf.set(toggled(this.areaHalf(), key));
  }

  /** Metade arredonda pra baixo (regra do livro); alvo que ficaria com 0 sai da lista. */
  buildAreaRequest(kind: 'damage' | 'heal'): AreaApplyRequest {
    const amount = this.areaAmount();
    return {
      kind,
      targets: this.areaTargets
        .filter((t) => this.areaSelected().has(t.key))
        .map((t) => ({
          type: t.type,
          id: t.id,
          amount: this.areaHalf().has(t.key) ? Math.floor(amount / 2) : amount,
        }))
        .filter((t) => t.amount > 0),
    };
  }

  applyAreaAmount(kind: 'damage' | 'heal'): void {
    const request = this.buildAreaRequest(kind);
    if (request.targets.length === 0) return;
    this.applyArea.emit(request);
    this.areaAmount.set(0);
    this.areaSelected.set(new Set());
    this.areaHalf.set(new Set());
  }

  // ---------- Anotações do mestre ----------

  /** Mesmo limite do backend (DM_NOTES_MAX_LENGTH no GameSessionService). */
  readonly NOTES_MAX = 10_000;
  notes = signal('');
  private savedNotes = '';
  notesDirty = signal(false);
  notesLoading = signal(false);
  /** Só libera edição depois de carregar — senão salvar apagaria as anotações que já existem. */
  notesLoaded = signal(false);
  notesSaving = signal(false);
  notesError = signal<string | null>(null);

  private loadNotes(): void {
    this.notesLoading.set(true);
    this.gameSessionService
      .getDmNotes(this.detail.game_session.id_game_session)
      .pipe(finalize(() => this.notesLoading.set(false)))
      .subscribe({
        next: ({ notes }) => {
          this.savedNotes = notes;
          this.notes.set(notes);
          this.notesDirty.set(false);
          this.notesLoaded.set(true);
        },
        error: (err) =>
          this.notesError.set(apiErrorMessage(err, 'Não foi possível carregar as anotações.')),
      });
  }

  setNotes(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.notes.set(value);
    this.notesDirty.set(value !== this.savedNotes);
  }

  saveNotes(): void {
    if (!this.notesLoaded() || !this.notesDirty() || this.notesSaving()) return;
    const value = this.notes();
    this.notesSaving.set(true);
    this.notesError.set(null);
    this.gameSessionService
      .updateDmNotes(this.detail.game_session.id_game_session, value)
      .pipe(finalize(() => this.notesSaving.set(false)))
      .subscribe({
        next: () => {
          this.savedNotes = value;
          this.notesDirty.set(this.notes() !== value);
        },
        error: (err) =>
          this.notesError.set(apiErrorMessage(err, 'Não foi possível salvar as anotações.')),
      });
  }

  // ---------- Apagar sessão ----------

  confirmingDelete = signal(false);
  deleteCode = signal('');
  deleting = signal(false);
  deleteError = signal<string | null>(null);

  startDelete(): void {
    this.confirmingDelete.set(true);
    this.deleteCode.set('');
    this.deleteError.set(null);
  }

  cancelDelete(): void {
    this.confirmingDelete.set(false);
  }

  setDeleteCode(event: Event): void {
    this.deleteCode.set((event.target as HTMLInputElement).value);
  }

  /** Confirmação digitando o código da sessão (sem diferenciar maiúsculas e espaços nas pontas). */
  deleteCodeMatches(): boolean {
    return (
      this.deleteCode().trim().toUpperCase() ===
      this.detail.game_session.session_code.trim().toUpperCase()
    );
  }

  confirmDelete(): void {
    if (!this.deleteCodeMatches() || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set(null);
    this.gameSessionService.deleteSession(this.detail.game_session.id_game_session).subscribe({
      next: () => {
        // Nada pra salvar numa sessão que não existe mais.
        this.notesDirty.set(false);
        this.sessionDeleted.emit();
      },
      error: (err) => {
        this.deleting.set(false);
        this.deleteError.set(apiErrorMessage(err, 'Não foi possível apagar a sessão.'));
      },
    });
  }

  @HostListener('document:keydown.escape')
  close(): void {
    this.closed.emit();
  }

  /**
   * A gaveta fecha também quando uma ação abre modal — anotação pendente é salva aqui, em
   * qualquer caso; o pedido HTTP segue mesmo com o componente destruído.
   */
  ngOnDestroy(): void {
    this.saveNotes();
  }
}

function toggled(set: ReadonlySet<string>, key: string): ReadonlySet<string> {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}
