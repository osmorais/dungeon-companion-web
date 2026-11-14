import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, ViewTransitionInfo } from '@angular/router';
import {
  onRouteTransition,
  routeDirection,
  runViewTransition,
  snapshotPath,
} from './route-transition';

/** Snapshot mínimo: uma cadeia raiz → filhos, cada um com seus segmentos de URL. */
function chain(...levels: string[][]): ActivatedRouteSnapshot {
  const nodes = levels.map(
    (paths) =>
      ({ url: paths.map((path) => ({ path })) }) as never as {
        url: { path: string }[];
        firstChild: unknown;
        pathFromRoot: unknown[];
      },
  );
  nodes.forEach((n, i) => {
    n.firstChild = nodes[i + 1] ?? null;
    n.pathFromRoot = nodes.slice(0, i + 1);
  });
  return nodes[0] as never as ActivatedRouteSnapshot;
}

describe('transição entre telas', () => {
  describe('snapshotPath', () => {
    it('junta os segmentos da rota mais funda', () => {
      expect(snapshotPath(chain([], ['session', 'gs-1']))).toBe('session/gs-1');
      expect(snapshotPath(chain([], ['monster-catalog'], ['new']))).toBe('monster-catalog/new');
    });

    it('Home é o caminho vazio', () => {
      expect(snapshotPath(chain([], []))).toBe('');
    });
  });

  describe('routeDirection', () => {
    it('saindo da Home para uma tela: vai pra frente', () => {
      expect(routeDirection('', 'sessions', false)).toBe('forward');
    });

    it('voltando pra Home: volta', () => {
      expect(routeDirection('sessions', '', false)).toBe('back');
    });

    it('botão voltar do navegador: sempre volta', () => {
      expect(routeDirection('sessions', 'session/gs-1', true)).toBe('back');
    });

    it('descendo de nível vai pra frente; subindo, volta', () => {
      expect(routeDirection('sessions', 'session/gs-1', false)).toBe('forward');
      expect(routeDirection('monster-catalog/new', 'monster-catalog', false)).toBe('back');
    });

    it('mesmo nível vai pra frente', () => {
      expect(routeDirection('sessions', 'session-create', false)).toBe('forward');
    });
  });

  describe('onRouteTransition', () => {
    function fakeTransition(finished: Promise<void>) {
      return { finished, skipTransition: vi.fn() } as never as ViewTransition & {
        skipTransition: ReturnType<typeof vi.fn>;
      };
    }

    function run(info: ViewTransitionInfo, popstate = false) {
      TestBed.configureTestingModule({ providers: [provideRouter([])] });
      const router = TestBed.inject(Router);
      vi.spyOn(router, 'currentNavigation').mockReturnValue(
        (popstate ? { trigger: 'popstate' } : { trigger: 'imperative' }) as never,
      );
      TestBed.runInInjectionContext(() => onRouteTransition(info));
    }

    afterEach(() => {
      delete document.documentElement.dataset['routeDir'];
      vi.unstubAllGlobals();
    });

    it('marca o sentido durante a transição e limpa no fim', async () => {
      let finish!: () => void;
      const transition = fakeTransition(new Promise<void>((r) => (finish = r)));
      run({ transition, from: chain([], []), to: chain([], ['sessions']) });
      expect(document.documentElement.dataset['routeDir']).toBe('forward');
      finish();
      await transition.finished;
      await Promise.resolve();
      expect(document.documentElement.dataset['routeDir']).toBeUndefined();
    });

    it('transição pulada (rejeitada) também limpa, sem erro solto', async () => {
      let fail!: (e: Error) => void;
      const finished = new Promise<void>((_, rej) => (fail = rej));
      finished.catch(() => undefined);
      run({
        transition: fakeTransition(finished),
        from: chain([], ['sessions']),
        to: chain([], []),
      });
      expect(document.documentElement.dataset['routeDir']).toBe('back');
      fail(new Error('skipped'));
      await finished.catch(() => undefined);
      await Promise.resolve();
      expect(document.documentElement.dataset['routeDir']).toBeUndefined();
    });

    it('com "reduzir movimento" pula a animação', () => {
      vi.stubGlobal('matchMedia', () => ({ matches: true }));
      const transition = fakeTransition(Promise.resolve());
      run({ transition, from: chain([], []), to: chain([], ['sessions']) });
      expect(transition.skipTransition).toHaveBeenCalled();
      expect(document.documentElement.dataset['routeDir']).toBeUndefined();
    });
  });

  describe('runViewTransition (troca dentro da mesma tela)', () => {
    afterEach(() => {
      delete (document as { startViewTransition?: unknown }).startViewTransition;
      delete document.documentElement.dataset['routeDir'];
      vi.unstubAllGlobals();
    });

    it('sem suporte no navegador: só aplica a mudança', () => {
      const update = vi.fn();
      const render = vi.fn();
      runViewTransition('forward', update, render);
      expect(update).toHaveBeenCalledOnce();
      expect(render).not.toHaveBeenCalled();
      expect(document.documentElement.dataset['routeDir']).toBeUndefined();
    });

    it('com suporte: marca o sentido, muda e desenha dentro da transição, e limpa no fim', async () => {
      let finish!: () => void;
      const finished = new Promise<void>((r) => (finish = r));
      const start = vi.fn((cb: () => void) => {
        cb();
        return { finished } as ViewTransition;
      });
      (document as { startViewTransition?: unknown }).startViewTransition = start;
      const order: string[] = [];
      runViewTransition(
        'back',
        () => order.push('update'),
        () => order.push('render'),
      );
      expect(start).toHaveBeenCalledOnce();
      expect(order).toEqual(['update', 'render']);
      expect(document.documentElement.dataset['routeDir']).toBe('back');
      finish();
      await finished;
      await Promise.resolve();
      expect(document.documentElement.dataset['routeDir']).toBeUndefined();
    });

    it('com "reduzir movimento": sem animação', () => {
      vi.stubGlobal('matchMedia', () => ({ matches: true }));
      const start = vi.fn();
      (document as { startViewTransition?: unknown }).startViewTransition = start;
      const update = vi.fn();
      runViewTransition('forward', update, vi.fn());
      expect(update).toHaveBeenCalledOnce();
      expect(start).not.toHaveBeenCalled();
    });
  });
});
