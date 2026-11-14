import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CharacterService } from '../services/character.service';
import { TomService } from '../tom-assistant/tom.service';
import { LEGAL_DOC_ROUTES } from '../legal/legal-info';
import { CURRENT_VERSION } from '../release-notes/release-notes';

/** Papel aberto na Home (as opções dele aparecem na janela ao lado / no segundo vagão). */
export type HomeRole = 'player' | 'master';

export interface HomeOption {
  icon: string;
  title: string;
  desc: string;
  action: () => void;
  /** Botão travado (ex.: CRIAR PERSONAGEM enquanto busca as opções do wizard). */
  disabled?: () => boolean;
}

export interface HomeRoleCopy {
  /** Título da janela (ÁREA DO JOGADOR / ÁREA DO MESTRE). */
  area: string;
  /** Chamada grande acima da janela. */
  heading: string;
  subheading: string;
}

/** Arrasto mínimo (px) pra direita, no celular, que leva de volta ao menu. */
export const HOME_SWIPE_BACK_PX = 60;

/**
 * Home de quem está logado (1.18.1, design do Figma).
 *
 * Desktop: o menu começa no meio da tela; ao escolher JOGADOR ou MESTRE ele corre num trilho até
 * a lateral esquerda e a janela com as opções do papel entra à direita. Clicar de novo no papel
 * aberto, no ✕ da janela ou apertar Esc devolve o menu ao centro.
 *
 * Celular: dois "vagões" lado a lado — o menu e as opções do papel. Escolher o papel desliza pro
 * segundo; ‹ VOLTAR, Esc ou arrastar pra direita volta pro primeiro.
 */
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
  readonly tom = inject(TomService);

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);
  /** Papel aberto; `null` = menu no centro (desktop) / no primeiro vagão (celular). */
  role = signal<HomeRole | null>(null);
  /**
   * Último papel aberto, que continua na tela enquanto o vagão das opções sai (celular): sem ele
   * o vagão ficaria vazio no meio da animação de volta.
   */
  shownRole = signal<HomeRole>('player');
  /** A janela abriu agora, com o menu saindo do centro: ela espera o menu chegar na lateral. */
  fromCenter = signal(false);
  /** O menu já correu no trilho alguma vez (sem isso, a troca de conteúdo piscaria ao abrir a Home). */
  moved = signal(false);

  readonly legalRoutes = LEGAL_DOC_ROUTES;
  readonly currentVersion = CURRENT_VERSION;

  private touchStart: { x: number; y: number } | null = null;

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  /** Esc fecha o papel aberto (menu volta ao centro / ao primeiro vagão). */
  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeRole();
  }

  /** Escolher um papel abre as opções dele; clicar de novo no aberto fecha; outro troca. */
  toggleRole(role: HomeRole) {
    const current = this.role();
    if (current === role) {
      this.closeRole();
      return;
    }
    this.fromCenter.set(current === null);
    if (current === null) this.moved.set(true);
    this.shownRole.set(role);
    this.role.set(role);
  }

  closeRole() {
    this.role.set(null);
  }

  onTouchStart(event: TouchEvent) {
    const t = event.touches[0];
    this.touchStart = t ? { x: t.clientX, y: t.clientY } : null;
  }

  /** Arrastar pra direita (mais na horizontal que na vertical) volta pro menu. */
  onTouchEnd(event: TouchEvent) {
    const start = this.touchStart;
    this.touchStart = null;
    const t = event.changedTouches[0];
    if (!start || !t || this.role() === null) return;
    const dx = t.clientX - start.x;
    const dy = Math.abs(t.clientY - start.y);
    if (dx >= HOME_SWIPE_BACK_PX && dy < dx / 2) this.closeRole();
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

  readonly shared: { icon: string; title: string; desc: string; action: () => void }[] = [
    {
      icon: 'spellbook',
      title: 'GRIMÓRIO DE MAGIAS',
      desc: 'Consulte todas as magias',
      action: () => this.openSpellCatalog(),
    },
    {
      icon: 'medal',
      title: 'RANKING',
      desc: 'Os maiores feitos de todas as mesas',
      action: () => this.openRanking(),
    },
    {
      icon: 'campfire',
      title: 'AMIGOS',
      desc: 'Encontre jogadores e veja seus amigos',
      action: () => this.openFriends(),
    },
  ];

  readonly playerOptions: HomeOption[] = [
    {
      icon: 'swords',
      title: 'CRIAR PERSONAGEM',
      desc: 'Forje um novo herói para sua jornada.',
      action: () => this.createCharacter(),
      disabled: () => this.openingCreate(),
    },
    {
      icon: 'scroll',
      title: 'MEUS PERSONAGENS',
      desc: 'Acesse as fichas dos seus aventureiros.',
      action: () => this.listCharacters(),
    },
    {
      icon: 'compass',
      title: 'ENTRAR EM UMA AVENTURA',
      desc: 'Junte-se a uma sessão e faça parte da história.',
      action: () => this.joinSession(),
    },
    {
      icon: 'medal',
      title: 'MINHAS AVENTURAS',
      desc: 'Veja suas campanhas ativas e continue a jornada.',
      action: () => this.mySessions(),
    },
  ];

  readonly masterOptions: HomeOption[] = [
    {
      icon: 'map',
      title: 'CRIAR NOVA SESSÃO',
      desc: 'Inicie uma nova aventura e reúna seu grupo.',
      action: () => this.createSession(),
    },
    {
      icon: 'book-open',
      title: 'SESSÕES CRIADAS',
      desc: 'Gerencie suas campanhas e continue suas histórias.',
      action: () => this.listSessions(),
    },
    {
      icon: 'dragon',
      title: 'CATALOGAR MONSTROS',
      desc: 'Organize criaturas e prepare seu bestiário.',
      action: () => this.catalogMonsters(),
    },
  ];

  private readonly copy: Record<HomeRole, HomeRoleCopy> = {
    player: {
      area: 'ÁREA DO JOGADOR',
      heading: 'SUA PRÓXIMA AVENTURA COMEÇA AQUI',
      subheading: 'Crie seu herói e encontre a sua próxima mesa.',
    },
    master: {
      area: 'ÁREA DO MESTRE',
      heading: 'O MUNDO AGUARDA O SEU COMANDO',
      subheading: 'Prepare o mundo. Conduza a história.',
    },
  };

  /** Opções do papel aberto (vazio se nenhum). */
  roleOptions(): HomeOption[] {
    return this.optionsFor(this.role());
  }

  /** Opções do papel que está na tela (continua preenchido enquanto o vagão sai). */
  shownOptions = computed(() => this.optionsFor(this.shownRole()));
  shownCopy = computed(() => this.copy[this.shownRole()]);

  copyFor(role: HomeRole): HomeRoleCopy {
    return this.copy[role];
  }

  optionsFor(role: HomeRole | null): HomeOption[] {
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

  openFriends() {
    this.router.navigate(['/amigos']);
  }
}
