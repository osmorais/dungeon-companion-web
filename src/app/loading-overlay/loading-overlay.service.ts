import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingOverlayService {
  readonly visible = signal(false);
  readonly message = signal('CARREGANDO...');
  readonly subMessage = signal('AGUARDE ENQUANTO A MAGIA ACONTECE');
  /** Só mostra texto quando quem chamou passou uma mensagem (o carregamento comum é só dragões). */
  readonly showMessage = signal(false);

  private pendingCount = 0;
  private httpSuppressors = 0;

  /**
   * Telas que mostram skeleton no lugar do overlay (a sessão) desligam o overlay das requisições
   * HTTP enquanto estão abertas. Navegação e `show()` explícito continuam funcionando. Devolve a
   * função que libera — chamar no destroy da tela.
   */
  suppressHttp(): () => void {
    this.httpSuppressors++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.httpSuppressors--;
    };
  }

  get httpSuppressed(): boolean {
    return this.httpSuppressors > 0;
  }

  show(message?: string, subMessage?: string) {
    const wasVisible = this.visible();
    this.pendingCount++;
    // Only update the message if not already visible or a specific message was provided.
    // This preserves custom messages when the HTTP interceptor calls show() without args.
    if (!wasVisible || message !== undefined) {
      this.message.set(message ?? 'CARREGANDO...');
      this.subMessage.set(subMessage ?? 'AGUARDE ENQUANTO A MAGIA ACONTECE');
      this.showMessage.set(message !== undefined);
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
