import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { loadingInterceptor } from './loading-overlay/loading.interceptor';
import { credentialsInterceptor } from './interceptors/credentials.interceptor';
import { authErrorInterceptor } from './interceptors/auth-error.interceptor';

import { routes } from './app.routes';
import { onRouteTransition } from './route-transition';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: onRouteTransition,
      }),
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([loadingInterceptor, credentialsInterceptor, authErrorInterceptor]),
    ),
  ],
};
