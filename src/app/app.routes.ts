import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Públicas
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'signup',
    loadComponent: () => import('./auth/signup/signup.component').then(m => m.SignupComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./auth/forgot-password/forgot-password.component').then(
        m => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./auth/reset-password/reset-password.component').then(
        m => m.ResetPasswordComponent,
      ),
  },

  // Protegidas
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'create',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./character-wizard/character-wizard.component').then(
        m => m.CharacterWizardComponent,
      ),
  },
  {
    path: 'sheet-result',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./character-sheet/character-sheet.component').then(m => m.CharacterSheetComponent),
  },
  {
    path: 'characters',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./character-list/character-list.component').then(m => m.CharacterListComponent),
  },
  {
    path: 'character-sheet/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./character-sheet/character-sheet.component').then(m => m.CharacterSheetComponent),
  },

  {
    path: 'session-create',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./session-create/session-create.component').then(m => m.SessionCreateComponent),
  },
  {
    path: 'session-join',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./session-join/session-join.component').then(m => m.SessionJoinComponent),
  },
  {
    path: 'my-sessions',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./my-sessions/my-sessions.component').then(m => m.MySessionsComponent),
  },
  {
    path: 'sessions',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./session-list/session-list.component').then(m => m.SessionListComponent),
  },
  {
    path: 'session/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./session-panel/session-panel.component').then(m => m.SessionPanelComponent),
  },

  { path: '**', redirectTo: '' },
];
