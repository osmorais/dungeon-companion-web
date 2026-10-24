import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { map, Observable, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AUTH_TOKEN_KEY } from '../services/auth.service';

/** Tela onde quem entrou sem nome de usuário (conta antiga, Google) escolhe um (1.9.0). */
export const CHOOSE_USERNAME_ROUTE = '/nome-de-usuario';

/**
 * Logado? Com token salvo e sem usuário carregado ainda, confirma no `/auth/me`. Token vencido ou
 * erro: limpa sem redirecionar pro login — quem chama decide pra onde vai.
 */
function checkLoggedIn(): Observable<boolean> {
  const authService = inject(AuthService);
  if (authService.isLoggedIn()) return of(true);
  if (!localStorage.getItem(AUTH_TOKEN_KEY)) return of(false);
  return authService.loadCurrentUser(null).pipe(map((user) => !!user));
}

/** Logado e com nome de usuário → segue; sem nome → tela de escolha. */
function withUsername(authService: AuthService, router: Router): true | UrlTree {
  return authService.needsUsername() ? router.createUrlTree([CHOOSE_USERNAME_ROUTE]) : true;
}

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) return withUsername(authService, router);

  if (!localStorage.getItem(AUTH_TOKEN_KEY)) return router.createUrlTree(['/login']);

  return authService.loadCurrentUser().pipe(
    map(user => (user ? withUsername(authService, router) : router.createUrlTree(['/login']))),
  );
};

/**
 * `/` tem duas telas: quem está logado vê a Home; quem não está cai na rota seguinte (a tela
 * inicial pública). Recusar aqui não redireciona — só deixa o roteador tentar a próxima. Logado sem
 * nome de usuário vai pra tela de escolha.
 */
export const loggedInMatch: CanMatchFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return checkLoggedIn().pipe(
    map((loggedIn) => (loggedIn ? withUsername(authService, router) : false)),
  );
};

/** Tela de escolha: só pra quem está logado e ainda não tem nome (os outros vão pra Home). */
export const chooseUsernameGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return checkLoggedIn().pipe(
    map((loggedIn) => {
      if (!loggedIn) return router.createUrlTree(['/login']);
      return authService.needsUsername() ? true : router.createUrlTree(['/']);
    }),
  );
};
