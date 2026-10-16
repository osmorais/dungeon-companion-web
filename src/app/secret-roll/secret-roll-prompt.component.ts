import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CharacterService } from '../services/character.service';
import { SecretRollCheck } from '../models/game-session.interface';
import { AbilityRollConfig, RollModalComponent } from '../roll-modal/roll-modal.component';
import { secretCheckModifier } from './secret-roll-checks';

export interface SecretRollPromptRequest {
  request_id: string;
  id_character: number;
  label: string;
  check: SecretRollCheck;
}

/**
 * Jogador recebeu um teste secreto do mestre: mostra o pedido e abre o modal de rolagem com o
 * bônus da ficha. A rolagem vai oculta (só o mestre recebe) — o jogador vê o resultado no próprio
 * modal, e não dá pra rolar de novo (o pedido vale uma vez).
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
  @Output() closed = new EventEmitter<void>();

  actorName = signal('Personagem');
  rollConfig = signal<AbilityRollConfig | null>(null);
  loading = signal(true);
  error = signal(false);

  private modifier = 0;

  ngOnInit(): void {
    this.charService.getCharacterById(this.request.id_character, true).subscribe({
      next: (sheet) => {
        this.actorName.set(sheet.character_sheet.header.name);
        this.modifier = secretCheckModifier(sheet, this.request.check);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  roll(): void {
    this.rollConfig.set({
      mode: 'ability',
      rollType: this.request.check.kind === 'save' ? 'save' : 'skill',
      label: `Teste secreto: ${this.request.label}`,
      modifier: this.modifier,
    });
  }
}
