import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingOverlayService {
  readonly visible = signal(false);
  readonly message = signal('CARREGANDO...');
  readonly subMessage = signal('AGUARDE ENQUANTO A MAGIA ACONTECE');

  show(message = 'CARREGANDO...', subMessage = 'AGUARDE ENQUANTO A MAGIA ACONTECE') {
    this.message.set(message);
    this.subMessage.set(subMessage);
    this.visible.set(true);
  }

  hide() {
    this.visible.set(false);
  }
}
