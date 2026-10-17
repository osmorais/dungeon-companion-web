import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { ShownReferenceImage } from '../models/game-session.interface';

/**
 * Imagem de referência em tela cheia, aberta pelo mestre pra toda a mesa. Cada um pode fechar
 * só pra si (✕, clique fora ou Esc); o mestre também fecha pra todos.
 */
@Component({
  selector: 'app-reference-image-viewer',
  standalone: true,
  templateUrl: './reference-image-viewer.component.html',
  styleUrls: ['./reference-images.scss'],
})
export class ReferenceImageViewerComponent {
  @Input({ required: true }) image!: ShownReferenceImage;
  @Input() isDm = false;
  /** Fecha só nesta tela. */
  @Output() dismissed = new EventEmitter<void>();
  /** Mestre fecha pra todos. */
  @Output() hideForAll = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.dismissed.emit();
  }
}
