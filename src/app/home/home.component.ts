import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CharacterService } from '../services/character.service';
import { LEGAL_DOC_ROUTES } from '../legal/legal-info';
import { CURRENT_VERSION } from '../release-notes/release-notes';

/** Papel aberto na Home (as opções dele aparecem ao lado / logo abaixo); `null` = nenhum. */
export type HomeRole = 'player' | 'master';

export interface HomeOption {
  icon: string;
  title: string;
  desc: string;
  action: () => void;
  /** Botão travado (ex.: CRIAR PERSONAGEM enquanto busca as opções do wizard). */
  disabled?: () => boolean;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  private router = inject(Router);
  private charService = inject(CharacterService);

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);
  /** Tudo numa tela só: escolher um papel abre as opções dele; clicar de novo fecha. */
  role = signal<HomeRole | null>(null);
  readonly legalRoutes = LEGAL_DOC_ROUTES;
  readonly currentVersion = CURRENT_VERSION;

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  toggleRole(role: HomeRole) {
    this.role.update((current) => (current === role ? null : role));
  }

  readonly roles: { role: HomeRole; icon: string; title: string; desc: string }[] = [
    {
      role: 'player',
      icon: 'swords',
      title: 'SOU JOGADOR',
      desc: 'Crie e gerencie seus personagens',
    },
    { role: 'master', icon: 'd20', title: 'SOU MESTRE', desc: 'Gerencie suas sessões e criaturas' },
  ];

  readonly playerOptions: HomeOption[] = [
    {
      icon: 'swords',
      title: 'CRIAR PERSONAGEM',
      desc: 'Forje um novo herói',
      action: () => this.createCharacter(),
      disabled: () => this.openingCreate(),
    },
    {
      icon: 'scroll',
      title: 'MEUS PERSONAGENS',
      desc: 'Acesse as fichas dos seus aventureiros',
      action: () => this.listCharacters(),
    },
    {
      icon: 'compass',
      title: 'ENTRAR EM UMA AVENTURA',
      desc: 'Junte-se a uma sessão',
      action: () => this.joinSession(),
    },
    {
      icon: 'medal',
      title: 'MINHAS AVENTURAS',
      desc: 'Veja suas campanhas ativas',
      action: () => this.mySessions(),
    },
  ];

  readonly masterOptions: HomeOption[] = [
    {
      icon: 'map',
      title: 'CRIAR NOVA SESSÃO',
      desc: 'Inicie uma nova aventura',
      action: () => this.createSession(),
    },
    {
      icon: 'book-open',
      title: 'SESSÕES CRIADAS',
      desc: 'Gerencie suas campanhas',
      action: () => this.listSessions(),
    },
    {
      icon: 'dragon',
      title: 'CATALOGAR MONSTROS',
      desc: 'Gerencie seu bestiário',
      action: () => this.catalogMonsters(),
    },
  ];

  /** Opções do papel aberto (vazio se nenhum). */
  roleOptions(): HomeOption[] {
    const role = this.role();
    return role === 'player' ? this.playerOptions : role === 'master' ? this.masterOptions : [];
  }

  createSession() {
    this.router.navigate(['/session-create']);
  }

  listSessions() {
    this.router.navigate(['/sessions']);
  }

  joinSession() {
    this.router.navigate(['/session-join']);
  }

  mySessions() {
    this.router.navigate(['/my-sessions']);
  }

  /** Busca as opções antes de abrir o wizard — o botão fica travado até lá (sem overlay agora). */
  openingCreate = signal(false);

  createCharacter() {
    if (this.openingCreate()) return;
    this.openingCreate.set(true);
    this.charService.getCharacterOptions().subscribe({
      next: (options) => {
        this.charService.cachedOptions.set(options);
        this.router.navigate(['/create']);
      },
      error: () => this.router.navigate(['/create']),
    });
  }

  listCharacters() {
    this.router.navigate(['/characters']);
  }

  catalogMonsters() {
    this.router.navigate(['/monster-catalog']);
  }

  openSpellCatalog() {
    this.router.navigate(['/spell-catalog']);
  }

  openRanking() {
    this.router.navigate(['/ranking']);
  }
}
