import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvatarDisplayComponent } from '../avatar-display/avatar-display.component';
import { HpBarComponent } from '../hp-bar/hp-bar.component';
import { XpBarComponent } from '../xp-bar/xp-bar.component';
import { LandingCardsComponent, prefersReducedMotion } from './landing-cards.component';
import { AvatarPreset } from '../models/avatar-preset.interface';
import { LEGAL_DOC_ROUTES } from '../legal/legal-info';
import { CURRENT_VERSION } from '../release-notes/release-notes';

/** Caminho da imagem: nome solto = PNG de `assets/icons/`; com barra = caminho completo. */
export function landingIconSrc(icon: string): string {
  return icon.includes('/') ? icon : `assets/icons/${icon}.png`;
}

/** Um recurso apresentado na tela inicial (ícone: ver `landingIconSrc`). */
export interface LandingFeature {
  icon: string;
  title: string;
  text: string;
}

export interface LandingStep {
  number: string;
  icon: string;
  title: string;
  text: string;
}

/** Âncoras das seções (menu do topo). */
export const LANDING_SECTIONS = [
  { id: 'jogadores', label: 'JOGADORES' },
  { id: 'mestres', label: 'MESTRES' },
  { id: 'cartas', label: 'CARTAS' },
  { id: 'como-funciona', label: 'COMO FUNCIONA' },
] as const;

/**
 * Tela inicial pública (`/` para quem não está logado): explica o site e leva ao login/cadastro.
 * Não chama a API — abre rápido mesmo com o servidor dormindo.
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    RouterLink,
    AvatarDisplayComponent,
    HpBarComponent,
    XpBarComponent,
    LandingCardsComponent,
  ],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent {
  readonly sections = LANDING_SECTIONS;
  readonly legalRoutes = LEGAL_DOC_ROUTES;
  readonly currentVersion = CURRENT_VERSION;
  readonly year = new Date().getFullYear();
  readonly iconSrc = landingIconSrc;

  /** Personagem de exemplo do cartão do topo (montado com as peças do criador de avatar). */
  readonly sampleAvatar: AvatarPreset = {
    race: 'dwarf',
    gender: 'male',
    classKey: 'barbarian',
    skinColor: 'light',
    hairStyle: 'hair_mohawk',
    hairColor: 'red',
    beardStyle: 'beard_02',
    beardColor: 'red',
    showSmile: false,
  };

  readonly playerFeatures: LandingFeature[] = [
    {
      icon: 'quill',
      title: 'COMECE SEM TRAVAR',
      text: 'Um passo a passo escolhe raça, classe, antecedente, atributos, magias e armas com você — mesmo que seja sua primeira ficha.',
    },
    {
      icon: 'sheet',
      title: 'A CONTA É DA FORJA',
      text: 'Modificadores, perícias, CA, vida e espaços de magia calculados pelas regras de D&D 5e. Você só decide quem o herói é.',
    },
    {
      icon: 'd20',
      title: 'ROLE DIRETO DA FICHA',
      text: 'Toque numa perícia e o teste já sai rolado. Na mesa, ataque, lance magias e veja o dano chegar na hora.',
    },
    {
      icon: 'level-up',
      title: 'EVOLUA A CADA SESSÃO',
      text: 'Ganhe XP, suba de nível e acompanhe o inventário. Seu herói cresce junto com a campanha.',
    },
  ];

  readonly masterFeatures: LandingFeature[] = [
    {
      icon: 'map',
      title: 'ABRA A MESA EM SEGUNDOS',
      text: 'Crie a sessão, defina quantos jogadores cabem e passe o código. Cada um entra com o próprio personagem.',
    },
    {
      icon: 'swords',
      title: 'CONDUZA O COMBATE',
      text: 'Ordem dos turnos, vida de todos, dano e cura em tempo real — o que acontece na sua tela aparece na de todo mundo.',
    },
    {
      icon: 'dragon',
      title: 'SEU BESTIÁRIO',
      text: 'Catalogue monstros e revele cada um só quando a história pedir. Até lá, os jogadores não veem nada.',
    },
    {
      icon: 'padlock',
      title: 'SEGREDOS DA MESA',
      text: 'Peça testes secretos que só você e o jogador veem, e distribua XP ao fim da aventura.',
    },
  ];

  readonly cardFeatures: LandingFeature[] = [
    {
      icon: 'spellbook',
      title: 'GRIMÓRIO NA MÃO',
      text: 'Magias prontas para lançar brilham em dourado. Fora do combate, escolha quais preparar.',
    },
    {
      icon: 'swords',
      title: 'ARSENAL CALCULADO',
      text: 'Bônus de ataque no medalhão; dano, tipo e propriedades no pergaminho de cada arma.',
    },
    {
      icon: 'd20',
      title: 'JOGUE A CARTA',
      text: 'Lançou uma magia ou atacou? A carta aparece no aviso da mesa, para todo mundo ver.',
    },
  ];

  readonly extras: LandingFeature[] = [
    {
      icon: 'spellbook',
      title: 'GRIMÓRIO',
      text: 'Todas as magias do jogo reunidas para consultar quando quiser.',
    },
    {
      icon: 'medal',
      title: 'RANKING',
      text: 'Os maiores feitos de todas as mesas: golpes, curas, 20 naturais…',
    },
    {
      icon: 'assets/tom/tom.png',
      title: 'TOM, O AJUDANTE',
      text: 'Dicas na hora certa enquanto você cria o personagem e joga.',
    },
    {
      icon: 'moon',
      title: 'DOIS TEMAS',
      text: 'SOMBRIO ou FANTASIA — e funciona no computador e no celular.',
    },
  ];

  readonly steps: LandingStep[] = [
    {
      number: '01',
      icon: 'quill',
      title: 'CRIE SUA CONTA',
      text: 'Com e-mail ou com a sua conta Google. É grátis.',
    },
    {
      number: '02',
      icon: 'swords',
      title: 'FORJE SEU HERÓI',
      text: 'Monte o personagem e o avatar em pixel art. A ficha fica pronta no fim.',
    },
    {
      number: '03',
      icon: 'compass',
      title: 'REÚNA A MESA',
      text: 'Entre na sessão com o código do mestre — ou crie a sua e chame o grupo.',
    },
  ];

  /**
   * Rola até a seção sem mexer na URL (`href="#…"` faria o roteador navegar de novo). Com "reduzir
   * movimento" ligado, pula direto.
   */
  scrollTo(id: string): void {
    const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
    document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
  }
}
