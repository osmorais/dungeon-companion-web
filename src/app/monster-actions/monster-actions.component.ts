import { Component, computed, input, output, signal } from '@angular/core';
import { CardDeckComponent } from '../game-card/card-deck.component';
import { CardHandComponent, HandCard } from '../game-card/card-hand.component';
import { monsterActionToCard } from '../game-card/monster-card';
import { MonsterStatBlock } from '../models/monster-catalog.interface';
import {
  MonsterActionOp,
  MonsterActionState,
  RechargeRoll,
} from '../models/game-session.interface';
import { AbilityRollConfig } from '../roll-modal/roll-modal.component';
import {
  ActionAvailability,
  MonsterActionButton,
  MonsterActionGroup,
  actionAvailability,
  legendaryTotal,
  monsterActions,
  monsterChecks,
} from './monster-actions';

const GROUP_TITLES: Record<MonsterActionGroup, string> = {
  special_abilities: 'HABILIDADES',
  actions: 'AÇÕES',
  reactions: 'REAÇÕES',
  legendary_actions: 'AÇÕES LENDÁRIAS',
};

/** Pedido de rolagem: a configuração do modal e o que gastar ao usar (`null` = sem limite). */
export interface MonsterRollRequest {
  config: AbilityRollConfig;
  consume: MonsterActionOp | null;
  /** Ação com carta (ataque, resistência, dano): abre na tela de lançamento (1.13.0). Os testes
   *  do monstro (resistências, atributos, perícias) vêm sem. */
  card?: MonsterActionButton['card'];
  castSave?: MonsterActionButton['castSave'];
}

/**
 * Habilidades, ações e testes na ficha do monstro (só o mestre vê a ficha): no bestiário, cada
 * ação com número vira botão de rolagem, com os usos que restam (recarga, por dia, lendárias,
 * reação) e o multiataque guiado. Só fichas do nosso bestiário (a antiga da dnd5eapi, só em texto,
 * saiu de uso na 1.13.4).
 * Quem abre o modal de rolagem e grava os usos é a sessão (`roll`, `op`).
 */
@Component({
  selector: 'app-monster-actions',
  standalone: true,
  imports: [CardDeckComponent, CardHandComponent],
  templateUrl: './monster-actions.component.html',
  styleUrls: ['./monster-actions.component.scss'],
})
export class MonsterActionsComponent {
  readonly block = input.required<MonsterStatBlock>();
  /** Usos gravados do monstro na mesa (`null` = nada gasto). */
  readonly state = input<MonsterActionState | null>(null);
  /** d6 de recarga do início do turno dele, pra mostrar o resultado. */
  readonly rechargeRolls = input<RechargeRoll[] | null>(null);
  /** Parte da ficha a desenhar (a gaveta do monstro põe cada uma numa coluna, 1.13.0). */
  readonly part = input<'all' | 'actions' | 'checks' | 'traits'>('all');
  /** Ações que rolam viram cartas num baralho que abre a mão, como as armas dos jogadores
   *  (1.13.3, gaveta do monstro); o resto (multiataque, texto, covil) fica em lista. */
  readonly asCards = input(false);
  /** Imagem do monstro (arte das cartas das ações). */
  readonly imageUrl = input<string | null>(null);
  /** Só leitura (1.13.4, detalhe do bestiário): fora da mesa não há o que rolar nem usos a
   *  contar — sem botões de rolar/usar/restaurar, testes como etiquetas e a mão sem botão. */
  readonly viewOnly = input(false);
  readonly roll = output<MonsterRollRequest>();
  /** Operação de uso sem rolagem: usar (habilidade só de texto), restaurar, descanso. */
  readonly op = output<MonsterActionOp>();

  // Ficha antiga da dnd5eapi fora de uso (1.13.4): toda ficha é do bestiário.
  // readonly mechanical = computed(() => isMechanicalStatBlock(this.block()));
  readonly checks = computed(() => monsterChecks(this.block()));
  private readonly buttons = computed(() => monsterActions(this.block()));
  readonly sections = computed(() =>
    (Object.keys(GROUP_TITLES) as MonsterActionGroup[])
      .map((group) => ({
        group,
        title: this.groupTitle(group),
        // Com cartas, as ações que rolam saem da lista (estão no baralho).
        items: this.buttons().filter(
          (b) => b.group === group && !(this.asCards() && this.isCard(b)),
        ),
      }))
      .filter((s) => s.items.length),
  );

  /** Ações do baralho: as que rolam (ataque, resistência, dano), de qualquer grupo. */
  private readonly cardButtons = computed(() => this.buttons().filter((b) => this.isCard(b)));

  /** A mão: carta da ação com a descrição; apagada quando o uso acabou. */
  readonly hand = computed<HandCard[]>(() =>
    this.cardButtons().map((b) => ({
      key: b.key,
      card: {
        ...monsterActionToCard(b.card!, this.imageUrl()),
        text: b.desc,
        tags: [
          ...(b.group === 'legendary_actions' ? ['LENDÁRIA'] : []),
          ...(b.group === 'reactions' ? ['REAÇÃO'] : []),
          ...b.tags.filter((t) => !t.startsWith('+') && !t.startsWith('CD')),
        ],
      },
      state: this.availability(b).available ? null : 'locked',
    })),
  );
  readonly deckCards = computed(() => this.hand().map((h) => h.card));
  readonly handOpen = signal(false);

