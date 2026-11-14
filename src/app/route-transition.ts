import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, ViewTransitionInfo } from '@angular/router';

/**
 * Transição entre telas (1.19.2): a tela nova chega deslizando como um vagão no trilho da Home,
 * em vez de só trocar. Só a página anda (fundo, trilhos e rodapé ficam parados), e no desktop a
 * janela da Home se transforma na janela da tela de destino. A animação e os nomes ficam no
 * `styles.scss` (seção "Transição entre telas"); aqui só se decide o sentido e se marca o
 * `data-route-dir` enquanto a transição roda.
 */
export type RouteDirection = 'forward' | 'back';

/** Caminho da rota mais funda do snapshot, sem barra inicial ('' = Home). */
export function snapshotPath(snapshot: ActivatedRouteSnapshot): string {
  let s = snapshot;
  while (s.firstChild) s = s.firstChild;
  return s.pathFromRoot
    .flatMap((r) => r.url.map((u) => u.path))
    .filter(Boolean)
    .join('/');
}

/**
 * Sentido do deslize: voltar (botão do navegador, ir pra Home ou subir de nível) entra pela
 * esquerda; o resto, pela direita.
 */
export function routeDirection(from: string, to: string, popstate: boolean): RouteDirection {
  if (popstate || to === '') return 'back';
  if (from === '') return 'forward';
  const depth = (p: string) => p.split('/').length;
  return depth(to) < depth(from) ? 'back' : 'forward';
}

/** `onViewTransitionCreated` do `withViewTransitions` — roda em contexto de injeção. */
export function onRouteTransition({ transition, from, to }: ViewTransitionInfo): void {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    transition.skipTransition();
    return;
  }
  const popstate = inject(Router).currentNavigation()?.trigger === 'popstate';
  const root = document.documentElement;
  root.dataset['routeDir'] = routeDirection(snapshotPath(from), snapshotPath(to), popstate);
  // then(fim, fim): `finished` rejeita se a transição for pulada, e o finally repassaria o erro.
  const end = () => delete root.dataset['routeDir'];
  transition.finished.then(end, end);
}

/**
 * Troca dentro da mesma tela (ex.: cartas → ficha em Catalogar monstro) com a mesma animação das
 * rotas. `update` muda o estado; `render` aplica na tela na hora (ApplicationRef.tick), pra que o
 * navegador fotografe o depois. Sem suporte ou com "reduzir movimento": só o `update`.
 */
export function runViewTransition(
  dir: RouteDirection,
  update: () => void,
  render: () => void,
): void {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!('startViewTransition' in document) || reduced) {
    update();
    return;
  }
  const root = document.documentElement;
  root.dataset['routeDir'] = dir;
  const transition = document.startViewTransition(() => {
    update();
    render();
  });
  const end = () => delete root.dataset['routeDir'];
  transition.finished.then(end, end);
}
