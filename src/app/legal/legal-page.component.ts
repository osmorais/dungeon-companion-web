import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_CONTROLLER_NAME,
  LEGAL_DOC_ROUTES,
  LEGAL_DOC_TITLES,
  LEGAL_LAST_UPDATED,
  LEGAL_MINIMUM_AGE,
  LEGAL_SITE_NAME,
  LEGAL_SITE_URL,
  resolveLegalDoc,
} from './legal-info';

/** Página pública (fora do authGuard) com a Política de Privacidade ou os Termos de Uso. */
@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './legal-page.component.html',
  styleUrls: ['./legal-page.component.scss'],
})
export class LegalPageComponent {
  private route = inject(ActivatedRoute);

  doc = toSignal(this.route.data.pipe(map((data) => resolveLegalDoc(data['doc']))), {
    initialValue: resolveLegalDoc(this.route.snapshot.data['doc']),
  });
  title = computed(() => LEGAL_DOC_TITLES[this.doc()]);

  readonly controllerName = LEGAL_CONTROLLER_NAME;
  readonly contactEmail = LEGAL_CONTACT_EMAIL;
  readonly siteName = LEGAL_SITE_NAME;
  readonly siteUrl = LEGAL_SITE_URL;
  readonly lastUpdated = LEGAL_LAST_UPDATED;
  readonly minimumAge = LEGAL_MINIMUM_AGE;
  readonly routes = LEGAL_DOC_ROUTES;
}
