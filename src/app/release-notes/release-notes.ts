/**
 * Notas de versão do sistema (api + web), exibidas na página pública `/novidades`.
 *
 * Versão no formato A.B.C — ver `.claude/rules/versionamento.md`:
 * - A: mudança grande do sistema (só quando o usuário decidir);
 * - B: cada funcionalidade nova;
 * - C: cada correção de bug ou funcionalidade pequena.
 * Ao subir A, B e C voltam a 0; ao subir B, C volta a 0.
 *
 * A primeira entrada é a versão atual (`CURRENT_VERSION`), e o `version` do `package.json` tem
 * que ser igual a ela. A lista vai da mais nova pra mais antiga, cada versão a um passo da
 * anterior — conferido em `release-notes.spec.ts`. Texto pro jogador: sem termos técnicos, sem
 * detalhes que ajudem a explorar uma falha de segurança e sem dados de usuários.
 */

export type ReleaseChangeKind = 'novidade' | 'melhoria' | 'correcao';

export interface ReleaseChange {
  kind: ReleaseChangeKind;
  text: string;
}

export interface Release {
  version: string;
  /** Data da publicação, `AAAA-MM-DD`. */
  date: string;
  title: string;
  changes: ReleaseChange[];
}

export const RELEASES: Release[] = [
  {
    version: '1.0.0',
    date: '2026-10-16',
    title: 'Primeira versão numerada',
    changes: [
      {
        kind: 'novidade',
        text: 'Criação de personagem passo a passo: raça e sub-raça, classe e subclasse, antecedente, atributos (conjunto padrão, compra de pontos ou rolagem), perícias, magias, armas, armadura e dinheiro inicial.',
      },
      {
        kind: 'novidade',
        text: 'Ficha completa do personagem, com subida de nível, magias preparadas, recursos de classe, descansos e anotações.',
      },
      {
        kind: 'novidade',
        text: 'Sessões de jogo com mestre e jogadores: combate com iniciativa, monstros revelados aos poucos, pontos de vida, experiência e inventário da sessão.',
      },
      {
        kind: 'novidade',
        text: 'Rolagens de dados na sessão: ataques com arma e magia, testes, resistências, cura e aplicação de dano ou cura no alvo.',
      },
      {
        kind: 'novidade',
        text: 'Traços e habilidades com efeito automático, como Fúria, Ataque Furtivo, Inspiração Bárdica, Indomável e Sortudo.',
      },
      {
        kind: 'novidade',
        text: 'Teste secreto: o mestre pede uma rolagem e só ele e o jogador veem o resultado.',
      },
      {
        kind: 'melhoria',
        text: 'Efeitos visuais nas magias, na cura e na entrada dos avisos da sessão.',
      },
      {
        kind: 'melhoria',
        text: 'Equipamento inicial da classe e do antecedente entra no inventário da sessão, e as armas do kit entram na ficha.',
      },
      {
        kind: 'correcao',
        text: 'A criação de personagem passou a conferir perícias, magias e armaduras permitidas, e o Meio-Elfo recebe o aumento em dois atributos à escolha.',
      },
      {
        kind: 'correcao',
        text: 'Ajustes de segurança na entrada das sessões.',
      },
    ],
  },
];

export const CURRENT_VERSION = RELEASES[0].version;

export const RELEASE_CHANGE_LABELS: Record<ReleaseChangeKind, string> = {
  novidade: 'NOVIDADE',
  melhoria: 'MELHORIA',
  correcao: 'CORREÇÃO',
};

/** `[A, B, C]` ou `null` se não estiver no formato A.B.C (números sem zero à esquerda). */
export function parseVersion(version: string): [number, number, number] | null {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** Qual parte subiu de `previous` pra `next` — `null` se não for exatamente um passo da regra. */
export function versionBump(previous: string, next: string): 'A' | 'B' | 'C' | null {
  const a = parseVersion(previous);
  const b = parseVersion(next);
  if (!a || !b) return null;
  if (b[0] === a[0] + 1 && b[1] === 0 && b[2] === 0) return 'A';
  if (b[0] === a[0] && b[1] === a[1] + 1 && b[2] === 0) return 'B';
  if (b[0] === a[0] && b[1] === a[1] && b[2] === a[2] + 1) return 'C';
  return null;
}

/** `AAAA-MM-DD` → "16 de outubro de 2026" (sem depender do fuso de quem lê). */
export function formatReleaseDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}
