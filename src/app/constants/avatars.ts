export interface Avatar {
  id: string;
  label: string;
  url: string;
}

const BASE = 'https://api.dicebear.com/9.x/pixel-art/svg';

export const AVATARS: Avatar[] = [
  { id: 'warrior',   label: 'Guerreiro',    url: `${BASE}?seed=warrior&backgroundColor=1d0a0a` },
  { id: 'mage',      label: 'Mago',         url: `${BASE}?seed=mage&backgroundColor=1d0a0a` },
  { id: 'rogue',     label: 'Ladino',       url: `${BASE}?seed=rogue&backgroundColor=1d0a0a` },
  { id: 'cleric',    label: 'Clérigo',      url: `${BASE}?seed=cleric&backgroundColor=1d0a0a` },
  { id: 'ranger',    label: 'Patrulheiro',  url: `${BASE}?seed=ranger&backgroundColor=1d0a0a` },
  { id: 'paladin',   label: 'Paladino',     url: `${BASE}?seed=paladin&backgroundColor=1d0a0a` },
  { id: 'druid',     label: 'Druida',       url: `${BASE}?seed=druid&backgroundColor=1d0a0a` },
  { id: 'barbarian', label: 'Bárbaro',      url: `${BASE}?seed=barbarian&backgroundColor=1d0a0a` },
  { id: 'bard',      label: 'Bardo',        url: `${BASE}?seed=bard&backgroundColor=1d0a0a` },
  { id: 'warlock',   label: 'Bruxo',        url: `${BASE}?seed=warlock&backgroundColor=1d0a0a` },
  { id: 'monk',      label: 'Monge',        url: `${BASE}?seed=monk&backgroundColor=1d0a0a` },
  { id: 'sorcerer',  label: 'Feiticeiro',   url: `${BASE}?seed=sorcerer&backgroundColor=1d0a0a` },
];
