import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragonAnimationComponent } from '../dragon-animation/dragon-animation.component';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-server-wakeup',
  standalone: true,
  imports: [CommonModule, DragonAnimationComponent],
  templateUrl: './server-wakeup.component.html',
  styleUrls: ['./server-wakeup.component.scss'],
})
export class ServerWakeupComponent implements OnInit, OnDestroy {
  readonly visible = signal(false);
  readonly ready = signal(false);
  readonly currentMessage = signal('');
  readonly spinner = signal('|');

  private messageIndex = 0;
  private messageTimer?: ReturnType<typeof setInterval>;
  private spinnerTimer?: ReturnType<typeof setInterval>;
  private pingTimeout?: ReturnType<typeof setTimeout>;

  private readonly messages = [
    'DESPERTANDO O MESTRE DA MASMORRA',
    'OS MONSTROS ESTÃO TOMANDO SEUS POSTOS',
    'CONSULTANDO O GRIMÓRIO DO SERVIDOR',
    'CONJURANDO O PORTAL DE CONEXÃO',
    'O GUARDIÃO ESTAVA A DORMIR NA TOCA',
    'PREPARANDO AS LISTAS DE AVENTUREIROS',
    'LANÇANDO FEITIÇO DE DESPERTAR',
    'INVOCANDO OS ESPÍRITOS DO BACKEND',
    'O DRAGÃO DO SERVIDOR AINDA DORME',
    'ROLANDO OS DADOS DO DESTINO',
    'REUNINDO A GUILDA DOS AVENTUREIROS',
    'ACENDENDO A FOGUEIRA DO SERVIDOR',
  ];

  private readonly spinnerFrames = ['|', '/', '—', '\\'];
  private spinnerIndex = 0;

  ngOnInit() {
    if (!environment.production) return;

    this.visible.set(true);
    this.currentMessage.set(this.messages[0]);

    this.messageTimer = setInterval(() => {
      this.messageIndex = (this.messageIndex + 1) % this.messages.length;
      this.currentMessage.set(this.messages[this.messageIndex]);
    }, 2500);

    this.spinnerTimer = setInterval(() => {
      this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length;
      this.spinner.set(this.spinnerFrames[this.spinnerIndex]);
    }, 150);

    this.pingServer();
  }

  ngOnDestroy() {
    clearInterval(this.messageTimer);
    clearInterval(this.spinnerTimer);
    clearTimeout(this.pingTimeout);
  }

  private async pingServer() {
    try {
      const response = await fetch(`${environment.apiUrl}/api/character-options`, {
        signal: AbortSignal.timeout(12000),
      });
      if (response.ok) {
        this.onServerReady();
        return;
      }
    } catch {
      // Server still sleeping — retry
    }
    this.pingTimeout = setTimeout(() => this.pingServer(), 5000);
  }

  private onServerReady() {
    clearInterval(this.messageTimer);
    clearInterval(this.spinnerTimer);
    this.ready.set(true);
    setTimeout(() => this.visible.set(false), 2000);
  }
}
