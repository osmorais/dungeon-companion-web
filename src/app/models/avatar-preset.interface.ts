export type AvatarRace =
  | 'human'
  | 'elf'
  | 'dwarf'
  | 'dragonborn'
  | 'gnome'
  | 'half_elf'
  | 'half_orc'
  | 'halfling'
  | 'tiefling';
export type AvatarClass =
  | 'barbarian'
  | 'bard'
  | 'warlock'
  | 'cleric'
  | 'druid'
  | 'sorcerer'
  | 'fighter'
  | 'rogue'
  | 'wizard'
  | 'monk'
  | 'paladin'
  | 'ranger';
export type HairStyle =
  | 'hair_long_01'
  | 'hair_long_02'
  | 'hair_long_03'
  | 'hair_short_01'
  | 'hair_short_02'
  | 'hair_short_03'
  | 'hair_short_04'
  | 'hair_mohawk'
  | 'hair_ponytail'
  | 'hair_braid'
  | 'hair_bun'
  | 'hair_curly'
  | 'hair_bald_tufts';
export type BeardStyle = 'beard_01' | 'beard_02' | 'beard_03';
export type HairColor = 'blond' | 'grey' | 'lbrown' | 'red';
export type SkinColor =
  | 'pale'
  | 'light'
  | 'medium'
  | 'tan'
  | 'dark'
  | 'very_dark'
  | 'elf_moon'
  | 'drow'
  | 'stone'
  | 'orc_green'
  | 'orc_grey'
  | 'orc_dark'
  | 'infernal_red'
  | 'infernal_crimson'
  | 'infernal_purple'
  | 'infernal_blue'
  | 'dragon_gold'
  | 'dragon_brass'
  | 'dragon_bronze'
  | 'dragon_copper'
  | 'dragon_silver'
  | 'dragon_red'
  | 'dragon_blue'
  | 'dragon_green'
  | 'dragon_black'
  | 'dragon_white';
export type AvatarGender = 'male' | 'female';

export interface AvatarPreset {
  race: AvatarRace;
  gender: AvatarGender;
  classKey: AvatarClass | null;
  skinColor: SkinColor;
  hairStyle: HairStyle | null;
  hairColor: HairColor;
  beardStyle: BeardStyle | null;
  beardColor: HairColor | null;
  showSmile: boolean;
}

export const AVATAR_RACES: { key: AvatarRace; label: string }[] = [
  { key: 'human', label: 'Humano' },
  { key: 'elf', label: 'Elfo' },
  { key: 'dwarf', label: 'Anão' },
  { key: 'dragonborn', label: 'Draconato' },
  { key: 'gnome', label: 'Gnomo' },
  { key: 'half_elf', label: 'Meio-Elfo' },
  { key: 'half_orc', label: 'Meio-Orc' },
  { key: 'halfling', label: 'Halfling' },
  { key: 'tiefling', label: 'Tiefling' },
];

export const AVATAR_CLASSES: { key: AvatarClass; label: string }[] = [
  { key: 'barbarian', label: 'Bárbaro' },
  { key: 'bard', label: 'Bardo' },
  { key: 'warlock', label: 'Bruxo' },
  { key: 'cleric', label: 'Clérigo' },
  { key: 'druid', label: 'Druida' },
  { key: 'sorcerer', label: 'Feiticeiro' },
  { key: 'fighter', label: 'Guerreiro' },
  { key: 'rogue', label: 'Ladino' },
  { key: 'wizard', label: 'Mago' },
  { key: 'monk', label: 'Monge' },
  { key: 'paladin', label: 'Paladino' },
  { key: 'ranger', label: 'Ranger' },
];

export const AVATAR_HAIR_STYLES: { key: HairStyle; label: string }[] = [
  { key: 'hair_short_01', label: 'Curto 1' },
  { key: 'hair_short_02', label: 'Curto 2' },
  { key: 'hair_short_03', label: 'Curto 3' },
  { key: 'hair_short_04', label: 'Topete' },
  { key: 'hair_mohawk', label: 'Moicano' },
  { key: 'hair_bald_tufts', label: 'Calvo' },
  { key: 'hair_curly', label: 'Cacheado' },
  { key: 'hair_long_01', label: 'Longo 1' },
  { key: 'hair_long_02', label: 'Longo 2' },
  { key: 'hair_long_03', label: 'Longo 3' },
  { key: 'hair_ponytail', label: 'Rabo de cavalo' },
  { key: 'hair_braid', label: 'Trança' },
  { key: 'hair_bun', label: 'Coque' },
];

export const AVATAR_BEARD_STYLES: { key: BeardStyle; label: string }[] = [
  { key: 'beard_01', label: 'Barba 1' },
  { key: 'beard_02', label: 'Barba 2' },
  { key: 'beard_03', label: 'Barba 3' },
];

export const AVATAR_HAIR_COLORS: { key: HairColor; label: string; hex: string }[] = [
  { key: 'blond', label: 'Loiro', hex: '#E8C96B' },
  { key: 'grey', label: 'Grisalho', hex: '#A0A0A0' },
  { key: 'lbrown', label: 'Castanho', hex: '#7B4F2E' },
  { key: 'red', label: 'Ruivo', hex: '#C03010' },
];

/** Tons de pele. Cada raça usa uma lista própria (`AVATAR_SKIN_BY_RACE`), conforme a lore. A
 * imagem do corpo já vem recolorida (`assets/avatar/race_skin/`): só a pele muda, olhos, boca e
 * chifres ficam como no desenho original. */
