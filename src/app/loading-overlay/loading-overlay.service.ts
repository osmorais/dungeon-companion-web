import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingOverlayService {
  readonly visible = signal(false);
  readonly message = signal('CARREGANDO...');
  readonly subMessage = signal('AGUARDE ENQUANTO A MAGIA ACONTECE');

  private pendingCount = 0;

  show(message?: string, subMessage?: string) {
    const wasVisible = this.visible();
    this.pendingCount++;
    // Only update the message if not already visible or a specific message was provided.
    // This preserves custom messages when the HTTP interceptor calls show() without args.
    if (!wasVisible || message !== undefined) {
      this.message.set(message ?? 'CARREGANDO...');
      this.subMessage.set(subMessage ?? 'AGUARDE ENQUANTO A MAGIA ACONTECE');
    }
    this.visible.set(true);
  }

  async hide() {
    this.pendingCount = Math.max(0, this.pendingCount - 1);
    if (this.pendingCount > 0) return;
    await new Promise<void>(resolve => setTimeout(resolve, 2000));
    if (this.pendingCount === 0) this.visible.set(false);
  }

  hideImmediate() {
    this.pendingCount = Math.max(0, this.pendingCount - 1);
    if (this.pendingCount === 0) this.visible.set(false);
  }
}
