export type AvatarRace = 'human' | 'elf' | 'dwarf' | 'dragonborn' | 'gnome' | 'half_elf' | 'half_orc' | 'halfling' | 'tiefling';
export type AvatarClass = 'barbarian' | 'bard' | 'warlock' | 'cleric' | 'druid' | 'sorcerer' | 'fighter' | 'rogue' | 'wizard' | 'monk' | 'paladin' | 'ranger';
export type HairStyle = 'hair_long_01' | 'hair_long_02' | 'hair_short_01' | 'hair_short_02' | 'hair_short_03';
export type BeardStyle = 'beard_01' | 'beard_02' | 'beard_03';
export type HairColor = 'blond' | 'grey' | 'lbrown' | 'red';
export type SkinColor = 'pale' | 'light' | 'medium' | 'tan' | 'dark' | 'very_dark';
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
  // { key: 'cleric', label: 'Clérigo' },
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
  { key: 'hair_long_01', label: 'Longo 1' },
  { key: 'hair_long_02', label: 'Longo 2' },
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

export const AVATAR_SKIN_COLORS: { key: SkinColor; label: string; hex: string; filter: string }[] = [
  { key: 'pale',      label: 'Muito Claro', hex: '#F8D5B5', filter: 'brightness(1.3) saturate(0.4)' },
  { key: 'light',     label: 'Claro',       hex: '#E8B89A', filter: 'brightness(1.1) saturate(0.75)' },
  { key: 'medium',    label: 'Médio',       hex: '#C68642', filter: 'none' },
  { key: 'tan',       label: 'Bronzeado',   hex: '#8D5524', filter: 'brightness(0.85) saturate(1.3) sepia(0.15)' },
  { key: 'dark',      label: 'Escuro',      hex: '#5C3A1E', filter: 'brightness(0.65) saturate(1.2) sepia(0.25)' },
  { key: 'very_dark', label: 'Muito Escuro',hex: '#2C1A10', filter: 'brightness(0.42) saturate(1.1) sepia(0.35)' },
];

export const RACE_NAME_TO_AVATAR: Record<string, AvatarRace> = {
  'Humano': 'human',
  'Elfo': 'elf',
  'Anão': 'dwarf',
  'Draconato': 'dragonborn',
  'Gnomo': 'gnome',
  'Meio-Elfo': 'half_elf',
  'Meio-elfo': 'half_elf',
  'Meio-Orc': 'half_orc',
  'Meio-orc': 'half_orc',
  'Halfling': 'halfling',
  'Tiefling': 'tiefling',
};

export const CLASS_NAME_TO_AVATAR: Record<string, AvatarClass> = {
  'Bárbaro': 'barbarian',
  'Bardo': 'bard',
  'Bruxo': 'warlock',
  'Clérigo': 'cleric',
  'Druida': 'druid',
  'Feiticeiro': 'sorcerer',
  'Guerreiro': 'fighter',
  'Ladino': 'rogue',
  'Mago': 'wizard',
  'Monge': 'monk',
  'Paladino': 'paladin',
  'Ranger': 'ranger',
};
