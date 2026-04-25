import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';
import { LoadingOverlayService } from './loading-overlay.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const overlay = inject(LoadingOverlayService);
  overlay.show();
  return next(req).pipe(finalize(() => overlay.hide()));
};
