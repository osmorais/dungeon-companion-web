import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AvatarPreset,
  AvatarClass,
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

@Component({
  selector: 'app-avatar-customizer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './avatar-customizer.component.html',
  styleUrls: ['./avatar-customizer.component.scss'],
})
export class AvatarCustomizerComponent implements OnInit {
  @Input({ required: true }) preset!: AvatarPreset;
  @Output() presetChange = new EventEmitter<AvatarPreset>();

  localPreset!: AvatarPreset;

  readonly classes = AVATAR_CLASSES;
  readonly hairStyles = AVATAR_HAIR_STYLES;
  readonly beardStyles = AVATAR_BEARD_STYLES;
  readonly hairColors = AVATAR_HAIR_COLORS;
  readonly skinColors = AVATAR_SKIN_COLORS;

  ngOnInit(): void {
    this.localPreset = { ...this.preset };
  }

  get racePath(): string {
    return `assets/avatar/race/base_${this.localPreset.race}.png`;
  }

  get skinFilter(): string {
    return AVATAR_SKIN_COLORS.find(s => s.key === this.localPreset.skinColor)?.filter ?? 'none';
  }

  get clothesPath(): string {
    return `assets/avatar/clothes/class_${this.localPreset.classKey}.png`;
  }

  get hairPath(): string | null {
    if (!this.localPreset.hairStyle) return null;
    return `assets/avatar/hair/${this.localPreset.hairStyle}_${this.localPreset.hairColor}.png`;
  }

  get beardPath(): string | null {
    if (!this.localPreset.beardStyle || !this.localPreset.beardColor) return null;
    return `assets/avatar/beard/${this.localPreset.beardStyle}_${this.localPreset.beardColor}.png`;
  }

  get smilePath(): string | null {
    if (!this.localPreset.showSmile) return null;
    return `assets/avatar/mouth/smile.png`;
  }

  get canShowSmile(): boolean {
    return this.localPreset.race !== 'dragonborn';
  }

  showOnLoad(event: Event): void {
    (event.target as HTMLImageElement).style.display = '';
  }

  hideOnError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  private emit(): void {
    this.presetChange.emit({ ...this.localPreset });
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
