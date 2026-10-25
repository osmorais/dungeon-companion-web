import { Component, computed, input, output, signal } from '@angular/core';
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
  isMechanicalStatBlock,
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
}

/**
 * Habilidades, ações e testes na ficha do monstro (só o mestre vê a ficha): no bestiário, cada
 * ação com número vira botão de rolagem, com os usos que restam (recarga, por dia, lendárias,
 * reação) e o multiataque guiado; ficha antiga da dnd5eapi fica só em texto, com aviso.
 * Quem abre o modal de rolagem e grava os usos é a sessão (`roll`, `op`).
 */
@Component({
  selector: 'app-monster-actions',
  standalone: true,
  templateUrl: './monster-actions.component.html',
  styleUrls: ['./monster-actions.component.scss'],
})
export class MonsterActionsComponent {
  readonly block = input.required<MonsterStatBlock>();
  /** Usos gravados do monstro na mesa (`null` = nada gasto). */
  readonly state = input<MonsterActionState | null>(null);
  /** d6 de recarga do início do turno dele, pra mostrar o resultado. */
  readonly rechargeRolls = input<RechargeRoll[] | null>(null);
  readonly roll = output<MonsterRollRequest>();
  /** Operação de uso sem rolagem: usar (habilidade só de texto), restaurar, descanso. */
  readonly op = output<MonsterActionOp>();

  readonly mechanical = computed(() => isMechanicalStatBlock(this.block()));
  readonly checks = computed(() => (this.mechanical() ? monsterChecks(this.block()) : null));
  private readonly buttons = computed(() => monsterActions(this.block()));
  readonly sections = computed(() =>
    (Object.keys(GROUP_TITLES) as MonsterActionGroup[])
      .map((group) => ({
        group,
        title: this.groupTitle(group),
        items: this.buttons().filter((b) => b.group === group),
      }))
      .filter((s) => s.items.length),
  );
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
  /** Tem alguma habilidade com uso limitado (mostra o "restaurar usos"). */
  readonly hasLimitedUses = computed(() => this.buttons().some((b) => b.consume !== null));

  /** Multiataque aberto e quantas vezes cada ataque dele já foi feito neste uso. */
  readonly openMulti = signal<string | null>(null);
  readonly multiDone = signal<Partial<Record<string, number>>>({});

  private groupTitle(group: MonsterActionGroup): string {
    const state = this.state();
    if (group === 'legendary_actions') {
      const total = legendaryTotal(this.block());
      const left = total - (state?.legendary_used ?? 0);
      return `${GROUP_TITLES[group]} — RESTAM ${left} DE ${total} NA RODADA`;
    }
    if (group === 'reactions' && state?.reaction_used) {
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
    if (b.config) this.roll.emit({ config: b.config, consume: b.consume });
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
    this.roll.emit({ config: target.config, consume: target.consume });
  }

  signed(n: number): string {
    return n >= 0 ? `+${n}` : `${n}`;
  }
}
