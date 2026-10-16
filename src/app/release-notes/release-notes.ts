/**
 * Notas de versão do sistema (api + web), exibidas na página pública `/novidades`.
 *
 * Versão no formato A.B.C — ver `.claude/rules/versionamento.md`:
 * - A: mudança grande do sistema (só quando o usuário decidir);
 * - B: cada funcionalidade nova;
 * - C: cada correção de bug ou funcionalidade pequena.
 * Ao subir A, B e C voltam a 0; ao subir B, C volta a 0.
 *
 * Versões 0.x: histórico reconstruído a partir dos commits de 2026-09-04 a 2026-10-16 (antes
 * da numeração existir), agrupando cada entrega por funcionalidade (B) ou correções do dia (C).
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
        text: 'Página de Novidades com o histórico de versões do sistema.',
      },
    ],
  },
  {
    version: '0.34.1',
    date: '2026-10-16',
    title: 'Segurança e criação',
    changes: [
      { kind: 'correcao', text: 'Ajustes de segurança na entrada das sessões.' },
      {
        kind: 'correcao',
        text: 'Magias escolhidas na criação precisam ser da lista da classe, e as armas do equipamento inicial entram na ficha.',
      },
    ],
  },
  {
    version: '0.34.0',
    date: '2026-10-16',
    title: 'Equipamento inicial',
    changes: [
      {
        kind: 'novidade',
        text: 'O equipamento inicial da classe e do antecedente entra no inventário da sessão.',
      },
      {
        kind: 'correcao',
        text: 'A criação confere perícias, magias e armaduras permitidas, e o Meio-Elfo escolhe +1 em dois atributos.',
      },
    ],
  },
  {
    version: '0.33.0',
    date: '2026-10-16',
    title: 'Traços e habilidades com efeito automático',
    changes: [
      {
        kind: 'novidade',
        text: 'Habilidades de classe rolam e curam ao usar (como Retomar o Fôlego e Curar pelo Toque).',
      },
      {
        kind: 'novidade',
        text: 'Ataque Furtivo, Fúria, Golpe Divino e outros traços somam no ataque.',
      },
      {
        kind: 'novidade',
        text: 'Arma de Sopro, Resistência Implacável, Sortudo, Indomável e Inspiração Bárdica.',
      },
      { kind: 'novidade', text: 'Lembretes de vantagem e resistências do alvo ao aplicar dano.' },
    ],
  },
  {
    version: '0.32.0',
    date: '2026-10-16',
    title: 'Teste secreto',
    changes: [
      { kind: 'novidade', text: 'O mestre pede um teste e só ele e o jogador veem o resultado.' },
    ],
  },
  {
    version: '0.31.0',
    date: '2026-10-16',
    title: 'Magias com rolagem',
    changes: [
      {
        kind: 'novidade',
        text: 'Lançar uma magia abre a rolagem certa: ataque, dano com a resistência do alvo ou cura.',
      },
      {
        kind: 'novidade',
        text: 'Acerto crítico dobra os dados, e magias como Destruição e Marca do Caçador somam dano no acerto.',
      },
      {
        kind: 'novidade',
        text: 'Dano ou cura pode ser aplicado direto no alvo, se o jogador quiser.',
      },
      {
        kind: 'melhoria',
        text: 'Efeitos visuais nas magias e na cura, e explosão na entrada dos avisos da sessão.',
      },
    ],
  },
  {
    version: '0.30.3',
    date: '2026-10-16',
    title: 'Perícias do antecedente',
    changes: [
      {
        kind: 'correcao',
        text: 'As perícias do antecedente ficam treinadas na ficha (fichas antigas corrigidas) e aparecem como concedidas na criação.',
      },
    ],
  },
  {
    version: '0.30.2',
    date: '2026-10-15',
    title: 'Privacidade e visual',
    changes: [
      {
        kind: 'melhoria',
        text: 'A fonte do site passou a ser carregada pelo próprio site, e o login com Google só carrega quando é usado.',
      },
      { kind: 'melhoria', text: 'Aviso para preferir apelidos nos nomes visíveis à mesa.' },
      { kind: 'melhoria', text: 'Animação de impacto ao rolar dano e cursores em pixel art.' },
    ],
  },
  {
    version: '0.30.1',
    date: '2026-10-14',
    title: 'Segurança das contas',
    changes: [
      { kind: 'melhoria', text: 'Senha mínima de 8 caracteres e limite de tentativas de acesso.' },
      { kind: 'melhoria', text: 'Mensagens de erro mais claras no login e no cadastro.' },
      { kind: 'correcao', text: 'Atrasar o turno no combate funciona como esperado.' },
    ],
  },
  {
    version: '0.30.0',
    date: '2026-10-14',
    title: 'Privacidade e Minha Conta',
    changes: [
      {
        kind: 'novidade',
        text: 'Política de Privacidade e Termos de Uso, com aceite no cadastro.',
      },
      {
        kind: 'novidade',
        text: 'Página Minha Conta: editar o nome, baixar os seus dados e excluir a conta.',
      },
    ],
  },
  {
    version: '0.29.0',
    date: '2026-10-10',
    title: 'Entrar no combate em andamento',
    changes: [
      { kind: 'novidade', text: 'O mestre adiciona participantes a um combate que já começou.' },
    ],
  },
  {
    version: '0.28.1',
    date: '2026-09-26',
    title: 'Card do jogador',
    changes: [
      { kind: 'melhoria', text: 'Botões do card do jogador reorganizados.' },
      { kind: 'correcao', text: 'A ficha aberta pela sessão volta para a sessão.' },
    ],
  },
  {
    version: '0.28.0',
    date: '2026-09-26',
    title: 'Inventário e mercado',
    changes: [
      {
        kind: 'novidade',
        text: 'Inventário de itens por sessão e mercado com compra usando as peças de ouro do personagem.',
      },
    ],
  },
  {
    version: '0.27.1',
    date: '2026-09-20',
    title: 'Ajustes de classe e magia',
    changes: [
      { kind: 'correcao', text: 'Estilo de Luta do Paladino e do Patrulheiro aparece na ficha.' },
      {
        kind: 'melhoria',
        text: 'Controle manual dos espaços de magia e Canalizar Divindade do Paladino.',
      },
    ],
  },
  {
    version: '0.27.0',
    date: '2026-09-20',
    title: 'Duplicar monstros e iniciativa pelo jogador',
    changes: [
      {
        kind: 'novidade',
        text: 'O mestre duplica monstros e pode rolar a iniciativa por um jogador.',
      },
    ],
  },
  {
    version: '0.26.1',
    date: '2026-09-20',
    title: 'Ficha entre colegas de mesa',
    changes: [
      {
        kind: 'melhoria',
        text: 'Colegas de sessão podem ver a ficha e os atributos uns dos outros.',
      },
      { kind: 'correcao', text: 'Quadro de rolagens não fica mais cortado no celular.' },
    ],
  },
  {
    version: '0.26.0',
    date: '2026-09-20',
    title: 'Magias anunciadas na sessão',
    changes: [
      { kind: 'novidade', text: 'Lançar uma magia avisa toda a mesa.' },
      {
        kind: 'melhoria',
        text: 'Magias preparadas em destaque e lançamento direto pelo detalhe da magia.',
      },
    ],
  },
  {
    version: '0.25.0',
    date: '2026-09-19',
    title: 'Destruição Divina',
    changes: [{ kind: 'novidade', text: 'Destruição Divina do Paladino no fluxo de ataque.' }],
  },
  {
    version: '0.24.0',
    date: '2026-09-19',
    title: 'Preparar magias',
    changes: [
      {
        kind: 'novidade',
        text: 'Lembrete para preparar magias antes da luta; o preparo fica travado durante o combate.',
      },
    ],
  },
  {
    version: '0.23.0',
    date: '2026-09-19',
    title: 'Imagem do personagem',
    changes: [
      {
        kind: 'novidade',
        text: 'Envio de imagem do personagem, usada na ficha, no card da sessão e no aviso de rolagem.',
      },
    ],
  },
  {
    version: '0.22.0',
    date: '2026-09-18',
    title: 'Mais controle no combate',
    changes: [
      {
        kind: 'novidade',
        text: 'O mestre reordena a iniciativa, o jogador pode atrasar o turno, e jogadores têm pontos de vida temporários.',
      },
    ],
  },
  {
    version: '0.21.1',
    date: '2026-09-15',
    title: 'Tom na sessão',
    changes: [{ kind: 'melhoria', text: 'Tom reage aos acertos e erros de ataque na sessão.' }],
  },
  {
    version: '0.21.0',
    date: '2026-09-14',
    title: 'Habilidades de classe na sessão',
    changes: [
      {
        kind: 'novidade',
        text: 'Habilidades como Canalizar Divindade e Forma Selvagem podem ser usadas na sessão.',
      },
      {
        kind: 'melhoria',
        text: 'Magias reorganizadas nas ações da sessão e siglas de atributo em português.',
      },
    ],
  },
  {
    version: '0.20.1',
    date: '2026-09-13',
    title: 'Magias de Clérigo, Druida e Paladino',
    changes: [
      {
        kind: 'correcao',
        text: 'Clérigo, Druida e Paladino não precisam mais escolher magias com círculo na criação nem ao subir de nível.',
      },
    ],
  },
  {
    version: '0.20.0',
    date: '2026-09-13',
    title: 'Grimório de Magias',
    changes: [
      { kind: 'novidade', text: 'Grimório de Magias no menu do mestre, com busca por nome.' },
    ],
  },
  {
    version: '0.19.0',
    date: '2026-09-13',
    title: 'Editar monstros na sessão',
    changes: [
      {
        kind: 'novidade',
        text: 'O mestre edita nome, pontos de vida, Classe de Armadura e atributos de cada monstro na sessão.',
      },
    ],
  },
  {
    version: '0.18.2',
    date: '2026-09-13',
    title: 'Imagens maiores',
    changes: [{ kind: 'melhoria', text: 'Limite de envio de imagem passou de 5 MB para 10 MB.' }],
  },
  {
    version: '0.18.1',
    date: '2026-09-12',
    title: 'Talentos e perícias completos',
    changes: [
      {
        kind: 'melhoria',
        text: 'Catálogo completo de talentos do livro e descrição de todas as perícias.',
      },
    ],
  },
  {
    version: '0.18.0',
    date: '2026-09-12',
    title: 'Conheça o Tom',
    changes: [{ kind: 'novidade', text: 'Tom, o mascote, acompanha a criação de personagem.' }],
  },
  {
    version: '0.17.0',
    date: '2026-09-12',
    title: 'Riqueza inicial',
    changes: [
      {
        kind: 'novidade',
        text: 'Rolagem de riqueza inicial na criação, e dinheiro exibido e editável na ficha.',
      },
    ],
  },
  {
    version: '0.16.0',
    date: '2026-09-12',
    title: 'Recursos de classe',
    changes: [
      {
        kind: 'novidade',
        text: 'Painel de recursos de classe (como Fúria e Pontos de Chi) na ficha e na sessão, com contagem de usos.',
      },
    ],
  },
  {
    version: '0.15.2',
    date: '2026-09-12',
    title: 'Regras de classe e talentos',
    changes: [
      {
        kind: 'melhoria',
        text: 'Estilos de Luta, Aura de Proteção, Resiliência Dracônica e outros efeitos aplicados automaticamente; talentos Alerta e Observador.',
      },
      {
        kind: 'correcao',
        text: 'A iniciativa acompanha os aumentos de atributo e o talento Alerta.',
      },
      { kind: 'melhoria', text: 'Criação de personagem limitada ao nível 1 por enquanto.' },
    ],
  },
  {
    version: '0.15.1',
    date: '2026-09-12',
    title: 'XP para NPCs e talentos na ficha',
    changes: [
      { kind: 'melhoria', text: 'O mestre também distribui XP para NPCs.' },
      { kind: 'melhoria', text: 'Talentos escolhidos aparecem na ficha.' },
    ],
  },
  {
    version: '0.15.0',
    date: '2026-09-12',
    title: 'Habilidades de chi do Monge',
    changes: [
      { kind: 'novidade', text: 'Habilidades de chi do Monge usáveis na ficha e na sessão.' },
    ],
  },
  {
    version: '0.14.0',
    date: '2026-09-11',
    title: 'Mais escolhas na criação',
    changes: [
      {
        kind: 'novidade',
        text: 'Escolha de truque racial, ferramenta e estilo de combate na criação, com os bônus aplicados na ficha.',
      },
    ],
  },
  {
    version: '0.13.1',
    date: '2026-09-11',
    title: 'Correções de criação e combate',
    changes: [
      { kind: 'correcao', text: 'Rolar os atributos de novo limpa as escolhas anteriores.' },
      {
        kind: 'correcao',
        text: 'O aviso de experiência suficiente para subir de nível volta a aparecer.',
      },
      {
        kind: 'melhoria',
        text: 'Ao encerrar o combate, o sistema pergunta se os monstros foram derrotados.',
      },
    ],
  },
  {
    version: '0.13.0',
    date: '2026-09-10',
    title: 'Experiência e níveis',
    changes: [
      {
        kind: 'novidade',
        text: 'Sistema de experiência: o mestre distribui XP e o personagem sobe de nível ao alcançar o necessário.',
      },
    ],
  },
  {
    version: '0.12.0',
    date: '2026-09-10',
    title: 'Efeitos automáticos das características',
    changes: [
      {
        kind: 'novidade',
        text: 'Atributos, resistências, deslocamento, especialização e recursos de classe aplicados automaticamente na ficha.',
      },
    ],
  },
  {
    version: '0.11.1',
    date: '2026-09-10',
    title: 'Ajustes no subir de nível e na criação',
    changes: [
      {
        kind: 'melhoria',
        text: 'Magias por círculo com detalhes, e detalhes de cada subclasse antes de escolher.',
      },
      { kind: 'melhoria', text: 'Textos explicativos para cada escolha na criação de personagem.' },
    ],
  },
  {
    version: '0.11.0',
    date: '2026-09-10',
    title: 'Subir de nível',
    changes: [
      {
        kind: 'novidade',
        text: 'Subida de nível com escolha de subclasse, magias e melhorias da classe.',
      },
      { kind: 'melhoria', text: 'A Classe de Armadura acompanha as mudanças do personagem.' },
    ],
  },
  {
    version: '0.10.1',
    date: '2026-09-10',
    title: 'Quadro de monstros reorganizado',
    changes: [
      {
        kind: 'melhoria',
        text: 'Monstro em destaque, miniaturas no bestiário e dano ou cura em lote nos pontos de vida.',
      },
      {
        kind: 'melhoria',
        text: 'Edição de pontos de vida de jogadores, NPCs e monstros no mesmo formato.',
      },
    ],
  },
  {
    version: '0.10.0',
    date: '2026-09-09',
    title: 'Imagens e anúncios de monstros',
    changes: [
      {
        kind: 'novidade',
        text: 'O mestre envia uma imagem própria para cada monstro e pode trocá-la depois.',
      },
      {
        kind: 'novidade',
        text: 'Monstro revelado e monstro derrotado são anunciados para toda a mesa, com a imagem.',
      },
    ],
  },
  {
    version: '0.9.0',
    date: '2026-09-09',
    title: 'Rolagens ocultas do mestre',
    changes: [{ kind: 'novidade', text: 'O mestre rola dados escondidos dos jogadores.' }],
  },
  {
    version: '0.8.0',
    date: '2026-09-09',
    title: 'Dano depois do ataque',
    changes: [
      {
        kind: 'novidade',
        text: 'Depois de acertar o ataque, o modal segue direto para a rolagem de dano.',
      },
      {
        kind: 'novidade',
        text: 'A rolagem livre permite misturar dados (por exemplo, 3d6 + 1d12).',
      },
      { kind: 'melhoria', text: 'Aviso de rolagem com novo visual e dados ilustrados.' },
    ],
  },
  {
    version: '0.7.0',
    date: '2026-09-08',
    title: 'Remover e derrotar monstros',
    changes: [
      { kind: 'novidade', text: 'O mestre remove um monstro da sessão ou o marca como derrotado.' },
    ],
  },
  {
    version: '0.6.1',
    date: '2026-09-08',
    title: 'Sessão em tempo real mais estável',
    changes: [
      {
        kind: 'melhoria',
        text: 'A atualização em tempo real da sessão ficou mais rápida e estável.',
      },
    ],
  },
  {
    version: '0.6.0',
    date: '2026-09-07',
    title: 'Excluir personagem',
    changes: [
      { kind: 'novidade', text: 'Agora dá para excluir um personagem.' },
      { kind: 'correcao', text: 'Fundo dos modais corrigido.' },
    ],
  },
  {
    version: '0.5.0',
    date: '2026-09-07',
    title: 'Bestiário de monstros',
    changes: [
      {
        kind: 'novidade',
        text: 'Bestiário de monstros: o mestre adiciona monstros à sessão e os revela durante o combate.',
      },
      { kind: 'novidade', text: 'Pontos de vida de monstros e NPCs na sessão.' },
      { kind: 'novidade', text: 'O mestre encerra o turno do monstro no combate.' },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-09-05',
    title: 'O mestre cuida dos personagens da mesa',
    changes: [
      { kind: 'novidade', text: 'O mestre gerencia magias e descansos dos personagens da sessão.' },
      {
        kind: 'melhoria',
        text: 'Painel da sessão reorganizado em colunas, com aviso quando uma ação é bloqueada.',
      },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-09-05',
    title: 'Combate por turnos',
    changes: [
      {
        kind: 'novidade',
        text: 'Combate com iniciativa, ordem de turnos e atualização em tempo real para todos da mesa.',
      },
      { kind: 'correcao', text: 'Cada participante rola a iniciativa uma vez só.' },
    ],
  },
  {
    version: '0.2.1',
    date: '2026-09-05',
    title: 'Listas de sessões corrigidas',
    changes: [
      {
        kind: 'correcao',
        text: '"Minhas Aventuras" e "Sessões Criadas" mostram as sessões certas.',
      },
      { kind: 'melhoria', text: 'A tela da sessão não dá mais zoom com toque duplo no celular.' },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-09-05',
    title: 'Descanso curto',
    changes: [
      { kind: 'novidade', text: 'Descanso curto na ficha.' },
      { kind: 'correcao', text: 'O descanso longo recupera tudo o que deveria.' },
      { kind: 'melhoria', text: 'Perícias ordenadas e ajustes de layout.' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-09-05',
    title: 'Ações do jogador na sessão',
    changes: [
      {
        kind: 'novidade',
        text: 'O jogador rola testes, ataques e magias pela sessão, com histórico de rolagens compartilhado.',
      },
      { kind: 'novidade', text: 'Controle dos espaços de magia durante a sessão.' },
    ],
  },
  {
    version: '0.0.2',
    date: '2026-09-05',
    title: 'Ficha mais precisa e rolagem de atributos com dados',
    changes: [
      { kind: 'melhoria', text: 'A rolagem de atributos na criação ganhou dados animados.' },
      {
        kind: 'correcao',
        text: 'Correções no cálculo da Classe de Armadura, das proficiências e das armas com Acuidade.',
      },
    ],
  },
  {
    version: '0.0.1',
    date: '2026-09-04',
    title: 'Correções na criação de personagem',
    changes: [
      {
        kind: 'correcao',
        text: 'As magias conhecidas e a compra de pontos de atributo seguem as regras da classe.',
      },
      { kind: 'correcao', text: 'As magias da ficha aparecem agrupadas pelo círculo certo.' },
      {
        kind: 'correcao',
        text: 'No celular, as armas marcadas não somem mais ao trocar de página.',
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
