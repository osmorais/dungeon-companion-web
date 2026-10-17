import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { GameSessionService } from '../services/game-session.service';
import { ReferenceImage } from '../models/game-session.interface';
import { apiErrorMessage } from '../auth/auth-errors';

/** Mesmo limite do upload na API (`IMAGE_UPLOAD_MAX_BYTES`). */
export const REFERENCE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const REFERENCE_IMAGE_TITLE_MAX = 120;

/** Erro de validação do arquivo antes de enviar, ou `null` se pode enviar. */
export function referenceImageFileError(file: File | null): string | null {
  if (!file) return 'Escolha uma imagem.';
  if (!file.type.startsWith('image/')) return 'O arquivo precisa ser uma imagem.';
  if (file.size > REFERENCE_IMAGE_MAX_BYTES) return 'A imagem pode ter até 10 MB.';
  return null;
}

/**
 * Biblioteca de imagens de referência da sessão (só o mestre): sobe imagens (mapa, cena, NPC…)
 * e escolhe qual mostrar em tela cheia pra mesa toda.
 */
@Component({
  selector: 'app-reference-images-modal',
  standalone: true,
  templateUrl: './reference-images-modal.component.html',
  styleUrls: ['./reference-images.scss'],
})
export class ReferenceImagesModalComponent implements OnInit {
  private gameSessionService = inject(GameSessionService);

  @Input({ required: true }) sessionId!: string;
  /** Imagem em exibição agora (pra marcar na lista). */
  @Input() shownId: string | null = null;
  @Output() closed = new EventEmitter<void>();

  readonly titleMax = REFERENCE_IMAGE_TITLE_MAX;

  images = signal<ReferenceImage[]>([]);
  loading = signal(true);
  uploading = signal(false);
  busyId = signal<string | null>(null);
  error = signal<string | null>(null);
  file = signal<File | null>(null);
  title = signal('');

  ngOnInit(): void {
    this.gameSessionService.listReferenceImages(this.sessionId).subscribe({
      next: (list) => {
        this.images.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Não foi possível carregar as imagens.'));
        this.loading.set(false);
      },
    });
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
    this.error.set(null);
  }

  onTitle(event: Event): void {
    this.title.set((event.target as HTMLInputElement).value);
  }

  upload(fileInput: HTMLInputElement): void {
    const problem = referenceImageFileError(this.file());
    if (problem) {
      this.error.set(problem);
      return;
    }
    this.uploading.set(true);
    this.error.set(null);
    this.gameSessionService
      .uploadReferenceImage(this.sessionId, this.file()!, this.title())
      .subscribe({
        next: (image) => {
          this.images.update((list) => [image, ...list]);
          this.file.set(null);
          this.title.set('');
          fileInput.value = '';
          this.uploading.set(false);
        },
        error: (err) => {
          this.error.set(apiErrorMessage(err, 'Não foi possível enviar a imagem.'));
          this.uploading.set(false);
        },
      });
  }

  show(image: ReferenceImage): void {
    this.busyId.set(image.id_reference_image);
    this.gameSessionService.showReferenceImage(image.id_reference_image).subscribe({
      next: () => {
        this.busyId.set(null);
        this.closed.emit();
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Não foi possível mostrar a imagem.'));
        this.busyId.set(null);
      },
    });
  }

  hide(): void {
    this.gameSessionService.hideReferenceImage(this.sessionId).subscribe({
      error: (err) => this.error.set(apiErrorMessage(err, 'Não foi possível fechar a imagem.')),
    });
  }

  remove(image: ReferenceImage): void {
    if (!confirm('Apagar esta imagem? Se ela estiver aberta, fecha para todos.')) return;
    this.busyId.set(image.id_reference_image);
    this.gameSessionService.deleteReferenceImage(image.id_reference_image).subscribe({
      next: () => {
        this.images.update((list) =>
          list.filter((i) => i.id_reference_image !== image.id_reference_image),
        );
        this.busyId.set(null);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Não foi possível apagar a imagem.'));
        this.busyId.set(null);
      },
    });
  }
}
