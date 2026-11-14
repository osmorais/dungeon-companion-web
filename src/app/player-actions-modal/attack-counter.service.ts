import { Injectable, signal } from '@angular/core';

/**
 * Ataques feitos por personagem na vez atual do combate (Ataque Extra): fecha e reabre a tela de
 * ações sem perder a conta ("ataque 2 de 2"). Só em memória: recarregar a página zera a vez.
 */
@Injectable({ providedIn: 'root' })
export class AttackCounterService {
  private counts = signal<Record<string, number>>({});

  private key(idCharacter: number, turnKey: string): string {
    return `${idCharacter}|${turnKey}`;
  }

  /** Ataques já feitos nesta vez. */
  used(idCharacter: number, turnKey: string): number {
    return this.counts()[this.key(idCharacter, turnKey)] ?? 0;
  }

  /** Mais um ataque feito nesta vez. Guarda só a vez atual de cada personagem. */
  record(idCharacter: number, turnKey: string): void {
    const key = this.key(idCharacter, turnKey);
    const prefix = `${idCharacter}|`;
    this.counts.update((counts) => {
      const next = Object.fromEntries(
        Object.entries(counts).filter(([k]) => !k.startsWith(prefix) || k === key),
      );
      next[key] = (next[key] ?? 0) + 1;
      return next;
    });
  }
}