  /** Contadores que no modo lista ficam nos títulos das seções (lendárias, reação). */
  readonly deckStatus = computed(() => {
    const state = this.state();
    const lines: string[] = [];
    if (this.viewOnly()) return lines;
    if (this.cardButtons().some((b) => b.group === 'legendary_actions')) {
      const total = legendaryTotal(this.block());
      lines.push(`LENDÁRIAS: RESTAM ${total - (state?.legendary_used ?? 0)} DE ${total} NA RODADA`);
    }
    if (this.cardButtons().some((b) => b.group === 'reactions')) {
      lines.push(state?.reaction_used ? 'REAÇÃO: USADA NESTA RODADA' : 'REAÇÃO: DISPONÍVEL');
    }
    return lines;
  });

  private isCard(b: MonsterActionButton): boolean {
    return !!b.config && !!b.card;
  }

  buttonByKey(key: string): MonsterActionButton | null {
    return this.buttons().find((b) => b.key === key) ?? null;
  }
  /** Defesas, sentidos e idiomas (só os que a ficha tem), em linhas de rótulo e texto. */
  readonly traits = computed(() => {
    const b = this.block();
    const list = (v: string[] | undefined) => (v?.length ? v.join(', ') : '');
    return [
      { label: 'VULNERÁVEL A', text: list(b.damage_vulnerabilities) },
      { label: 'RESISTENTE A', text: list(b.damage_resistances) },
      { label: 'IMUNE A', text: list(b.damage_immunities) },
      { label: 'IMUNE ÀS CONDIÇÕES', text: list(b.condition_immunities) },
      { label: 'SENTIDOS', text: b.senses ?? '' },
      { label: 'IDIOMAS', text: b.languages ?? '' },
    ].filter((t) => t.text);
  });
  /** Testes em grupos (resistências, atributos, perícias), com o texto curto de cada um. */
  readonly checkGroups = computed(() => {
    const c = this.checks();
    if (!c) return [];
    return [
      {
        label: 'RESISTÊNCIAS',
        items: c.saves.map((s) => ({ ...s, text: s.label.replace('Resistência de ', '') })),
      },
      {
        label: 'ATRIBUTOS',
        items: c.abilities.map((s) => ({ ...s, text: s.label.replace('Teste de ', '') })),
      },
      { label: 'PERÍCIAS', items: c.skills.map((s) => ({ ...s, text: s.label })) },
    ].filter((g) => g.items.length);
  });
  /** Tem alguma habilidade com uso limitado (mostra o "restaurar usos"). */
  readonly hasLimitedUses = computed(() => this.buttons().some((b) => b.consume !== null));

  /** Multiataque aberto e quantas vezes cada ataque dele já foi feito neste uso. */
  readonly openMulti = signal<string | null>(null);
  readonly multiDone = signal<Partial<Record<string, number>>>({});

  private groupTitle(group: MonsterActionGroup): string {
    const state = this.state();
    if (group === 'legendary_actions') {
      const total = legendaryTotal(this.block());
      if (this.viewOnly()) return `${GROUP_TITLES[group]} — ${total} POR RODADA`;
      const left = total - (state?.legendary_used ?? 0);
      return `${GROUP_TITLES[group]} — RESTAM ${left} DE ${total} NA RODADA`;
    }
    if (group === 'reactions' && state?.reaction_used && !this.viewOnly()) {
      return `${GROUP_TITLES[group]} — USADA NESTA RODADA`;
    }
    return GROUP_TITLES[group];
  }

  availability(b: MonsterActionButton): ActionAvailability {
    return actionAvailability(b, this.block(), this.state());
  }

  /** Texto do botão por tipo de ação. */
  buttonLabel(action: MonsterActionButton): string {
    switch (action.kind) {
      case 'attack':
        return 'ATACAR';
      case 'save':
        return 'RESISTÊNCIA';
      case 'multi':
        return this.openMulti() === action.key ? 'FECHAR' : 'MULTIATAQUE';
      default:
        return 'ROLAR DANO';
    }
  }

  use(b: MonsterActionButton): void {
    if (b.config) this.roll.emit(this.request(b));
  }

  private request(b: MonsterActionButton): MonsterRollRequest {
    return {
      config: b.config!,
      consume: b.consume,
      ...(b.card ? { card: b.card } : {}),
      ...(b.castSave ? { castSave: b.castSave } : {}),
    };
  }

  toggleMulti(b: MonsterActionButton): void {
    const opening = this.openMulti() !== b.key;
    this.openMulti.set(opening ? b.key : null);
    if (opening) {
      this.multiDone.set({});
      // O multiataque em si pode ter limite (raro): gasta ao começar.
      if (b.consume) this.op.emit(b.consume);
    }
  }

  /** Um ataque do multiataque: rola pelo botão do ataque e conta mais um. */
  multiAttack(entry: { action: string; key: string | null }): void {
    const target = this.buttons().find((b) => b.key === entry.key);
    if (!target?.config) return;
    this.multiDone.update((d) => ({ ...d, [entry.action]: (d[entry.action] ?? 0) + 1 }));
    this.roll.emit(this.request(target));
  }

  shows(part: 'actions' | 'checks' | 'traits'): boolean {
    return this.part() === 'all' || this.part() === part;
  }

  signed(n: number): string {
    return n >= 0 ? `+${n}` : `${n}`;
  }
}
