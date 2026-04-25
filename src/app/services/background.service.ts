import { Injectable, signal } from '@angular/core';

const BACKGROUNDS = [
  'backgrounds/background-realm.png',
  'backgrounds/background-dragon.png',
  'backgrounds/background-castle.png',
];

@Injectable({ providedIn: 'root' })
export class BackgroundService {
  private index = 0;
  readonly currentImage = signal(BACKGROUNDS[0]);
  readonly transitioning = signal(false);

  next() {
    this.transitioning.set(true);
    setTimeout(() => {
      this.index = (this.index + 1) % BACKGROUNDS.length;
      this.currentImage.set(BACKGROUNDS[this.index]);
      this.transitioning.set(false);
    }, 300);
  }
}
