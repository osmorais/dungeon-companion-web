import {
  Component,
  computed,
  HostListener,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { CharacterService } from '../services/character.service';
import { SessionInviteService } from '../services/session-invite.service';
import { CharacterSummary } from '../models/character-summary.interface';
import { SessionInviteView } from '../models/friend.interface';
import { apiErrorMessage } from '../auth/auth-errors';

/**
 * Aceitar um convite para mesa (1.18.0): o convidado escolhe com qual personagem entra. A entrada
 * é a mesma de "entrar com código" (a API confere personagem, vaga e se já está na mesa).
 */
@Component({
  selector: 'app-invite-accept-modal',
  standalone: true,
  templateUrl: './invite-accept-modal.component.html',
  styleUrls: ['./session-invite-modal.component.scss'],
})
export class InviteAcceptModalComponent implements OnInit {
  private characters = inject(CharacterService);
  private invites = inject(SessionInviteService);

  invite = input.required<SessionInviteView>();
  closed = output<void>();
  /** Emite o id da mesa em que entrou. */
  joined = output<string>();

  list = signal<CharacterSummary[]>([]);
  loading = signal(true);
  loadError = signal(false);
  selected = signal<number | null>(null);
  accepting = signal(false);
  error = signal('');

  canAccept = computed(() => this.selected() !== null && !this.accepting());

  ngOnInit(): void {
    this.characters.getCharacters(1, 100).subscribe({
      next: (res) => {
        this.list.set(res.CharacterPagedList);
        if (res.CharacterPagedList.length === 1)
          this.selected.set(res.CharacterPagedList[0].id_character);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  accept(): void {
    const idCharacter = this.selected();
    if (idCharacter === null || this.accepting()) return;
    this.error.set('');
    this.accepting.set(true);
    this.invites.accept(this.invite().id_session_invite, idCharacter).subscribe({
      next: (res) => {
        this.accepting.set(false);
        this.joined.emit(res.id_game_session);
      },
      error: (err) => {
        this.accepting.set(false);
        this.error.set(apiErrorMessage(err, 'Não foi possível entrar na mesa.'));
      },
    });
  }

  @HostListener('document:keydown.escape')
  close(): void {
    this.closed.emit();
  }
}
