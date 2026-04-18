import { Component } from '@angular/core';
import { CharacterWizardComponent } from './character-wizard/character-wizard.component';

@Component({
  selector: 'app-root',
  imports: [CharacterWizardComponent],
  template: '<app-character-wizard />'
})
export class App {}
