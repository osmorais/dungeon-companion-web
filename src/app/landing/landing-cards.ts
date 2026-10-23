import { Spell, WeaponRow } from '../models/character-options.interface';
import { GameCardData, GameCardState } from '../game-card/game-card.model';
import { spellToCard } from '../game-card/spell-card';
import { weaponToCard } from '../game-card/weapon-card';

/** Carta da vitrine da tela inicial. */
export interface ShowcaseCard {
  key: string;
  card: GameCardData;
  state: GameCardState;
}

export type ShowcaseDeck = 'spells' | 'weapons';

/**
 * Magias de exemplo — cópia de linhas do catálogo (`dungeon-companion-api/docs/database/
 * database_inserts.sql`, tabela Spell), uma por escola com arte, pra mostrar a variedade.
 */
const SAMPLE_SPELLS: Spell[] = [
  {
    id_spell: 44,
    name: 'Bola de Fogo',
    description:
      'Um veio brilhante lampeja na ponta do seu dedo em direção a um ponto que você escolher, dentro do alcance, e então eclode com um estampido baixo, explodindo em chamas. Cada criatura em uma esfera de 6 metros de raio, centrada no ponto, deve realizar um teste de resistência de Destreza. Um alvo sofre 8d6 de dano de fogo se falhar na resistência, ou metade desse dano se obtiver sucesso. O fogo se espalha, dobrando esquinas. Ele incendeia objetos inflamáveis na área que não estejam sendo vestidos ou carregados. Em Níveis Superiores. Quando você conjurar essa magia usando um espaço de magia de 4° nível ou superior, o dano aumenta em 1d6 para cada nível do espaço acima do 3°.',
    casting_time: '1 ação',
    range_distance: 45,
    duration: 'Instantânea',
    is_verbal: true,
    is_somatic: true,
    is_material: true,
    spellLevel: 3,
    school: 'Evocação',
    is_prepared: true,
  },
  {
    id_spell: 145,
    name: 'Escudo Arcano',
    description:
      'Uma barreira de força mágica invisível surge e protege você. Até o início de seu próximo turno, você terá +5 na CA, inclusive contra o ataque que disparou a reação, e você não sofre dano de mísseis mágicos.',
    casting_time: '1 reação',
    range_distance: 0,
    duration: '1 rodada',
    is_verbal: true,
    is_somatic: true,
    is_material: false,
    spellLevel: 1,
    school: 'Abjuração',
    is_prepared: true,
  },
  {
    id_spell: 345,
    name: 'Toque Arrepiante',
    description:
      'Você cria uma mão esquelética e fantasmagórica no espaço ocupado por uma criatura que se encontre no alcance da magia. Faça um ataque mágico à distância contra a criatura para atingi-la com um calafrio sepulcral. Se o ataque for bem-sucedido, ela sofre 1d8 pontos de dano necrótico e não pode recuperar pontos de vida até o início do seu próximo turno. Até lá, a mão se agarra ao alvo. Se você atacar um alvo morto-vivo, ele também terá desvantagem nas jogadas de ataque contra você até o final do seu próximo turno. O dano desta magia aumenta em 1d8 quando você alcança o 5° nível (2d8), 11° nível (3d8) e 17° nível (4d8).',
    casting_time: '1 ação',
    range_distance: 36,
    duration: '1 rodada',
    is_verbal: true,
    is_somatic: true,
    is_material: false,
    spellLevel: 0,
    school: 'Necromancia',
  },
  {
    id_spell: 188,
    name: 'Invisibilidade',
    description:
      'Uma criatura que você tocar, se torna invisível até a magia acabar. Qualquer coisa que o alvo esteja vestindo ou carregando fica invisível enquanto estiver de posse do alvo. A magia termina para o alvo caso ele ataque ou conjure uma magia. Em Níveis Superiores. Quando você conjurar essa magia usando um espaço de magia de 3° nível ou superior, você pode afetar um alvo adicional para cada nível do espaço acima do 2°.',
    casting_time: '1 ação',
    range_distance: 1,
    duration: 'Concentração, até 1 hora',
    is_verbal: true,
    is_somatic: true,
    is_material: true,
    spellLevel: 2,
    school: 'Ilusão',
  },
  {
    id_spell: 329,
    name: 'Sono',
    description:
      'Essa magia põem as criaturas num entorpecimento mágico. Jogue 5d8; o total é a quantidade de pontos de vida de criaturas afetados pela magia. As criaturas numa área de 6 metros de raio, centrada no ponto escolhido, dentro do alcance, são afetadas em ordem ascendente dos pontos de vida atuais delas (ignorando criaturas inconscientes). Começando com as criaturas com menos pontos de vida atuais, cada criatura afetada por essa magia cai inconsciente até a magia acabar, sofrer dano ou alguém usar sua ação para sacudi-la ou esbofeteá-la até acordar. Subtraia os pontos de vida de cada criatura do total antes de seguir para a próxima criatura com menos pontos de vida atuais. Os pontos de vida atuais da criatura devem ser iguais ou menores que o valor restante para que a criatura possa ser afetada. Mortos-vivos e criaturas imunes a serem enfeitiçadas não são afetadas por essa magia. Em Níveis Superiores. Quando você conjurar essa magia usando um espaço de magia de 2º nível ou superior, jogue 2d8 adicionais para cada nível do espaço acima do 1°.',
    casting_time: '1 ação',
    range_distance: 36,
    duration: '1 minuto',
    is_verbal: true,
    is_somatic: true,
    is_material: true,
    spellLevel: 1,
    school: 'Encantamento',
  },
];