export const AVATAR_SKIN_COLORS: { key: SkinColor; label: string; hex: string }[] = [
  { key: 'pale', label: 'Muito Claro', hex: '#EBC3A5' },
  { key: 'light', label: 'Claro', hex: '#D69F78' },
  { key: 'medium', label: 'Médio', hex: '#C08453' },
  { key: 'tan', label: 'Moreno', hex: '#9C6640' },
  { key: 'dark', label: 'Escuro', hex: '#6B4129' },
  { key: 'very_dark', label: 'Retinto', hex: '#43281A' },
  { key: 'elf_moon', label: 'Lunar', hex: '#D3D2E0' },
  { key: 'drow', label: 'Drow', hex: '#45404F' },
  { key: 'stone', label: 'Cinza Pedra', hex: '#8C8A86' },
  { key: 'orc_green', label: 'Verde', hex: '#7C8A46' },
  { key: 'orc_grey', label: 'Cinza', hex: '#848A80' },
  { key: 'orc_dark', label: 'Verde Escuro', hex: '#4F5C2E' },
  { key: 'infernal_red', label: 'Vermelho', hex: '#B03A2C' },
  { key: 'infernal_crimson', label: 'Carmesim', hex: '#781E22' },
  { key: 'infernal_purple', label: 'Roxo', hex: '#6C3A7C' },
  { key: 'infernal_blue', label: 'Azul', hex: '#3E5A8E' },
  { key: 'dragon_gold', label: 'Ouro', hex: '#D2A43A' },
  { key: 'dragon_brass', label: 'Latão', hex: '#B8924E' },
  { key: 'dragon_bronze', label: 'Bronze', hex: '#8E6A36' },
  { key: 'dragon_copper', label: 'Cobre', hex: '#B4683A' },
  { key: 'dragon_silver', label: 'Prata', hex: '#A6AEB8' },
  { key: 'dragon_red', label: 'Vermelho', hex: '#A8322A' },
  { key: 'dragon_blue', label: 'Azul', hex: '#3A64A8' },
  { key: 'dragon_green', label: 'Verde', hex: '#3E7A3E' },
  { key: 'dragon_black', label: 'Negro', hex: '#34323A' },
  { key: 'dragon_white', label: 'Branco', hex: '#D8DCE2' },
];

const HUMAN_SKINS: SkinColor[] = ['pale', 'light', 'medium', 'tan', 'dark', 'very_dark'];

export const AVATAR_SKIN_BY_RACE: Record<AvatarRace, SkinColor[]> = {
  human: HUMAN_SKINS,
  half_elf: HUMAN_SKINS,
  halfling: HUMAN_SKINS,
  elf: [...HUMAN_SKINS, 'elf_moon', 'drow'],
  dwarf: [...HUMAN_SKINS, 'stone'],
  gnome: [...HUMAN_SKINS, 'stone'],
  tiefling: [
    ...HUMAN_SKINS,
    'infernal_red',
    'infernal_crimson',
    'infernal_purple',
    'infernal_blue',
  ],
  half_orc: ['orc_green', 'orc_grey', 'orc_dark'],
  dragonborn: [
    'dragon_gold',
    'dragon_brass',
    'dragon_bronze',
    'dragon_copper',
    'dragon_silver',
    'dragon_red',
    'dragon_blue',
    'dragon_green',
    'dragon_black',
    'dragon_white',
  ],
};

/** Tom usado quando o salvo não existe pra raça (ex.: 'medium' num meio-orc): o do desenho original. */
const DEFAULT_SKIN: Partial<Record<AvatarRace, SkinColor>> = {
  tiefling: 'infernal_red',
  half_orc: 'orc_green',
  dragonborn: 'dragon_gold',
};

export function skinTonesFor(race: AvatarRace): { key: SkinColor; label: string; hex: string }[] {
  const keys = AVATAR_SKIN_BY_RACE[race] ?? HUMAN_SKINS;
  return keys.map((k) => AVATAR_SKIN_COLORS.find((s) => s.key === k)!);
}

export function resolveSkinColor(race: AvatarRace, skin: SkinColor | null | undefined): SkinColor {
  const keys = AVATAR_SKIN_BY_RACE[race] ?? HUMAN_SKINS;
  if (skin && keys.includes(skin)) return skin;
  return DEFAULT_SKIN[race] ?? 'medium';
}

/** Imagem do corpo já na cor de pele escolhida. */
export function avatarBasePath(
  preset: Pick<AvatarPreset, 'race' | 'gender' | 'skinColor'>,
): string {
  const skin = resolveSkinColor(preset.race, preset.skinColor);
  const prefix = (preset.gender ?? 'male') === 'female' ? 'base_fem' : 'base';
  return `assets/avatar/race_skin/${prefix}_${preset.race}_${skin}.png`;
}

export const RACE_NAME_TO_AVATAR: Record<string, AvatarRace> = {
  Humano: 'human',
  Elfo: 'elf',
  Anão: 'dwarf',
  Draconato: 'dragonborn',
  Gnomo: 'gnome',
  'Meio-Elfo': 'half_elf',
  'Meio-elfo': 'half_elf',
  'Meio-Orc': 'half_orc',
  'Meio-orc': 'half_orc',
  Halfling: 'halfling',
  Tiefling: 'tiefling',
};

export const CLASS_NAME_TO_AVATAR: Record<string, AvatarClass> = {
  Bárbaro: 'barbarian',
  Bardo: 'bard',
  Bruxo: 'warlock',
  Clérigo: 'cleric',
  Druida: 'druid',
  Feiticeiro: 'sorcerer',
  Guerreiro: 'fighter',
  Ladino: 'rogue',
  Mago: 'wizard',
  Monge: 'monk',
  Paladino: 'paladin',
  Ranger: 'ranger',
};
