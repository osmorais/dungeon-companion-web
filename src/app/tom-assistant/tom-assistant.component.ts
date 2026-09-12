import {
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/** Tom, o mascote/assistente do site — acompanha o jogador durante a criação de personagem
 *  com uma imagem e um balão de fala contextual pra cada passo, digitado letra por letra tipo
 *  caixa de diálogo de jogo antigo. */
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

  displayedMessage = '';

  private typingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  get imagePath(): string {
    return `assets/tom/${this.image}`;
  }

  get isTyping(): boolean {
    return this.displayedMessage.length < this.message.length;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['message']) this.startTyping();
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