/**
 * Armas de exemplo — linhas do catálogo (tabela Weapon; o id é a ordem de inserção e escolhe a
 * arte `assets/cards/weapon-<id>.webp`). Bônus calculados pro anão bárbaro do cartão do topo
 * (FOR 16, DES 13, proficiência +2).
 */
const SAMPLE_WEAPONS: WeaponRow[] = [
  {
    id_weapon: 25,
    name: 'Machado Grande',
    attack_bonus: 5,
    damage_modifier: 3,
    damage_die: '1d12',
    damage_type: 'cortante',
    properties: 'Pesada, duas mãos',
    weight: 3.5,
    price_value: 30,
    isRanged: false,
  },
  {
    id_weapon: 20,
    name: 'Espada Longa',
    attack_bonus: 5,
    damage_modifier: 3,
    damage_die: '1d8',
    damage_type: 'cortante',
    properties: 'Versátil (1d10)',
    weight: 1.5,
    price_value: 15,
    isRanged: false,
  },
  {
    id_weapon: 29,
    name: 'Martelo de Guerra',
    attack_bonus: 5,
    damage_modifier: 3,
    damage_die: '1d8',
    damage_type: 'concussão',
    properties: 'Versátil (1d10)',
    weight: 1,
    price_value: 15,
    isRanged: false,
  },
  {
    id_weapon: 33,
    name: 'Arco Longo',
    attack_bonus: 3,
    damage_modifier: 1,
    damage_die: '1d8',
    damage_type: 'perfurante',
    properties: 'Munição (distância 45/180), pesada, duas mãos',
    weight: 1,
    price_value: 50,
    isRanged: true,
  },
];

export const SHOWCASE_DECKS: Record<ShowcaseDeck, ShowcaseCard[]> = {
  // Preparada = pronta pra lançar (brilho dourado), como no grimório da sessão.
  spells: SAMPLE_SPELLS.map((spell) => ({
    key: `spell-${spell.id_spell}`,
    card: spellToCard(spell),
    state: spell.is_prepared ? 'ready' : null,
  })),
  weapons: SAMPLE_WEAPONS.map((weapon) => ({
    key: `weapon-${weapon.id_weapon}`,
    card: weaponToCard(weapon),
    state: null,
  })),
};

/**
 * Posição de `i` em relação à carta da vez num carrossel circular de `count` cartas: o caminho
 * mais curto, então a última carta fica à esquerda da primeira (−1) e não lá no fim (+n−1).
 */
export function circularOffset(i: number, index: number, count: number): number {
  if (count <= 0) return 0;
  let d = (((i - index) % count) + count) % count;
  if (d > count / 2) d -= count;
  return d;
}
