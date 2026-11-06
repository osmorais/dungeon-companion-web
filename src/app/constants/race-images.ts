/**
 * Arte de cada raça na criação de ficha: src/assets/races/race-<id>.webp, gerada por
 * design/races/process.py a partir dos originais em ~/projects/docs/dungeon-companion/artes/races/.
 * id_race: 1=Anão 2=Elfo 3=Halfling 4=Draconato 5=Gnomo 6=Meio-Elfo 7=Meio-Orc 8=Tiefling 9=Humano.
 * O Humano (9) ainda não tem arte: a tela mostra a inicial do nome no lugar.
 */
const RACE_IDS_WITH_ART = new Set([1, 2, 3, 4, 5, 6, 7, 8]);

export function raceImage(idRace: number | string | null | undefined): string | null {
  const id = Number(idRace);
  return RACE_IDS_WITH_ART.has(id) ? `assets/races/race-${id}.webp` : null;
}
