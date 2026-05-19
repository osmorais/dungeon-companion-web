import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarPreset, AVATAR_SKIN_COLORS } from '../models/avatar-preset.interface';

@Component({
  selector: 'app-avatar-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar-display.component.html',
  styleUrls: ['./avatar-display.component.scss'],
})
export class AvatarDisplayComponent {
  @Input() preset?: AvatarPreset | null;

  get racePath(): string {
    if ((this.preset!.gender ?? 'male') === 'female') {
      return `assets/avatar/race_fem/base_fem_${this.preset!.race}.png`;
    }
    return `assets/avatar/race/base_${this.preset!.race}.png`;
  }

  get skinFilter(): string {
    return AVATAR_SKIN_COLORS.find(s => s.key === this.preset?.skinColor)?.filter ?? 'none';
  }

  get clothesPath(): string {
    if (this.preset?.gender === 'female') {
      return `assets/avatar/clothes_fem/class_${this.preset.classKey}_fem.png`;
    }
    return `assets/avatar/clothes/class_${this.preset!.classKey}.png`;
  }

  get hairPath(): string | null {
    if (!this.preset?.hairStyle) return null;
    return `assets/avatar/hair/${this.preset.hairStyle}_${this.preset.hairColor}.png`;
  }

  get beardPath(): string | null {
    if (!this.preset?.beardStyle || !this.preset.beardColor) return null;
    return `assets/avatar/beard/${this.preset.beardStyle}_${this.preset.beardColor}.png`;
  }

  get smilePath(): string | null {
    if (!this.preset?.showSmile) return null;
    return `assets/avatar/mouth/smile.png`;
  }

  showOnLoad(event: Event): void {
    (event.target as HTMLImageElement).style.display = '';
  }

  hideOnError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
