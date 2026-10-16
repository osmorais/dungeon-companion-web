import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LEGAL_DOC_ROUTES } from '../legal/legal-info';
import {
  CURRENT_VERSION,
  RELEASES,
  RELEASE_CHANGE_LABELS,
  formatReleaseDate,
} from './release-notes';

/** Página pública (fora do authGuard) com as novidades de cada versão do sistema. */
@Component({
  selector: 'app-release-notes-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './release-notes-page.component.html',
  styleUrls: ['../legal/legal-page.component.scss', './release-notes-page.component.scss'],
})
export class ReleaseNotesPageComponent {
  readonly releases = RELEASES;
  readonly currentVersion = CURRENT_VERSION;
  readonly labels = RELEASE_CHANGE_LABELS;
  readonly legalRoutes = LEGAL_DOC_ROUTES;
  readonly formatDate = formatReleaseDate;
}
