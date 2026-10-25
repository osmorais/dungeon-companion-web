import { AbilityRollConfig } from '../roll-modal/roll-modal.component';
import {
  MonsterAbility,
  MonsterAbilityAbbr,
  MonsterStatBlock,
} from '../models/monster-catalog.interface';
import { MonsterActionOp, MonsterActionState } from '../models/game-session.interface';

/**
 * Ações de monstro mecânicas (1.11.0, fase 1): cada habilidade estruturada da ficha do bestiário
 * vira um botão que abre o mesmo modal de rolagem dos jogadores (ataque → dano, resistência com
 * CD, só dano), e a ficha ganha os testes do monstro. Fichas antigas da dnd5eapi (sem os campos
 * estruturados) continuam só em texto — ver `isMechanicalStatBlock`.
 *
 * Fase 2: usos (recarga, por dia, por descanso) gravados no monstro da mesa — cada botão sabe o que
 * gastar (`consume`) e `actionAvailability` diz se ainda dá; multiataque guiado (`multi`).
 * Fase 3: ações lendárias (custo por rodada) e reação (uma por rodada) entram no mesmo esquema.
 */

export type MonsterActionGroup =
  | 'special_abilities'
  | 'actions'
  | 'reactions'
  | 'legendary_actions';

/** O que o botão faz: ataque (d20 → dano), resistência (CD, dano direto), só dano, multiataque
 *  (lista dos ataques) ou só texto. */
export type MonsterActionKind = 'attack' | 'save' | 'damage' | 'multi' | 'text';

export interface MonsterActionButton {
  /** Estável por ficha: grupo, posição e parte ("actions:2:save"). */
  key: string;
  group: MonsterActionGroup;
  /** Nome no botão; a parte de resistência de um ataque ganha o sufixo ("Mordida — resistência"). */
  name: string;
  desc: string;
  kind: MonsterActionKind;
  /** Configuração do modal de rolagem; `null` em 'text'. */
  config: AbilityRollConfig | null;
  /** Etiquetas curtas: "+5", "CD 11 CON", "Recarga 5–6", "3/dia", "Custo 2". */
  tags: string[];
  /** Nome da habilidade na ficha (chave dos usos gravados). */
  ability: string;
  usage: MonsterAbility['usage'] | null;
  /** O que gastar ao usar (só no primeiro botão da habilidade); `null` = sem limite. */
  consume: MonsterActionOp | null;
  /** Multiataque: cada ataque, quantas vezes e o botão dele na ficha (`null` se não achou). */
  multi?: { action: string; count: number; key: string | null }[];
}

export interface ActionAvailability {
  available: boolean;
  /** "RECARREGANDO", "RESTAM 2", "USADA" — `null` quando não há o que dizer. */
  status: string | null;
  /** Dá pra devolver o uso à mão (↺). */
  restorable: boolean;
}

export interface MonsterCheck {
  key: string;
  label: string;
  modifier: number;
  config: AbilityRollConfig;
}

export interface MonsterChecks {
  saves: MonsterCheck[];
  abilities: MonsterCheck[];
  skills: MonsterCheck[];
}

const ABILITIES: {
  abbr: MonsterAbilityAbbr;
  en: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
  name: string;
  score: keyof MonsterStatBlock;
}[] = [
  { abbr: 'FOR', en: 'STR', name: 'Força', score: 'strength' },
  { abbr: 'DES', en: 'DEX', name: 'Destreza', score: 'dexterity' },
  { abbr: 'CON', en: 'CON', name: 'Constituição', score: 'constitution' },
  { abbr: 'INT', en: 'INT', name: 'Inteligência', score: 'intelligence' },
  { abbr: 'SAB', en: 'WIS', name: 'Sabedoria', score: 'wisdom' },
  { abbr: 'CAR', en: 'CHA', name: 'Carisma', score: 'charisma' },
];

const GROUPS: MonsterActionGroup[] = [
  'special_abilities',
  'actions',
  'reactions',
  'legendary_actions',
];

/** Ficha com os campos estruturados do bestiário (as antigas da dnd5eapi não têm `attack`/`dc`). */
export function isMechanicalStatBlock(block: MonsterStatBlock): boolean {
  return GROUPS.some((g) =>
    (block[g] ?? []).some((a) => a && ('attack' in a || 'dc' in a || 'damage' in a)),
  );
}

