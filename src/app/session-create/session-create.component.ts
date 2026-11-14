import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { SkeletonRowsComponent } from '../skeleton/skeleton-rows.component';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { GameSessionService } from '../services/game-session.service';
import { CharacterService } from '../services/character.service';
import { CharacterSummary } from '../models/character-summary.interface';
import { AuthService } from '../services/auth.service';
import { FriendService } from '../services/friend.service';
import { SessionInviteService } from '../services/session-invite.service';
import { Friend } from '../models/friend.interface';
import { presenceLine } from '../friends/friends-page';

/** O máximo que a API devolve por página (amigos conectados vêm primeiro). */
const FRIENDS_TO_PICK = 50;
export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 20;

@Component({
  selector: 'app-session-create',
  standalone: true,
  imports: [FormsModule, SkeletonRowsComponent],
  templateUrl: './session-create.component.html',
  styleUrls: ['./session-create.component.scss'],
})
export class SessionCreateComponent implements OnInit {
  private router = inject(Router);
  private gameSessionService = inject(GameSessionService);
  private charService = inject(CharacterService);
  private auth = inject(AuthService);
  private friendService = inject(FriendService);
  private inviteService = inject(SessionInviteService);
  readonly presenceLine = presenceLine;
  /** O mestre aparece com o nome de usuário (1.9.0) — não há mais nome de mestre a digitar. */
  readonly username = computed(() => this.auth.currentUser()?.username ?? '');

  sessionName = signal('');
  maxPlayers = signal<number | null>(null);
  sessionCode = signal('');
  saveError = signal('');
  /** Salvando — trava o botão (sem o overlay que bloqueava a tela). */
  saving = signal(false);

  availableNpcs = signal<CharacterSummary[]>([]);
  loadingNpcs = signal(false);
  selectedNpcIds = signal<Set<number>>(new Set());

  availableFriends = signal<Friend[]>([]);
  loadingFriends = signal(false);
  selectedFriendIds = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.loadingNpcs.set(true);
    this.charService.getCharacters(1, 100).subscribe({
      next: (res) => {
        this.availableNpcs.set(res.CharacterPagedList ?? []);
        this.loadingNpcs.set(false);
      },
      error: () => this.loadingNpcs.set(false),
    });
    this.loadingFriends.set(true);
    this.friendService.getFriends(1, FRIENDS_TO_PICK).subscribe({
      next: (res) => {
        this.availableFriends.set(res.items);
        this.loadingFriends.set(false);
      },
      error: () => this.loadingFriends.set(false),
    });
  }

  isFriendSelected(id: string): boolean {
    return this.selectedFriendIds().has(id);
  }

  toggleFriend(id: string): void {
    this.selectedFriendIds.update((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  isNpcSelected(id: number): boolean {
    return this.selectedNpcIds().has(id);
  }

  toggleNpc(id: number): void {
    this.selectedNpcIds.update((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    this.sessionCode.set(code);
  }

  canGenerate(): boolean {
    return this.sessionName().trim().length > 0 && (this.maxPlayers() ?? 0) > 0;
  }

  canSave(): boolean {
    return this.canGenerate() && this.sessionCode().length > 0;
  }
  /** Botões − e + do número de jogadores (1 a 20; vazio começa em 1). */
  stepPlayers(delta: number) {
    const next = (this.maxPlayers() ?? 0) + delta;
    this.maxPlayers.set(Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, next)));
  }

  /** As 5 casas do código de convite ("·" enquanto não foi gerado). */
  readonly codeSlots = computed(() => (this.sessionCode() || '·····').split(''));

  saveSession() {
    if (!this.canSave() || this.saving()) return;
    this.saveError.set('');
    this.saving.set(true);

    const npcs = Array.from(this.selectedNpcIds()).map((id) => ({ id_character: id }));

    this.gameSessionService
      .createSession({
        session_name: this.sessionName().trim(),
        session_code: this.sessionCode(),
        max_player_quantity: this.maxPlayers()!,
        npcs,
        monsters: [],
      })
      .subscribe({
        next: (res) => this.inviteFriendsAndOpen(res.game_session.id_game_session),
        error: () => {
          this.saving.set(false);
          this.saveError.set('ERRO AO SALVAR AVENTURA. TENTE NOVAMENTE.');
        },
      });
  }

  /** Convite que falha não impede de abrir a sessão: dá pra convidar de novo lá dentro. */
  private inviteFriendsAndOpen(idGameSession: string): void {
    const open = () => this.router.navigate(['/session', idGameSession]);
    const invites = Array.from(this.selectedFriendIds()).map((friendId) =>
      this.inviteService.send(idGameSession, friendId, '').pipe(catchError(() => of(null))),
    );
    if (invites.length === 0) {
      open();
      return;
    }
    forkJoin(invites).subscribe(() => open());
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
