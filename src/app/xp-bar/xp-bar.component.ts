import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FRAME_BAR_MIN_FILL } from '../hp-bar/hp-bar.component';

/** Progresso até o próximo nível: 0–100 (cheio no nível 20 ou quando já dá pra subir). */
export function xpBarPercent(xp: number, nextLevelXp: number | null | undefined): number {
  if (!nextLevelXp || nextLevelXp <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((xp / nextLevelXp) * 100)));
}

/**
 * Barra de XP do card do personagem na sessão (1.7.2): o nível num selo à esquerda e o caminho
 * até o próximo nível. Com XP suficiente pra subir, a barra brilha em dourado.
 */
@Component({
  selector: 'app-xp-bar',
  standalone: true,
  templateUrl: './xp-bar.component.html',
  styleUrls: ['./xp-bar.component.scss'],
})
export class XpBarComponent {
  @Input({ required: true }) level = 1;
  @Input({ required: true }) xp = 0;
  /** XP total do próximo nível; `null` no nível 20 (ou API antiga, sem o campo). */
  @Input() nextLevelXp: number | null | undefined = null;
  /** Quem vê é o dono do personagem: com XP pra subir, a barra vira botão (abre a subida de nível). */
  @Input() canOpenLevelUp = false;
  @Output() levelUp = new EventEmitter<void>();

  get clickable(): boolean {
    return this.canOpenLevelUp && this.canLevelUp;
  }

  open(): void {
    if (this.clickable) this.levelUp.emit();
  }

  get maxed(): boolean {
    return !this.nextLevelXp;
  }

  get canLevelUp(): boolean {
    return !!this.nextLevelXp && this.xp >= this.nextLevelXp;
  }

  get percent(): number {
    return xpBarPercent(this.xp, this.nextLevelXp);
  }

  /** Largura desenhada: um mínimo visível quando há algum XP (o começo do trilho fica sob a
   *  moldura). */
  get fillPercent(): number {
    if (this.xp <= 0) return 0;
    return Math.max(FRAME_BAR_MIN_FILL, this.percent);
  }

  /** Medalhão na cor da barra: dourado pra subir, azul com XP, apagado com 0. */
  get medalState(): 'ready' | 'xp' | 'empty' {
    if (this.canLevelUp) return 'ready';
    return this.xp > 0 ? 'xp' : 'empty';
  }

  get label(): string {
    // Sem a informação do próximo nível (API antiga): só o nível, sem texto enganoso.
    if (this.nextLevelXp === undefined) return '';
    if (this.canLevelUp) return 'SUBIR DE NÍVEL!';
    if (this.maxed) return `${this.xp} XP`;
    return `${this.xp}/${this.nextLevelXp} XP`;
  }
}
