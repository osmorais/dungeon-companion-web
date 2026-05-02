import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AUTH_TOKEN_KEY } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) return true;

  if (!localStorage.getItem(AUTH_TOKEN_KEY)) return router.createUrlTree(['/login']);

  return authService.loadCurrentUser().pipe(
    map(user => (user ? true : router.createUrlTree(['/login']))),
  );
};
