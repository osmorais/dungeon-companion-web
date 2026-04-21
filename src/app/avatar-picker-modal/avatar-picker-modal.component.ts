import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Avatar, AVATARS } from '../constants/avatars';

@Component({
  selector: 'app-avatar-picker-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar-picker-modal.component.html',
  styleUrls: ['./avatar-picker-modal.component.scss'],
})
export class AvatarPickerModalComponent implements OnInit {
  @Input() currentAvatarUrl: string | null = null;
  @Output() avatarSelected = new EventEmitter<Avatar>();
  @Output() cancelled = new EventEmitter<void>();

  readonly avatars = AVATARS;
  selectedAvatar = signal<Avatar | null>(null);

  ngOnInit() {
    const current = this.avatars.find(a => a.url === this.currentAvatarUrl);
    if (current) this.selectedAvatar.set(current);
  }

  select(avatar: Avatar) {
    this.selectedAvatar.set(avatar);
  }

  save() {
    const selected = this.selectedAvatar();
    if (selected) this.avatarSelected.emit(selected);
  }

  cancel() {
    this.cancelled.emit();
  }
}