/** "2d6+5" → 2, 6, +5; "1d10-1" → 1, 10, −1; "7" (dano fixo) → 0 dados, +7. */
export function parseDice(dice: string): { count: number; sides: number; modifier: number } | null {
  const text = dice.replace(/\s+/g, '');
  const fixed = /^(\d+)$/.exec(text);
  if (fixed) return { count: 0, sides: 0, modifier: Number(fixed[1]) };
  const m = /^(\d+)d(\d+)([+-]\d+)?$/.exec(text);
  if (!m) return null;
  return { count: Number(m[1]), sides: Number(m[2]), modifier: m[3] ? Number(m[3]) : 0 };
}

function abilityModifier(score: unknown): number {
  return typeof score === 'number' ? Math.floor((score - 10) / 2) : 0;
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function abilityInfo(abbr: MonsterAbilityAbbr) {
  return ABILITIES.find((a) => a.abbr === abbr) ?? ABILITIES[0];
}

function usageTag(usage: MonsterAbility['usage']): string | null {
  if (!usage) return null;
  switch (usage.type) {
    case 'recharge':
      return usage.min >= 6 ? 'Recarga 6' : `Recarga ${usage.min}–6`;
    case 'per_day':
      return `${usage.times}/dia`;
    case 'rest':
      return `Descanso ${usage.rest}`;
    case 'cost':
      return `Custo ${usage.actions}`;
    case 'form':
      return usage.desc;
  }
}

type DamageEntry = NonNullable<MonsterAbility['damage']>[number];

/**
 * Junta vários danos num só do modal: o primeiro dá dado/lados, os outros entram como dados
 * extras (os modificadores somam). Tipos diferentes viram tipo composto ("cortante + fogo"), que o
 * modal já entende pra resistência do alvo.
 */
function damageConfig(entries: DamageEntry[], label: string): AbilityRollConfig['damage'] | null {
  const parsed = entries
    .map((e) => ({ entry: e, dice: parseDice(e.dice) }))
    .filter(
      (p): p is { entry: DamageEntry; dice: NonNullable<ReturnType<typeof parseDice>> } => !!p.dice,
    );
  if (!parsed.length) return null;
  const [first, ...rest] = parsed;
  const types = [...new Set(parsed.map((p) => p.entry.type).filter((t): t is string => !!t))];
  return {
    diceCount: first.dice.count,
    diceSides: first.dice.sides,
    modifier: parsed.reduce((sum, p) => sum + p.dice.modifier, 0),
    label,
    damageType: types.length ? types.join(' + ') : null,
    extraDice: rest
      .filter((p) => p.dice.count > 0)
      .map((p) => ({ count: p.dice.count, sides: p.dice.sides })),
  };
}

/** Texto sem espaços, pra achar "(1d8+3)" e o começo da resistência mesmo com o "+ 3" espaçado. */
function compact(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '');
}

/**
 * Ataque com CD: o dano que aparece no texto ANTES do "o alvo deve…/teste de resistência" é do
 * acerto (Balor: cortante + fogo); o que vem DEPOIS depende da resistência (Aranha Gigante:
 * 2d8 de veneno, metade se passar).
 */
export function splitAttackDamage(
  desc: string,
  entries: DamageEntry[],
): { onHit: DamageEntry[]; onSave: DamageEntry[] } {
  const text = compact(desc);
  const clause = ['testederesistência', 'deveser', 'deverealizar', 'devefazer', 'devepassar']
    .map((k) => text.indexOf(k))
    .filter((i) => i >= 0);
  if (!clause.length) return { onHit: entries, onSave: [] };
  const cut = Math.min(...clause);
  const onHit: DamageEntry[] = [];
  const onSave: DamageEntry[] = [];
  for (const e of entries) {
    const at = text.indexOf(`(${compact(e.dice)})`);
    (at >= 0 && at > cut ? onSave : onHit).push(e);
  }
  return { onHit, onSave };
}

