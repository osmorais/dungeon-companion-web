import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./character-wizard/character-wizard.component').then(m => m.CharacterWizardComponent)
  },
  {
    path: 'sheet-result',
    loadComponent: () =>
      import('./character-sheet/character-sheet.component').then(m => m.CharacterSheetComponent)
  }
];
