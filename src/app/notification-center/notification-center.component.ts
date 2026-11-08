import {
  Component,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationsService } from '../services/notifications.service';
import { SocialSocketService } from '../services/social-socket.service';
import { AppNotification } from '../models/friend.interface';
import { notificationLink, notificationText, timeAgo } from './notification-text';

const PANEL_SIZE = 10;

/**
 * Sino de notificações no topo (1.18.0), visível enquanto o usuário está logado. Também segura a
 * conexão do socket social — é o que mantém a presença do usuário viva em qualquer tela.
 */
@Component({
  selector: 'app-notification-center',
  standalone: true,
  templateUrl: './notification-center.component.html',
  styleUrls: ['./notification-center.component.scss'],
})
export class NotificationCenterComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);
  private socket = inject(SocialSocketService);
  readonly notifications = inject(NotificationsService);

  readonly text = notificationText;
  readonly ago = timeAgo;

  open = signal(false);
  items = signal<AppNotification[]>([]);
  loading = signal(false);
  error = signal(false);

  private subs = new Subscription();

  ngOnInit(): void {
    this.socket.acquire();
    this.notifications.refreshUnread();
    this.subs.add(
      this.socket.events.subscribe((event) => {
        if (event.type !== 'notification_created') return;
        this.notifications.unread.update((n) => n + 1);
        if (this.open())
          this.items.update((list) => [event.notification, ...list].slice(0, PANEL_SIZE));
      }),
    );
    // Depois de cair e voltar, o contador pode ter perdido eventos: busca de novo.
    this.subs.add(this.socket.reconnected.subscribe(() => this.notifications.refreshUnread()));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.socket.release();
  }

  toggle(): void {
    if (this.open()) {
      this.open.set(false);
      return;
    }
    this.open.set(true);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.notifications.list(1, PANEL_SIZE).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  select(n: AppNotification): void {
    if (!n.read_at) {
      this.notifications.markRead(n.id_notification).subscribe({ error: () => undefined });
      this.items.update((list) =>
        list.map((i) =>
          i.id_notification === n.id_notification ? { ...i, read_at: new Date().toISOString() } : i,
        ),
      );
    }
    const link = notificationLink(n);
    this.open.set(false);
    this.router.navigate(link.commands, link.queryParams ? { queryParams: link.queryParams } : {});
  }

  markAll(): void {
    this.notifications.markAllRead().subscribe({
      next: () => {
        const now = new Date().toISOString();
        this.items.update((list) => list.map((i) => ({ ...i, read_at: i.read_at ?? now })));
      },
      error: () => undefined,
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
