import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarDisplayComponent } from '../avatar-display/avatar-display.component';
import {
  AvatarPreset,
  AvatarClass,
  AvatarGender,
  HairStyle,
  BeardStyle,
  HairColor,
  SkinColor,
  AVATAR_CLASSES,
  AVATAR_HAIR_STYLES,
  AVATAR_BEARD_STYLES,
  AVATAR_HAIR_COLORS,
  AVATAR_SKIN_COLORS,
} from '../models/avatar-preset.interface';

export type AvatarTab = 'body' | 'hair' | 'beard' | 'clothes' | 'face';
export type AvatarTileGroup = 'gender' | 'skin' | 'hair' | 'beard' | 'clothes' | 'smile';

/** Uma miniatura: o avatar atual com só aquela opção trocada. */
export interface AvatarTile {
  key: string;
  label: string;
  preset: AvatarPreset;
  active: boolean;
}

@Component({
  selector: 'app-avatar-customizer',
  standalone: true,
  imports: [CommonModule, AvatarDisplayComponent],
  templateUrl: './avatar-customizer.component.html',
  styleUrls: ['./avatar-customizer.component.scss'],
})
export class AvatarCustomizerComponent implements OnInit {
  @Input({ required: true }) preset!: AvatarPreset;
  @Output() presetChange = new EventEmitter<AvatarPreset>();

  localPreset!: AvatarPreset;

  readonly hairColors = AVATAR_HAIR_COLORS;

  activeTab: AvatarTab = 'body';

  genderTiles: AvatarTile[] = [];
  skinTiles: AvatarTile[] = [];
  hairTiles: AvatarTile[] = [];
  beardTiles: AvatarTile[] = [];
  clothesTiles: AvatarTile[] = [];
  smileTiles: AvatarTile[] = [];

  ngOnInit(): void {
    this.localPreset = { ...this.preset, gender: this.preset?.gender ?? 'male' };
    this.buildTiles();
  }

  get tabs(): { key: AvatarTab; label: string }[] {
    const tabs: { key: AvatarTab; label: string }[] = [
      { key: 'body', label: 'CORPO' },
      { key: 'hair', label: 'CABELO' },
    ];
    if (this.localPreset.gender === 'male') tabs.push({ key: 'beard', label: 'BARBA' });
    tabs.push({ key: 'clothes', label: 'ROUPA' });
    if (this.canShowSmile) tabs.push({ key: 'face', label: 'ROSTO' });
    return tabs;
  }

  selectTab(tab: AvatarTab): void {
    this.activeTab = tab;
  }

  selectTile(group: AvatarTileGroup, key: string): void {
    switch (group) {
      case 'gender':
        return this.selectGender(key as AvatarGender);
      case 'skin':
        return this.selectSkinColor(key as SkinColor);
      case 'hair':
        return this.selectHairStyle(key === 'none' ? null : (key as HairStyle));
      case 'beard':
        return this.selectBeardStyle(key === 'none' ? null : (key as BeardStyle));
      case 'clothes':
        return this.selectClassKey(key as AvatarClass);
      case 'smile':
        return this.selectSmile(key === 'smile');
    }
  }

  /** As miniaturas são recalculadas só quando o preset muda, não a cada ciclo de detecção. */
  private buildTiles(): void {
    const p = this.localPreset;
    const tile = (key: string, label: string, patch: Partial<AvatarPreset>, active: boolean) => ({
      key,
      label,
      preset: { ...p, ...patch },
      active,
    });

    this.genderTiles = [
      tile('male', 'Masculino', { gender: 'male' }, p.gender === 'male'),
      tile(
        'female',
        'Feminino',
        { gender: 'female', beardStyle: null, beardColor: null },
        p.gender === 'female',
      ),
    ];
    this.skinTiles = AVATAR_SKIN_COLORS.map((s) =>
      tile(s.key, s.label, { skinColor: s.key }, p.skinColor === s.key),
    );
    this.hairTiles = [
      tile('none', 'Nenhum', { hairStyle: null }, !p.hairStyle),
      ...AVATAR_HAIR_STYLES.map((h) =>
        tile(h.key, h.label, { hairStyle: h.key }, p.hairStyle === h.key),
      ),
    ];
    const beardColor = p.beardColor ?? p.hairColor;
    this.beardTiles = [
      tile('none', 'Nenhuma', { beardStyle: null, beardColor: null }, !p.beardStyle),
      ...AVATAR_BEARD_STYLES.map((b) =>
        tile(b.key, b.label, { beardStyle: b.key, beardColor }, p.beardStyle === b.key),
      ),
    ];
    this.clothesTiles = AVATAR_CLASSES.map((c) =>
      tile(c.key, c.label, { classKey: c.key }, p.classKey === c.key),
    );
    this.smileTiles = [
      tile('none', 'Neutro', { showSmile: false }, !p.showSmile),
      tile('smile', 'Sorriso', { showSmile: true }, p.showSmile),
    ];
  }

  get canShowSmile(): boolean {
    return this.localPreset.race !== 'dragonborn';
  }

  private emit(): void {
    this.buildTiles();
    if (!this.tabs.some((t) => t.key === this.activeTab)) this.activeTab = 'body';
    this.presetChange.emit({ ...this.localPreset });
  }

  selectGender(gender: AvatarGender): void {
    const beardStyle = gender === 'female' ? null : this.localPreset.beardStyle;
    const beardColor = gender === 'female' ? null : this.localPreset.beardColor;
    this.localPreset = { ...this.localPreset, gender, beardStyle, beardColor };
    this.emit();
  }

  selectClassKey(classKey: AvatarClass): void {
    this.localPreset = { ...this.localPreset, classKey };
    this.emit();
  }

  selectHairStyle(hairStyle: HairStyle | null): void {
    this.localPreset = { ...this.localPreset, hairStyle };
    this.emit();
  }

  selectHairColor(hairColor: HairColor): void {
    this.localPreset = {
      ...this.localPreset,
      hairColor,
      beardColor: this.localPreset.beardStyle ? hairColor : null,
    };
    this.emit();
  }

  selectBeardStyle(beardStyle: BeardStyle | null): void {
    this.localPreset = {
      ...this.localPreset,
      beardStyle,
      beardColor: beardStyle ? (this.localPreset.beardColor ?? this.localPreset.hairColor) : null,
    };
    this.emit();
  }

  selectBeardColor(beardColor: HairColor): void {
    this.localPreset = { ...this.localPreset, beardColor };
    this.emit();
  }

  selectSmile(showSmile: boolean): void {
    this.localPreset = { ...this.localPreset, showSmile };
    this.emit();
  }

  selectSkinColor(skinColor: SkinColor): void {
    this.localPreset = { ...this.localPreset, skinColor };
    this.emit();
  }
}
