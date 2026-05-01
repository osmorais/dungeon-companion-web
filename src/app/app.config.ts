import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { loadingInterceptor } from './loading-overlay/loading.interceptor';
import { credentialsInterceptor } from './interceptors/credentials.interceptor';
import { authErrorInterceptor } from './interceptors/auth-error.interceptor';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withFetch(),
      withInterceptors([loadingInterceptor, credentialsInterceptor, authErrorInterceptor]),
    ),
  ],
};
