import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { map, Observable, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AUTH_TOKEN_KEY } from '../services/auth.service';

/** Logado? Com token salvo e sem usuário carregado ainda, confirma no `/auth/me`. */
function checkLoggedIn(): Observable<boolean> {
  const authService = inject(AuthService);
  if (authService.isLoggedIn()) return of(true);
  if (!localStorage.getItem(AUTH_TOKEN_KEY)) return of(false);
  return authService.loadCurrentUser().pipe(map((user) => !!user));
}

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) return true;

  if (!localStorage.getItem(AUTH_TOKEN_KEY)) return router.createUrlTree(['/login']);

  return authService.loadCurrentUser().pipe(
    map(user => (user ? true : router.createUrlTree(['/login']))),
  );
};

/**
 * `/` tem duas telas: quem está logado vê a Home; quem não está cai na rota seguinte (a tela
 * inicial pública). Recusar aqui não redireciona — só deixa o roteador tentar a próxima.
 */
export const loggedInMatch: CanMatchFn = () => checkLoggedIn();
