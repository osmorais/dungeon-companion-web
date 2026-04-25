import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./character-wizard/character-wizard.component').then(m => m.CharacterWizardComponent)
  },
  {
    path: 'sheet-result',
    loadComponent: () =>
      import('./character-sheet/character-sheet.component').then(m => m.CharacterSheetComponent)
  },
  {
    path: 'characters',
    loadComponent: () =>
      import('./character-list/character-list.component').then(m => m.CharacterListComponent)
  },
  {
    path: 'character-sheet/:id',
    loadComponent: () =>
      import('./character-sheet/character-sheet.component').then(m => m.CharacterSheetComponent)
  }
];