function saveConfig(
  a: MonsterAbility,
  entries: DamageEntry[],
  label: string,
): AbilityRollConfig | null {
  const dc = a.dc!;
  const ability = abilityInfo(dc.ability);
  const damage = damageConfig(entries, label);
  if (!damage) return null;
  return {
    mode: 'ability',
    rollType: 'attack',
    label,
    modifier: 0,
    autoHit: true,
    damage,
    save: {
      note: `CD ${dc.value} de ${ability.name}`,
      onSuccess: dc.success === 'metade' ? 'half' : 'none',
      ability: ability.en,
    },
  };
}

/** Botões de uma habilidade (um ataque com dano de resistência vira dois). */
function buttonsFor(
  a: MonsterAbility,
  group: MonsterActionGroup,
  index: number,
): MonsterActionButton[] {
  const key = `${group}:${index}`;
  const usage = usageTag(a.usage);
  const dcTag = a.dc ? `CD ${a.dc.value} ${a.dc.ability}` : null;
  const plain = (a.damage ?? []).filter((d) => !d.note);
  const notes = (a.damage ?? [])
    .filter((d) => d.note)
    .map((d) => `${d.dice}${d.type ? ' ' + d.type : ''}: ${d.note}`);
  const base = { group, desc: a.desc, ability: a.name, usage: a.usage ?? null, consume: null };

  if (a.multiattack?.length) {
    return [
      {
        ...base,
        key,
        name: a.name,
        kind: 'multi',
        config: null,
        tags: ['Multiataque', ...(usage ? [usage] : [])],
        multi: a.multiattack.map((m) => ({ action: m.action, count: m.count, key: null })),
      },
    ];
  }

  if (a.attack) {
    const { onHit, onSave } = a.dc
      ? splitAttackDamage(a.desc, plain)
      : { onHit: plain, onSave: [] };
    const damage = damageConfig(onHit, `Dano — ${a.name}`);
    const reminders = [
      ...(a.dc && !onSave.length
        ? [`Se acertar: CD ${a.dc.value} de ${abilityInfo(a.dc.ability).name} (efeito no texto)`]
        : []),
      ...notes,
    ];
    const attack: MonsterActionButton = {
      ...base,
      key: `${key}:attack`,
      name: a.name,
      kind: 'attack',
      config: {
        mode: 'ability',
        rollType: 'attack',
        label: a.name,
        modifier: a.attack.bonus,
        ...(damage ? { damage } : {}),
        ...(reminders.length ? { reminders } : {}),
      },
      tags: [signed(a.attack.bonus), ...(usage ? [usage] : [])],
    };
    if (!onSave.length) return [attack];
    const saveLabel = `${a.name} — resistência`;
    const save = saveConfig(a, onSave, saveLabel);
    return save
      ? [
          attack,
          {
            ...base,
            key: `${key}:save`,
            name: saveLabel,
            kind: 'save',
            config: save,
            tags: [dcTag!],
          },
        ]
      : [attack];
  }

  if (a.dc && plain.length) {
    const config = saveConfig(a, plain, a.name);
    if (config) {
      if (notes.length) config.reminders = notes;
      return [
        {
          ...base,
          key,
          name: a.name,
          kind: 'save',
          config,
          tags: [dcTag!, ...(usage ? [usage] : [])],
        },
      ];
    }
  }

  if (plain.length) {
    const damage = damageConfig(plain, a.name);
    if (damage) {
      return [
        {
          ...base,
          key,
          name: a.name,
          kind: 'damage',
          config: {
            mode: 'ability',
            rollType: 'attack',
            label: a.name,
            modifier: 0,
            autoHit: true,
            damage,
            ...(notes.length ? { reminders: notes } : {}),
          },
          tags: usage ? [usage] : [],
        },
      ];
    }
  }

  return [
    {
      ...base,
      key,
      name: a.name,
      kind: 'text',
      config: null,
      tags: [...(dcTag ? [dcTag] : []), ...(usage ? [usage] : [])],
    },
  ];
}

/** O que gastar ao usar: lendária (custo), reação (uma por rodada) ou uso limitado da ficha. */
function consumeFor(group: MonsterActionGroup, a: MonsterAbility): MonsterActionOp | null {
  if (group === 'legendary_actions') return { op: 'legendary', ability: a.name };
  if (group === 'reactions') return { op: 'reaction' };
  const type = a.usage?.type;
  return type === 'recharge' || type === 'per_day' || type === 'rest'
    ? { op: 'use', ability: a.name }
    : null;
}

