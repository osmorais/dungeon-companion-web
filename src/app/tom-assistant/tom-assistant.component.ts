import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TomService } from './tom.service';

/** Tom, o mascote/assistente do site — acompanha o jogador durante a criação de personagem
 *  com uma imagem e um balão de fala contextual pra cada passo, digitado letra por letra tipo
 *  caixa de diálogo de jogo antigo. OK fecha a fala (ele volta na próxima); DESATIVAR AJUDA
 *  desliga o Tom no site todo (TomService; religa pelo botão TOM da barra do topo). */
@Component({
  selector: 'app-tom-assistant',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tom-assistant.component.html',
  styleUrls: ['./tom-assistant.component.scss'],
})
export class TomAssistantComponent implements OnChanges, OnDestroy {
  /** Nome do arquivo dentro de assets/tom/ (ex: "tom-hi.png"). */
  @Input() image = 'tom.png';
  @Input() message = '';
  /** 'center' (padrão, criação de personagem) ou 'left' (parado no canto esquerdo, com retrato e
   *  balão de fala menores — usado na sessão, onde o Tom só reage a eventos em vez de guiar um
   *  fluxo passo a passo). */
  @Input() variant: 'center' | 'left' = 'center';

  /** Emite quando o retrato do Tom leva 3 cliques seguidos (dentro de 1s) — easter egg. */
  @Output() tripleClick = new EventEmitter<void>();

  readonly tom = inject(TomService);
  /** Fechou esta fala no OK: o Tom some até chegar uma fala nova. */
  dismissed = signal(false);

  displayedMessage = '';

  private typingInterval: ReturnType<typeof setInterval> | null = null;
  private clickTimestamps: number[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  get imagePath(): string {
    return `assets/tom/${this.image}`;
  }

  get isTyping(): boolean {
    return this.displayedMessage.length < this.message.length;
  }

  onPortraitClick(): void {
    const now = Date.now();
    this.clickTimestamps = [...this.clickTimestamps.filter((t) => now - t < 1000), now];
    if (this.clickTimestamps.length >= 3) {
      this.clickTimestamps = [];
      this.tripleClick.emit();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['message']) {
      this.dismissed.set(false);
      this.startTyping();
    }
  }

  /** OK: fecha esta fala. */
  dismiss(): void {
    this.dismissed.set(true);
  }

  /** DESATIVAR AJUDA: desliga o Tom no site todo (fica guardado no navegador). */
  disable(): void {
    this.tom.set(false);
  }

  ngOnDestroy(): void {
    if (this.typingInterval) clearInterval(this.typingInterval);
  }

  private startTyping(): void {
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
      this.typingInterval = null;
    }

    const fullMessage = this.message;
    this.displayedMessage = '';
    if (!fullMessage) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      this.displayedMessage = fullMessage;
      return;
    }

    let index = 0;
    this.typingInterval = setInterval(() => {
      index++;
      this.displayedMessage = fullMessage.slice(0, index);
      // setInterval roda fora da detecção de mudanças do Angular (app zoneless).
      this.cdr.detectChanges();
      if (index >= fullMessage.length) {
        clearInterval(this.typingInterval!);
        this.typingInterval = null;
      }
    }, 26);
  }
}
