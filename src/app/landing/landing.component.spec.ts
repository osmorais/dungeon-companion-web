import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  LANDING_SECTIONS,
  LandingComponent,
  MENU_BREAKPOINT_PX,
  landingIconSrc,
} from './landing.component';
import { CURRENT_VERSION } from '../release-notes/release-notes';

describe('LandingComponent (tela inicial pública)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  const create = () => TestBed.runInInjectionContext(() => new LandingComponent());

  it('ícone solto vira PNG de assets/icons; caminho com barra fica como está', () => {
    expect(landingIconSrc('d20')).toBe('assets/icons/d20.png');
    expect(landingIconSrc('assets/tom/tom.png')).toBe('assets/tom/tom.png');
  });

  it('apresenta jogador, mestre, extras e três passos numerados', () => {
    const landing = create();
    expect(landing.playerFeatures.length).toBeGreaterThan(0);
    expect(landing.masterFeatures.length).toBeGreaterThan(0);
    expect(landing.extras.length).toBeGreaterThan(0);
    expect(landing.steps.map((s) => s.number)).toEqual(['01', '02', '03']);
    for (const f of [...landing.playerFeatures, ...landing.masterFeatures, ...landing.extras]) {
      expect(f.title.trim(), f.icon).not.toBe('');
      expect(f.text.trim(), f.title).not.toBe('');
    }
  });

  it('títulos dos cards não se repetem (são a chave do @for)', () => {
    const landing = create();
    for (const list of [landing.playerFeatures, landing.masterFeatures, landing.extras]) {
      expect(new Set(list.map((f) => f.title)).size).toBe(list.length);
    }
  });

  it('personagem de exemplo usa as peças do criador de avatar', () => {
    const { sampleAvatar, sampleAvatarBase } = create();
    expect(sampleAvatar.race).toBe('half_orc');
    expect(sampleAvatar.classKey).toBe('barbarian');
    expect(sampleAvatarBase).toBe('assets/avatar/race/base_half_orc.png');
    expect(sampleAvatar.hairStyle).toBeNull();
    expect(sampleAvatar.beardStyle).toBeNull();
  });

  it('mostra a versão atual no rodapé', () => {
    expect(create().currentVersion).toBe(CURRENT_VERSION);
  });

  describe('menu do topo', () => {
    afterEach(() => document.body.querySelectorAll('[data-lp-test]').forEach((el) => el.remove()));

    it('rola até a seção sem navegar', () => {
      const section = document.createElement('section');
      section.id = 'mestres';
      section.dataset['lpTest'] = '';
      section.scrollIntoView = vi.fn();
      document.body.appendChild(section);

      create().scrollTo('mestres');
      expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });

    it('seção inexistente não quebra', () => {
      expect(() => create().scrollTo('nao-existe')).not.toThrow();
    });
  });

  describe('menu mobile (hambúrguer, telas sem espaço pro menu horizontal)', () => {
    it('começa fechado', () => {
      expect(create().menuOpen()).toBe(false);
    });

    it('toggleMenu alterna aberto/fechado', () => {
      const landing = create();
      landing.toggleMenu();
      expect(landing.menuOpen()).toBe(true);
      landing.toggleMenu();
      expect(landing.menuOpen()).toBe(false);
    });

    it('scrollTo fecha o menu mobile, mesmo numa seção inexistente', () => {
      const landing = create();
      landing.toggleMenu();
      landing.scrollTo('nao-existe');
      expect(landing.menuOpen()).toBe(false);
    });

    it('Esc fecha o menu', () => {
      const landing = create();
      landing.toggleMenu();
      landing.closeMenu();
      expect(landing.menuOpen()).toBe(false);
    });

    it('toque fora da barra do topo fecha; dentro dela (botão, painel) não', () => {
      const landing = create();
      const topbar = document.createElement('header');
      topbar.className = 'lp-topbar';
      const inside = document.createElement('button');
      topbar.appendChild(inside);
      const outside = document.createElement('p');

      landing.toggleMenu();
      landing.onDocumentClick({ target: inside } as unknown as Event);
      expect(landing.menuOpen()).toBe(true);
      landing.onDocumentClick({ target: outside } as unknown as Event);
      expect(landing.menuOpen()).toBe(false);
    });

    it('alargar a tela além do menu horizontal fecha o painel', () => {
      const width = window.innerWidth;
      const landing = create();
      try {
        landing.toggleMenu();
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
        landing.onResize();
        expect(landing.menuOpen()).toBe(true);
        Object.defineProperty(window, 'innerWidth', {
          configurable: true,
          value: MENU_BREAKPOINT_PX + 1,
        });
        landing.onResize();
        expect(landing.menuOpen()).toBe(false);
      } finally {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
      }
    });
  });

  describe('página renderizada', () => {
    let fixture: ComponentFixture<LandingComponent>;
    let el: HTMLElement;

    beforeEach(() => {
      fixture = TestBed.createComponent(LandingComponent);
      fixture.detectChanges();
      el = fixture.nativeElement;
    });

    const hrefs = () => Array.from(el.querySelectorAll('a')).map((a) => a.getAttribute('href'));

    it('tem os caminhos para entrar e criar conta', () => {
      expect(hrefs()).toContain('/login');
      expect(hrefs()).toContain('/signup');
    });

    it('rodapé leva à privacidade, aos termos e às novidades', () => {
      expect(hrefs()).toEqual(expect.arrayContaining(['/privacidade', '/termos', '/novidades']));
    });

    it('conteúdo fica num <main>, com um único h1', () => {
      expect(el.querySelector('main')).not.toBeNull();
      expect(el.querySelectorAll('h1').length).toBe(1);
    });

    it('imagens têm largura e altura (a página não pula enquanto carrega)', () => {
      // Só as da própria página: avatar, barras e cartas são componentes compartilhados.
      const own = Array.from(el.querySelectorAll('img')).filter(
        (img) => !img.closest('app-avatar-display, app-hp-bar, app-xp-bar, app-landing-cards'),
      );
      expect(own.length).toBeGreaterThan(0);
      for (const img of own) {
        expect(img.getAttribute('width'), img.getAttribute('src') ?? '').toBeTruthy();
        expect(img.getAttribute('height'), img.getAttribute('src') ?? '').toBeTruthy();
      }
    });

    it('card de exemplo: avatar no anel padrão e XP acima da vida', () => {
      const card = el.querySelector('.lp-sample')!;
      expect(card.querySelector('.avatar-ring-wrap app-avatar-display')).not.toBeNull();
      // Pele do desenho original, não um tom do personalizador.
      expect(card.querySelector('app-avatar-display img')?.getAttribute('src')).toBe(
        'assets/avatar/race/base_half_orc.png',
      );
      expect(card.querySelector('.avatar-ring-wrap .avatar-ring')).not.toBeNull();
      const bars = Array.from(card.querySelectorAll('app-xp-bar, app-hp-bar')).map((b) =>
        b.tagName.toLowerCase(),
      );
      expect(bars).toEqual(['app-xp-bar', 'app-hp-bar']);
    });

    it('cada item do menu tem a seção correspondente na página', () => {
      for (const s of LANDING_SECTIONS) {
        expect(el.querySelector(`#${s.id}`), s.id).not.toBeNull();
      }
    });

    it('botão de menu abre o painel de seções e rola até a escolhida, fechando', () => {
      // Na página de verdade (presa ao documento) pra o getElementById achar a seção. jsdom não
      // tem scrollIntoView: simulado só na seção alvo, sem mexer no protótipo global.
      document.body.appendChild(el);
      try {
        const target = el.querySelector<HTMLElement>(`#${LANDING_SECTIONS[0].id}`)!;
        target.scrollIntoView = vi.fn();

        const toggle = el.querySelector('.lp-menu-toggle') as HTMLButtonElement;
        const nav = el.querySelector('#lp-nav')!;
        expect(toggle.getAttribute('aria-controls')).toBe('lp-nav');
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(nav.classList).not.toContain('is-open');

        toggle.click();
        fixture.detectChanges();
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(nav.classList).toContain('is-open');
        // Um menu só (o mesmo do desktop), com todas as seções.
        expect(el.querySelectorAll('nav[aria-label="Seções da página"]').length).toBe(1);
        const links = nav.querySelectorAll<HTMLButtonElement>('.lp-nav-link');
        expect(links.length).toBe(LANDING_SECTIONS.length);

        links[0].click();
        fixture.detectChanges();
        expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
        expect(nav.classList).not.toContain('is-open');
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
      } finally {
        el.remove();
      }
    });
  });
});
