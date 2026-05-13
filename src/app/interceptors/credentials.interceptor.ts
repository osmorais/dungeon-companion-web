import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AUTH_TOKEN_KEY } from '../services/auth.service';

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);

  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return next(req);

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
