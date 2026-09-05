import { inject } from '@angular/core';
import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';
import { LoadingOverlayService } from './loading-overlay.service';

/** Marca uma requisição pra não acionar o overlay de carregamento em tela cheia (ex: polling em segundo plano). */
export const SKIP_LOADING_OVERLAY = new HttpContextToken<boolean>(() => false);

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_LOADING_OVERLAY)) {
    return next(req);
  }

  const overlay = inject(LoadingOverlayService);
  overlay.show();
  return next(req).pipe(finalize(() => overlay.hide()));
};
