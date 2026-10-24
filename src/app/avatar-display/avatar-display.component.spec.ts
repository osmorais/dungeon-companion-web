import { TestBed } from '@angular/core/testing';
import { AvatarDisplayComponent } from './avatar-display.component';
import { AvatarPreset } from '../models/avatar-preset.interface';

describe('AvatarDisplayComponent', () => {
  const preset: AvatarPreset = {
    race: 'half_orc',
    gender: 'male',
    classKey: 'barbarian',
    skinColor: 'orc_grey',
    hairStyle: null,
    hairColor: 'grey',
    beardStyle: null,
    beardColor: null,
    showSmile: false,
  };

  const create = (basePath?: string) => {
    const avatar = TestBed.createComponent(AvatarDisplayComponent).componentInstance;
    avatar.preset = preset;
    avatar.basePath = basePath;
    return avatar;
  };

  it('sem basePath, a base vem do tom de pele do preset', () => {
    expect(create().racePath).toBe('assets/avatar/race_skin/base_half_orc_orc_grey.png');
  });

  it('basePath troca só a base; a roupa continua a da classe', () => {
    const avatar = create('assets/avatar/race/base_half_orc.png');
    expect(avatar.racePath).toBe('assets/avatar/race/base_half_orc.png');
    expect(avatar.clothesPath).toBe('assets/avatar/clothes/class_barbarian.png');
  });

  it('sem cabelo e sem barba não monta essas camadas', () => {
    const avatar = create();
    expect(avatar.hairPath).toBeNull();
    expect(avatar.beardPath).toBeNull();
  });
});
