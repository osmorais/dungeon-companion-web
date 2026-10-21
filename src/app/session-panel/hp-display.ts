/** Barra de PV (sessão e aviso de troca de vez): porcentagem e cor, verde → amarelo → vermelho. */
export function hpPercent(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
}

export function hpColor(current: number, max: number): string {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(1, current / max));
  let r: number, g: number, b: number;
  if (pct >= 0.5) {
    // verde → amarelo (100% → 50%)
    const t = (pct - 0.5) / 0.5;
    r = Math.round(255 - (255 - 76) * t);
    g = Math.round(193 + (175 - 193) * t);
    b = Math.round(7 + (80 - 7) * t);
  } else {
    // amarelo → vermelho (50% → 0%)
    const t = pct / 0.5;
    r = Math.round(229 + (255 - 229) * t);
    g = Math.round(57 + (193 - 57) * t);
    b = Math.round(53 + (7 - 53) * t);
  }
  return `rgb(${r}, ${g}, ${b})`;
}
