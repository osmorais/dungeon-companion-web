import { Component, effect, inject, signal, untracked } from '@angular/core';
import { LoadingOverlayService } from './loading-overlay.service';
import { DRAGON_COUNT, FlyingDragon, randomDragon } from './flying-dragons';

/**
 * Indicador global de carregamento: um dragão atravessa a tela em altura e sentido sorteados
 * (DRAGON_COUNT) enquanto há requisição pendente (LoadingOverlayService). **Não bloqueia a tela** —
 * o conteúdo de cada página mostra o próprio skeleton e os botões, o próprio "salvando". Quando
 * o carregamento termina, o dragão no ar termina a travessia e nenhum novo entra. A imagem segue o
 * tema (`--dragon-sprite` no styles.scss: dragão vermelho no fantasia, dracolich no sombrio).
 */
@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  templateUrl: './loading-overlay.component.html',
  styleUrls: ['./loading-overlay.component.scss'],
})
export class LoadingOverlayComponent {
  protected svc = inject(LoadingOverlayService);

  readonly dragons = signal<FlyingDragon[]>([]);
  private nextId = 0;

  private launch = effect(() => {
    if (!this.svc.visible()) return;
    untracked(() => {
      // Já tem dragão no ar (carregamento emendado no outro): deixa os atuais seguirem.
      if (this.dragons().length > 0) return;
      this.dragons.set(
        Array.from({ length: DRAGON_COUNT }, (_, i) => randomDragon(this.nextId++, i * 0.7)),
      );
    });
  });

  /** Fim da travessia: se ainda está carregando, outro dragão entra no lugar; senão, some. */
  onFlightEnd(dragon: FlyingDragon): void {
    this.dragons.update((list) =>
      this.svc.visible()
        ? list.map((d) => (d.id === dragon.id ? randomDragon(this.nextId++) : d))
        : list.filter((d) => d.id !== dragon.id),
    );
  }
}
