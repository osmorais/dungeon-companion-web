import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError(err => {
      if (err.status === 401 && !req.url.includes('/auth/')) {
        inject(AuthService).clearSession();
      }
      return throwError(() => err);
    }),
  );
};
