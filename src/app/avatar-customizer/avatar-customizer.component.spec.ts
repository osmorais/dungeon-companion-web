import { TestBed } from '@angular/core/testing';
import { AvatarCustomizerComponent } from './avatar-customizer.component';
import {
  AvatarPreset,
  AVATAR_SKIN_BY_RACE,
  AVATAR_SKIN_COLORS,
  avatarBasePath,
  resolveSkinColor,
  skinTonesFor,
} from '../models/avatar-preset.interface';

describe('AvatarCustomizerComponent', () => {
  const base: AvatarPreset = {
    race: 'human',
    gender: 'male',
    classKey: 'fighter',
    skinColor: 'medium',
    hairStyle: 'hair_short_01',
    hairColor: 'red',
    beardStyle: null,
    beardColor: null,
    showSmile: false,
  };

  const create = (preset: Partial<AvatarPreset> = {}) => {
    const c = TestBed.runInInjectionContext(() => new AvatarCustomizerComponent());
    c.preset = { ...base, ...preset };
    c.ngOnInit();
    const emitted: AvatarPreset[] = [];
    c.presetChange.subscribe((p) => emitted.push(p));
    return { c, emitted };
  };

  it('abas: barba só para masculino e rosto escondido para draconato', () => {
    expect(create().c.tabs.map((t) => t.key)).toEqual(['body', 'hair', 'beard', 'clothes', 'face']);
    expect(create({ gender: 'female' }).c.tabs.map((t) => t.key)).toEqual([
      'body',
      'hair',
      'clothes',
      'face',
    ]);
    expect(create({ race: 'dragonborn' }).c.tabs.map((t) => t.key)).not.toContain('face');
  });

  it('cada miniatura é o avatar atual com só aquela opção trocada', () => {
    const { c } = create();
    expect(c.hairTiles).toHaveLength(14);
    expect(c.hairTiles[0].key).toBe('none');
    const long = c.hairTiles.find((t) => t.key === 'hair_long_02')!;
    expect(long.preset).toEqual({ ...base, hairStyle: 'hair_long_02' });
    expect(c.hairTiles.filter((t) => t.active).map((t) => t.key)).toEqual(['hair_short_01']);
    expect(c.clothesTiles).toHaveLength(12);
    expect(c.skinTiles).toHaveLength(6);
  });

  it('miniaturas de barba usam a cor do cabelo quando ainda não há barba', () => {
    const { c } = create();
    const beard = c.beardTiles.find((t) => t.key === 'beard_02')!;
    expect(beard.preset.beardStyle).toBe('beard_02');
    expect(beard.preset.beardColor).toBe('red');
    expect(c.beardTiles[0].active).toBe(true);
  });

  it('escolher uma miniatura emite o preset e move o ✓', () => {
    const { c, emitted } = create();
    c.selectTile('clothes', 'wizard');
    expect(emitted.at(-1)!.classKey).toBe('wizard');
    expect(c.clothesTiles.find((t) => t.active)!.key).toBe('wizard');

    c.selectTile('hair', 'none');
    expect(emitted.at(-1)!.hairStyle).toBeNull();
    expect(c.hairTiles[0].active).toBe(true);

    c.selectTile('smile', 'smile');
    expect(emitted.at(-1)!.showSmile).toBe(true);
  });

  it('trocar para feminino na aba barba remove a barba e volta para CORPO', () => {
    const { c, emitted } = create({ beardStyle: 'beard_01', beardColor: 'red' });
    c.selectTab('beard');
    c.selectTile('gender', 'female');
    expect(emitted.at(-1)!.beardStyle).toBeNull();
    expect(emitted.at(-1)!.beardColor).toBeNull();
    expect(c.activeTab).toBe('body');
  });

  it('miniatura feminina não mostra barba', () => {
    const { c } = create({ beardStyle: 'beard_01', beardColor: 'red' });
    const female = c.genderTiles.find((t) => t.key === 'female')!;
    expect(female.preset.beardStyle).toBeNull();
  });

  it('tons de pele seguem a raça: draconato só cores de dragão, meio-orc só tons de orc', () => {
    expect(create({ race: 'dragonborn' }).c.skinTiles.map((t) => t.key)).toEqual(
      AVATAR_SKIN_BY_RACE.dragonborn,
    );
    expect(skinTonesFor('half_orc').map((t) => t.key)).toEqual([
      'orc_green',
      'orc_grey',
      'orc_dark',
    ]);
    expect(skinTonesFor('elf').map((t) => t.key)).toContain('drow');
    expect(skinTonesFor('tiefling').map((t) => t.key)).toContain('very_dark');
  });

  it('todo tom usado por alguma raça tem nome e cor', () => {
    for (const keys of Object.values(AVATAR_SKIN_BY_RACE)) {
      for (const k of keys) expect(AVATAR_SKIN_COLORS.some((s) => s.key === k)).toBe(true);
    }
  });

  it('tom salvo que não existe pra raça cai no tom original do desenho', () => {
    expect(resolveSkinColor('half_orc', 'medium')).toBe('orc_green');
    expect(resolveSkinColor('dragonborn', 'dark')).toBe('dragon_gold');
    expect(resolveSkinColor('tiefling', 'dark')).toBe('dark');
    expect(resolveSkinColor('elf', 'orc_green')).toBe('medium');
    const { c } = create({ race: 'half_orc', skinColor: 'medium' });
    expect(c.skinTiles.find((t) => t.active)!.key).toBe('orc_green');
  });

  it('o corpo vem da imagem já recolorida, por gênero e tom', () => {
    expect(avatarBasePath({ race: 'human', gender: 'male', skinColor: 'very_dark' })).toBe(
      'assets/avatar/race_skin/base_human_very_dark.png',
    );
    expect(avatarBasePath({ race: 'half_orc', gender: 'female', skinColor: 'medium' })).toBe(
      'assets/avatar/race_skin/base_fem_half_orc_orc_green.png',
    );
  });
});