/** Todos os botões da ficha, na ordem do livro (traços, ações, reações, lendárias). */
export function monsterActions(block: MonsterStatBlock): MonsterActionButton[] {
  if (!isMechanicalStatBlock(block)) return [];
  const buttons = GROUPS.flatMap((group) =>
    (block[group] ?? []).flatMap((a, i) =>
      // Só o primeiro botão da habilidade gasta (a parte de resistência de um ataque não).
      buttonsFor(a, group, i).map((b, part) => ({
        ...b,
        consume: part === 0 ? consumeFor(group, a) : null,
      })),
    ),
  );
  // Multiataque aponta pro botão de cada ataque (mesmo nome, ou o nome começando igual:
  // "Garra" → "Garras").
  const attacks = buttons.filter((b) => b.kind !== 'multi' && b.kind !== 'text');
  const find = (action: string) => {
    const name = action.toLowerCase();
    return (
      attacks.find((b) => b.ability.toLowerCase() === name) ??
      attacks.find((b) => b.ability.toLowerCase().startsWith(name)) ??
      null
    );
  };
  return buttons.map((b) =>
    b.multi ? { ...b, multi: b.multi.map((m) => ({ ...m, key: find(m.action)?.key ?? null })) } : b,
  );
}

/** Total de ações lendárias por rodada (o da ficha, ou 3 quando a ficha não diz). */
export function legendaryTotal(block: MonsterStatBlock): number {
  if (!block.legendary_actions?.length) return 0;
  return block.legendary_count && block.legendary_count > 0 ? block.legendary_count : 3;
}

/** Ainda dá pra usar? Pelos usos gravados do monstro (sem estado = nada gasto). */
export function actionAvailability(
  b: MonsterActionButton,
  block: MonsterStatBlock,
  state: MonsterActionState | null | undefined,
): ActionAvailability {
  const ok: ActionAvailability = { available: true, status: null, restorable: false };
  if (!state) return ok;
  if (b.group === 'legendary_actions') {
    const cost = b.usage?.type === 'cost' ? b.usage.actions : 1;
    return { ...ok, available: state.legendary_used + cost <= legendaryTotal(block) };
  }
  if (b.group === 'reactions') {
    return state.reaction_used
      ? { available: false, status: 'USADA NESTA RODADA', restorable: false }
      : ok;
  }
  const usage = b.usage;
  if (usage?.type === 'recharge') {
    return state.recharge.includes(b.ability)
      ? { available: false, status: 'RECARREGANDO', restorable: true }
      : ok;
  }
  if (usage?.type === 'per_day' || usage?.type === 'rest') {
    const limit = usage.type === 'per_day' ? usage.times : 1;
    const used = state.uses[b.ability] ?? 0;
    if (!used) return ok;
    const left = Math.max(0, limit - used);
    return {
      available: left > 0,
      status: left > 0 ? `RESTAM ${left}` : usage.type === 'rest' ? 'USADA (DESCANSO)' : 'ESGOTADA',
      restorable: true,
    };
  }
  return ok;
}

/** Resistências (bônus da ficha, ou o modificador), testes de atributo e perícias do monstro. */
export function monsterChecks(block: MonsterStatBlock): MonsterChecks {
  const saves = ABILITIES.map((ab) => {
    const listed = block.saving_throws?.find((s) => s.ability === ab.abbr);
    const modifier = listed ? listed.bonus : abilityModifier(block[ab.score]);
    return check(`save:${ab.abbr}`, `Resistência de ${ab.name}`, modifier, 'save');
  });
  const abilities = ABILITIES.map((ab) =>
    check(`check:${ab.abbr}`, `Teste de ${ab.name}`, abilityModifier(block[ab.score]), 'skill'),
  );
  const skills = (block.skills ?? []).map((s) =>
    check(`skill:${s.name}`, s.name, s.bonus, 'skill'),
  );
  return { saves, abilities, skills };
}

function check(
  key: string,
  label: string,
  modifier: number,
  rollType: 'save' | 'skill',
): MonsterCheck {
  return { key, label, modifier, config: { mode: 'ability', rollType, label, modifier } };
}
