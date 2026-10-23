import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LANDING_SECTIONS, LandingComponent, landingIconSrc } from './landing.component';
import { avatarBasePath } from '../models/avatar-preset.interface';
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
    const { sampleAvatar } = create();
    expect(avatarBasePath(sampleAvatar)).toBe('assets/avatar/race_skin/base_dwarf_light.png');
    expect(sampleAvatar.classKey).toBe('barbarian');
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

  describe('página renderizada', () => {
    let el: HTMLElement;

    beforeEach(() => {
      const fixture = TestBed.createComponent(LandingComponent);
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

    it('cada item do menu tem a seção correspondente na página', () => {
      for (const s of LANDING_SECTIONS) {
        expect(el.querySelector(`#${s.id}`), s.id).not.toBeNull();
      }
    });
  });
});
