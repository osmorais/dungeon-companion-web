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
    version: '1.7.3',
    date: '2026-10-22',
    title: 'Dano e cura no próprio PV com animação, CURA TOTAL e DANO TOTAL',
    changes: [
      {
        kind: 'melhoria',
        text: 'Aplicar DANO ou CURA no próprio personagem pela gaveta de ações agora toca a animação em tela cheia (golpe no dano, névoa verde na cura) e fecha a gaveta.',
      },
      {
        kind: 'novidade',
        text: 'Novos botões CURA TOTAL (enche a vida até o máximo) e DANO TOTAL (zera a vida, PV temporários incluídos).',
      },
    ],
  },
  {
    version: '1.7.2',
    date: '2026-10-22',
    title: 'Lançamento sincronizado para toda a mesa, rolagem dentro do aviso e animações',
    changes: [
      {
        kind: 'melhoria',
        text: 'O aviso do lançamento agora aparece ao mesmo tempo para todos — mestre, jogadores e quem está agindo — e os dados de cada rolagem são revelados no mesmo instante para todo mundo. Se quem lança desistir antes de rolar, o aviso some para a mesa.',
      },
      {
        kind: 'melhoria',
        text: 'Quem lança uma magia ou ataca agora decide tudo (vantagem, rolar, acertou?, dano, aplicar) num painel só, logo abaixo do aviso do lançamento, sem repetir o título nem os dados — eles já aparecem no aviso. A mesa continua vendo o mesmo aviso de antes.',
      },
      {
        kind: 'melhoria',
        text: 'Os títulos dos avisos da mesa (rolagem, monstro derrotado e monstro revelado) trocaram o vermelho escuro pelo dourado do tema.',
      },
      {
        kind: 'novidade',
        text: 'Errou o ataque? Depois do carimbo ERROU, o aviso do lançamento trinca, se estilhaça em cacos e some, para quem ataca e para a mesa.',
      },
      {
        kind: 'novidade',
        text: 'Ao concluir o dano (ou a cura) de um lançamento, um corte dourado atravessa o painel (na cura, uma onda verde), faíscas sobem e ele se recolhe — para quem lança e, logo depois, no aviso da mesa. Ao selecionar todos os alvos, o botão TODOS vira NENHUM.',
      },
      {
        kind: 'correcao',
        text: 'No aviso do lançamento, o d20 descartado pela vantagem ou desvantagem agora aparece cortado, como no aviso de rolagem.',
      },
    ],
  },
  {
    version: '1.7.1',
    date: '2026-10-22',
    title: 'Barra de XP, dano e cura na gaveta de ações e ranking em lista',
    changes: [
      {
        kind: 'melhoria',
        text: 'Os cards dos personagens na sessão ganharam molduras novas nos dois temas: anel em volta do avatar, barra de vida e uma barra de XP até o próximo nível (no lugar da linha de nível), com o nível no medalhão. Quando dá para subir de nível, a barra brilha em dourado.',
      },
      {
        kind: 'melhoria',
        text: 'DANO e CURA no próprio personagem agora ficam na gaveta AÇÕES DE PERSONAGEM, ao lado dos PV. O mestre continua aplicando pelos cards.',
      },
      {
        kind: 'melhoria',
        text: 'O ranking agora é uma lista do 1º ao 10º, com os três primeiros destacados em ouro, prata e bronze.',
      },
      {
        kind: 'melhoria',
        text: 'Ao aplicar o dano ou a cura de uma magia ou ataque, o resultado ("APLICOU 8 de dano em Goblin") aparece no próprio aviso do lançamento, em vez de um aviso separado por cima.',
      },
    ],
  },
  {
    version: '1.7.0',
    date: '2026-10-22',
    title: 'Ranking dos maiores feitos das mesas',
    changes: [
      {
        kind: 'novidade',
        text: 'Novo botão RANKING na tela inicial: os maiores feitos de todas as mesas, com avatar e nome do personagem, nome de jogador e nome da sessão. Categorias: dano causado, maior golpe, monstros derrubados, dano sofrido, cura, 20 naturais, 1 naturais, maior média no d20, quedas a 0 PV, magias lançadas, rolagens e XP ganho.',
      },
      {
        kind: 'novidade',
        text: 'A contagem começa nesta versão: dano, cura, rolagens, magias e XP passam a ser somados enquanto você joga.',
      },
      {
        kind: 'melhoria',
        text: 'Em Minha Conta dá para sair do ranking. A Política de Privacidade foi atualizada para explicar o que aparece no ranking.',
      },
    ],
  },
  {
    version: '1.6.10',
    date: '2026-10-22',
    title: 'Tons de pele de verdade e cores de cada raça',
    changes: [
      {
        kind: 'correcao',
        text: 'A cor de pele do avatar agora muda só a pele: antes ela escurecia o desenho inteiro, inclusive o branco dos olhos. Os tons escuros ficaram com aparência natural.',
      },
      {
        kind: 'novidade',
        text: 'Cada raça ganhou tons de pele da sua lore: elfos lunares e drow, anões e gnomos cinza-pedra, meio-orcs verde e cinza, tieflings vermelho, carmesim, roxo e azul, e draconatos com as cores das dez linhagens de dragão.',
      },
    ],
  },
  {
    version: '1.6.9',
    date: '2026-10-22',
    title: 'Avatar em abas com miniaturas e 8 penteados novos',
    changes: [
      {
        kind: 'melhoria',
        text: 'A personalização do avatar agora é separada em abas (corpo, cabelo, barba, roupa e rosto), cada uma com miniaturas do seu personagem mostrando como fica cada opção. A escolhida ganha um ✓, e a roupa deixou de ser uma lista de seleção.',
      },
      {
        kind: 'novidade',
        text: '8 penteados novos para o avatar, nas quatro cores de cabelo: topete, moicano, calvo, cacheado, longo, rabo de cavalo, trança e coque.',
      },
    ],
  },
  {
    version: '1.6.8',
    date: '2026-10-22',
    title: 'Criação no celular em painéis e controle do Tom',
    changes: [
      {
        kind: 'melhoria',
        text: 'No celular, cada parte da criação de personagem fica num painel, com o título no topo e os campos no visual do resto do site.',
      },
      {
        kind: 'melhoria',
        text: 'O balão do Tom ganhou o botão OK, que fecha a conversa até a próxima fala, e a opção DESATIVAR AJUDA, que desliga o Tom no site todo. Ele volta pelo botão TOM, no topo da página.',
      },
      {
        kind: 'melhoria',
        text: 'A Política de Privacidade passou a citar a preferência da ajuda do Tom, guardada só no seu navegador.',
      },
    ],
  },
  {
    version: '1.6.7',
    date: '2026-10-22',
    title: 'Criação de personagem com barra de progresso e cartas',
    changes: [
      {
        kind: 'melhoria',
        text: 'A criação de personagem ganhou uma barra de progresso, que mostra em que passo você está, quantos faltam e quais já foram. Para quem não usa magia, essa etapa aparece riscada.',
      },
      {
        kind: 'melhoria',
        text: 'As etapas de magias e de armas mostram as cartas, com o botão ESCOLHER embaixo. Tocar numa carta abre a carta em tela cheia. As armas do equipamento inicial aparecem marcadas como KIT.',
      },
      {
        kind: 'melhoria',
        text: 'A criação de personagem seguiu o visual do resto do site: no celular, cabeçalho com voltar e seções sem quadros; no computador, o mesmo topo das outras páginas. Sair no meio pede confirmação.',
      },
    ],
  },
  {
    version: '1.6.6',
    date: '2026-10-22',
    title: 'Quadro do Mestre reorganizado e grimório completo',
    changes: [
      {
        kind: 'melhoria',
        text: 'O Quadro do Mestre mostra primeiro o que mais se usa durante o jogo: combate, dados e magias, grupo, dano ou cura em área, cena e rolagens ocultas. Anotações, descanso, mesa, recompensas e sessão ficam depois.',
      },
      {
        kind: 'melhoria',
        text: 'O mestre tem um GRIMÓRIO no quadro com todas as magias, em cartas, com busca pelo nome. Tocar numa carta mostra a magia em tela cheia, e fechar volta para o quadro.',
      },
    ],
  },
  {
    version: '1.6.5',
    date: '2026-10-22',
    title: 'Armas e magias como baralho e mão',
    changes: [
      {
        kind: 'melhoria',
        text: 'Nas ações do personagem, as armas e as magias prontas viraram baralhos. Tocar num baralho abre a sua mão em tela cheia, como num jogo de cartas: a carta da vez grande no centro, as outras dos lados e todas em leque embaixo.',
      },
      {
        kind: 'melhoria',
        text: 'Na mão, dá para passar as cartas com as setas, arrastando para o lado ou tocando nelas, e atacar ou lançar direto da carta da vez. Tocar fora das cartas e dos botões fecha a mão. Os botões ATACAR e LANÇAR ficaram grandes, com relevo e brilho.',
      },
    ],
  },
  {
    version: '1.6.4',
    date: '2026-10-22',
    title: 'Sessão no celular sem o Tom',
    changes: [
      {
        kind: 'melhoria',
        text: 'No celular, o Tom não aparece mais na sessão, deixando a tela livre. No computador ele continua comentando o jogo.',
      },
    ],
  },
  {
    version: '1.6.3',
    date: '2026-10-22',
    title: 'Verso da carta aparecendo no aviso',
    changes: [
      {
        kind: 'correcao',
        text: 'No aviso de magia ou de ataque, a carta agora mostra de verdade o verso enquanto cai virada para baixo, antes de virar. A frente aparecia por cima o tempo todo.',
      },
    ],
  },
  {
    version: '1.6.2',
    date: '2026-10-22',
    title: 'Cartas viradas e rolagens com mais impacto',
    changes: [
      {
        kind: 'melhoria',
        text: 'No aviso de magia ou de ataque, a carta cai na mesa virada para baixo, mostra o verso por um instante e só então vira.',
      },
      {
        kind: 'melhoria',
        text: 'Os resultados aparecem depois que a carta vira: os dados rolam, o total grande bate na tela com um clarão, o dano faz o aviso tremer e ACERTOU, ERROU ou CRÍTICO! aparecem como um carimbo. O impacto de dano em tela cheia toca junto com o número.',
      },
    ],
  },
  {
    version: '1.6.1',
    date: '2026-10-22',
    title: 'Ataque com arma no aviso da mesa',
    changes: [
      {
        kind: 'melhoria',
        text: 'O ataque com arma agora aparece para a mesa como o lançamento de magia: um aviso só, com o card do personagem, a carta da arma jogada na mesa, o ataque e depois o dano.',
      },
      {
        kind: 'melhoria',
        text: 'Quem ataca vê o mesmo aviso em cima das próprias decisões: acertou ou errou, rolar o dano e aplicar no alvo.',
      },
    ],
  },
  {
    version: '1.6.0',
    date: '2026-10-22',
    title: 'Armas em cartas',
    changes: [
      {
        kind: 'novidade',
        text: 'As armas também viraram cartas, cada uma com a própria ilustração, o bônus de ataque no medalhão, a categoria (simples ou marcial, corpo a corpo ou à distância) e o dano, o tipo e as propriedades no pergaminho.',
      },
      {
        kind: 'novidade',
        text: 'Nas ações da sessão e na ficha, as armas aparecem como cartas com o botão ATACAR. Tocar na carta abre a arma em tela cheia, no lugar da antiga janela de detalhes.',
      },
      {
        kind: 'melhoria',
        text: 'O fundo da ilustração da arma muda de cor conforme o tipo de dano: cortante, perfurante ou concussão.',
      },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-10-22',
    title: 'Lançamento de magia com as cartas',
    changes: [
      {
        kind: 'novidade',
        text: 'Ao lançar uma magia, a mesa vê um aviso só, com o card do personagem e a carta da magia sendo jogada e virada, como numa mesa de verdade.',
      },
      {
        kind: 'novidade',
        text: 'As rolagens entram no mesmo aviso: primeiro o ataque, que espera quem lança decidir se acertou, e depois o dano. Magias de resistência mostram a CD, e magias sem dados aparecem direto.',
      },
      {
        kind: 'melhoria',
        text: 'Quem lança vê o mesmo que a mesa e, logo abaixo, as próprias decisões: rolar o dano, escolher se acertou e aplicar no alvo.',
      },
      {
        kind: 'melhoria',
        text: 'O aviso some alguns segundos depois que quem lança termina, e também pode ser fechado.',
      },
      {
        kind: 'correcao',
        text: 'Na carta em tela cheia, a duração e os outros dados longos da magia não aparecem mais cortados.',
      },
      {
        kind: 'melhoria',
        text: 'Na carta em tela cheia, o botão LER TUDO expande a descrição da magia por cima da ilustração, e RECOLHER volta ao normal.',
      },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-10-21',
    title: 'Magias em cartas',
    changes: [
      {
        kind: 'novidade',
        text: 'As magias viraram cartas, com moldura no estilo do tema, ilustração da escola de magia, círculo no medalhão e os dados principais no pergaminho.',
      },
      {
        kind: 'novidade',
        text: 'Tocar numa magia abre a carta em tela cheia, com a descrição completa e, quando dá, os botões de lançar e preparar. Ela substitui a janela de detalhes no grimório da sessão, no Grimório de Magias e na ficha.',
      },
      {
        kind: 'melhoria',
        text: 'No grimório da sessão dá para alternar entre CARTAS e LISTA. A ficha e o Grimório de Magias mostram as magias em grade de cartas.',
      },
    ],
  },
  {
    version: '1.3.19',
    date: '2026-10-21',
    title: 'Barra das gavetas sem a alça',
    changes: [
      {
        kind: 'melhoria',
        text: 'A barra das gavetas da sessão (Quadro do Mestre e Ações de personagem) perdeu a alça de puxar que ficava em cima dela, no celular e no computador.',
      },
    ],
  },
  {
    version: '1.3.18',
    date: '2026-10-21',
    title: 'Ações reorganizadas, grimório próprio e tema/sair no topo',
    changes: [
      {
        kind: 'melhoria',
        text: 'Os botões de tema e de sair saíram do rodapé e foram para o topo de todas as telas, no celular e no computador, rolando junto com a página. Assim a base da tela fica livre para as gavetas da sessão.',
      },
      {
        kind: 'melhoria',
        text: 'A barra AÇÕES DE PERSONAGEM agora abre direto as ações, sem o passo intermediário. No topo ficam em destaque PV, CA, CD e ataque de magia, dados de vida e os botões principais: finalizar ou atrasar o turno, rolar dado, ficha e itens.',
      },
      {
        kind: 'melhoria',
        text: 'As ações ficam organizadas em combate, magias e testes e descanso. No computador cada grupo tem a sua coluna fixa, então abrir um círculo de magia ou uma habilidade não tira mais as outras informações do lugar.',
      },
      {
        kind: 'melhoria',
        text: 'As magias ganharam um GRIMÓRIO próprio, aberto pelas ações: abas por círculo (e as prontas para lançar), cards maiores com os dados de cada magia, botão para lançar e botão para preparar.',
      },
      {
        kind: 'melhoria',
        text: 'Dá para voltar às ações a partir do grimório, da rolagem de dados e da ficha aberta pelas ações.',
      },
    ],
  },
  {
    version: '1.3.17',
    date: '2026-10-21',
    title: 'Gavetas na sessão também no computador',
    changes: [
      {
        kind: 'melhoria',
        text: 'No computador, o Quadro do Mestre e as Ações de personagem também abrem por uma barra na base da tela, numa gaveta da largura dos quadros da sessão.',
      },
      {
        kind: 'melhoria',
        text: 'As ações do personagem e o inventário agora abrem como gaveta, no celular e no computador.',
      },
      {
        kind: 'melhoria',
        text: 'A barra das gavetas ganhou um puxador, uma seta que se mexe e o aviso "toque para abrir", para ficar claro que dá para abrir.',
      },
    ],
  },
  {
    version: '1.3.16',
    date: '2026-10-21',
    title: 'Sessão no celular com gavetas na base da tela',
    changes: [
      {
        kind: 'melhoria',
        text: 'No celular, o Quadro do Mestre abre por um botão largo na base da tela, que fica sempre à vista enquanto a página rola.',
      },
      {
        kind: 'melhoria',
        text: 'No celular, o jogador tem a gaveta AÇÕES DE PERSONAGEM na base da tela, com ações, finalizar ou atrasar o turno, ficha e itens do seu personagem.',
      },
      {
        kind: 'melhoria',
        text: 'Na sessão pelo celular, os botões de tema e de sair ficam no topo da página e rolam junto com ela, liberando espaço na tela.',
      },
      {
        kind: 'melhoria',
        text: 'Na sessão pelo celular, os quadros vazios (combate, NPCs, monstros, rolagens) não aparecem mais, e as rolagens começam recolhidas: toque no título para abrir.',
      },
    ],
  },
  {
    version: '1.3.15',
    date: '2026-10-21',
    title: 'Dinheiro em destaque na ficha',
    changes: [
      {
        kind: 'melhoria',
        text: 'O dinheiro do personagem saiu da parte de armas e foi para o card do personagem, junto dos pontos de vida e da experiência: fica sempre à vista e dá pra editar ali mesmo.',
      },
    ],
  },
  {
    version: '1.3.14',
    date: '2026-10-21',
    title: 'Ficha de personagem com a cara do resto do site',
    changes: [
      {
        kind: 'melhoria',
        text: 'No celular, a ficha de personagem ganhou o mesmo visual das outras telas: cabeçalho com voltar, card do personagem com moldura e imagem de fundo, abas em botões e as informações em cards.',
      },
      {
        kind: 'melhoria',
        text: 'No celular, basta tocar numa perícia para rolar o teste, e as resistências em que o personagem é proficiente aparecem destacadas em dourado.',
      },
      {
        kind: 'melhoria',
        text: 'No computador, a ficha usa o mesmo topo das outras páginas, com o nome do personagem em destaque, e um card com moldura reúne retrato, pontos de vida, CA, iniciativa, movimento, bônus de proficiência, percepção passiva e experiência. Rolar dado e imprimir ficam no alto, e clicar numa perícia já rola o teste.',
      },
      {
        kind: 'melhoria',
        text: 'Na lista de magias da ficha, os truques e cada círculo começam fechados: abra só o que quiser ver.',
      },
    ],
  },
  {
    version: '1.3.13',
    date: '2026-10-21',
    title: 'Avisos com moldura e troca de vez com o card inteiro',
    changes: [
      {
        kind: 'melhoria',
        text: 'Os avisos em tela cheia da sessão (resultado de rolagem, magia lançada, monstro revelado ou derrotado, subir de nível) ganharam moldura em pixel art, uma para cada tema.',
      },
      {
        kind: 'melhoria',
        text: 'O aviso de troca de vez mostra o card inteiro de quem joga, como na tela da sessão: imagem, avatar, jogador, classe, nível e vida. Monstros aparecem com a imagem deles.',
      },
    ],
  },
  {
    version: '1.3.12',
    date: '2026-10-21',
    title: 'Tom sem spoiler',
    changes: [
      {
        kind: 'correcao',
        text: 'Na sessão, o Tom só comenta uma rolagem quando ela aparece na tela — antes, com várias rolagens seguidas, ele reagia antes do resultado ser mostrado.',
      },
    ],
  },
  {
    version: '1.3.11',
    date: '2026-10-21',
    title: 'Aventureiros que se ajustam à altura da tela',
    changes: [
      {
        kind: 'melhoria',
        text: 'No computador, os cards dos aventureiros na sessão ocupam a altura do quadro e se ajustam ao monitor (maiores em telas altas, mais compactos nas menores). Em telas Full HD, até seis personagens cabem sem precisar rolar.',
      },
      {
        kind: 'melhoria',
        text: 'Os cards dos personagens (na sessão e na lista de personagens) ganharam moldura em pixel art: madeira, dourado e gemas no tema Fantasia; ferro escuro e caveiras no tema Sombrio.',
      },
      {
        kind: 'correcao',
        text: 'Quando o mestre inicia a luta, escolher as magias preparadas agora funciona de verdade: dá para preparar e trocar magias até rolar a iniciativa, o limite é respeitado e, se algo for recusado, a marcação volta e aparece o motivo.',
      },
    ],
  },
  {
    version: '1.3.10',
    date: '2026-10-21',
    title: 'Menu inicial cabendo na tela',
    changes: [
      {
        kind: 'melhoria',
        text: 'O menu inicial perdeu o título "Bem-vindo, aventureiro" e agora cabe inteiro na tela, centralizado, sem precisar rolar: a logo se ajusta à altura da tela e os cards ficaram mais compactos.',
      },
    ],
  },
  {
    version: '1.3.9',
    date: '2026-10-21',
    title: 'Menu inicial numa tela só',
    changes: [
      {
        kind: 'melhoria',
        text: 'O menu inicial ficou numa tela só: ao escolher SOU JOGADOR ou SOU MESTRE, as opções abrem ao lado (no celular, logo abaixo), sem precisar voltar para trocar. O Grimório de Magias saiu das opções do mestre e fica sempre à mão, para jogadores e mestres.',
      },
    ],
  },
  {
    version: '1.3.8',
    date: '2026-10-21',
    title: 'Destaque nos cards de personagem',
    changes: [
      {
        kind: 'correcao',
        text: 'Na lista de personagens, o contorno do card volta a ficar dourado ao passar o mouse, inclusive nos personagens com imagem de fundo.',
      },
    ],
  },
  {
    version: '1.3.7',
    date: '2026-10-21',
    title: 'Listagens maiores e mais completas',
    changes: [
      {
        kind: 'melhoria',
        text: 'No computador, as listas de personagens, aventuras, sessões, monstros e magias ficaram do tamanho da tela da sessão, com o mesmo topo e os itens em cards lado a lado.',
      },
      {
        kind: 'melhoria',
        text: 'A lista de personagens mostra o avatar, a imagem de fundo, vida, CA, iniciativa, percepção passiva, os seis atributos e a barra de experiência (com aviso quando dá para subir de nível). No celular, o card do personagem mostra o avatar.',
      },
      {
        kind: 'melhoria',
        text: 'O grimório de magias mostra também o tempo de conjuração e o alcance em cada carta.',
      },
      {
        kind: 'correcao',
        text: 'Saiu a linha clara em volta das opções do menu inicial, do login e da criação de personagem no celular.',
      },
    ],
  },
  {
    version: '1.3.6',
    date: '2026-10-21',
    title: 'Formulários do celular no mesmo visual',
    changes: [
      {
        kind: 'melhoria',
        text: 'No celular, criar sessão, entrar numa aventura e catalogar monstro seguem o visual do menu inicial: sem quadros, com títulos de seção, campos e escolhas no formato dos cards (a escolha fica destacada com um ✓) e o botão de confirmar largo no fim.',
      },
    ],
  },
  {
    version: '1.3.5',
    date: '2026-10-21',
    title: 'Celular com o mesmo visual em todas as telas',
    changes: [
      {
        kind: 'melhoria',
        text: 'No celular, as listas de personagens, aventuras, sessões, monstros e magias (e a escolha de personagem ao entrar numa aventura) agora usam os mesmos cards do menu inicial, com ícone, nome em destaque e detalhes. O cabeçalho com o botão de voltar ficou igual em todas as telas.',
      },
    ],
  },
  {
    version: '1.3.4',
    date: '2026-10-21',
    title: 'Monstro revelado entra na luta',
    changes: [
      {
        kind: 'correcao',
        text: 'Com um combate em andamento, revelar um monstro agora coloca ele na luta, com a iniciativa rolada e no fim da ordem de turnos — igual ao botão ADICIONAR do combate.',
      },
    ],
  },
  {
    version: '1.3.3',
    date: '2026-10-21',
    title: 'Ícones em pixel art',
    changes: [
      {
        kind: 'melhoria',
        text: 'Os emojis do site deram lugar a ícones em pixel art no mesmo estilo do resto do visual: menu inicial, sessão, Quadro do Mestre, ficha, testes e descansos. Os ícones dos botões AÇÕES, FICHA e ITENS também foram refeitos.',
      },
    ],
  },
  {
    version: '1.3.2',
    date: '2026-10-21',
    title: 'Topo da sessão mais limpo',
    changes: [
      {
        kind: 'melhoria',
        text: 'Na sessão, o nome da aventura, o mestre, o código e o número de jogadores ficam no topo da página, sem quadro em volta. Os botões de polling, efeitos e atualizar saíram da tela (o mestre continua com polling e efeitos no Quadro do Mestre).',
      },
      {
        kind: 'correcao',
        text: 'Os cards dos aventureiros na sessão agora têm todos o mesmo tamanho, inclusive na linha do seu personagem.',
      },
      {
        kind: 'melhoria',
        text: 'No computador, a sessão cabe numa tela só, sem rolar a página: os quadros de combate, aventureiros e rolagens ficam alinhados de cima a baixo e, se faltar espaço, rolam por dentro. O botão VOLTAR foi para o topo, ao lado do nome da aventura.',
      },
      {
        kind: 'melhoria',
        text: 'As barras de rolagem do site agora seguem o visual do tema: finas, quadradas e nas cores dos quadros.',
      },
    ],
  },
  {
    version: '1.3.1',
    date: '2026-10-20',
    title: 'Carregamento sem tela de espera',
    changes: [
      {
        kind: 'melhoria',
        text: 'A tela de espera com o dragão saiu do site todo: enquanto algo carrega, cada página mostra blocos no formato do conteúdo (listas, ficha, catálogos, conta) e um dragão atravessa a tela voando (no tema Sombrio, um dragão morto-vivo), sem impedir que você continue usando o site.',
      },
      {
        kind: 'melhoria',
        text: 'Os botões de criar sessão, entrar em sessão, criar personagem e salvar personagem ficam travados (com "SALVANDO..." / "ENTRANDO...") enquanto esperam a resposta, para não enviar duas vezes.',
      },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-10-20',
    title: 'Tema Sombrio',
    changes: [
      {
        kind: 'novidade',
        text: 'Agora dá para trocar as cores do site no botão TEMA, no rodapé: FANTASIA é o visual de sempre e SOMBRIO é uma versão mais escura e sóbria, em marrons e dourado, com as artes de fundo levemente escurecidas e puxadas para o sépia. A escolha fica salva no seu navegador.',
      },
      {
        kind: 'melhoria',
        text: 'A ficha de personagem, a criação de personagem e a escolha de avatar passam a seguir o tema escolhido.',
      },
      {
        kind: 'melhoria',
        text: 'A Política de Privacidade passa a citar a preferência de tema, guardada só no seu navegador.',
      },
    ],
  },
  {
    version: '1.2.3',
    date: '2026-10-20',
    title: 'Carregamento mais suave na sessão',
    changes: [
      {
        kind: 'melhoria',
        text: 'Dentro da sessão, a tela de carregamento com o dragão deu lugar a blocos no formato do conteúdo que está chegando (cards, listas, ficha), e o resto da mesa continua visível enquanto isso. Vale para a abertura da sessão, ações e ficha do personagem, inventário, imagens de referência, monstros e o Quadro do Mestre.',
      },
    ],
  },
  {
    version: '1.2.2',
    date: '2026-10-20',
    title: 'Quadro do Mestre com aba também no celular',
    changes: [
      {
        kind: 'melhoria',
        text: 'No celular, o Quadro do Mestre agora funciona como no computador: abre pela lateral esquerda numa aba sempre visível na borda da tela, que expande e recolhe o quadro.',
      },
    ],
  },
  {
    version: '1.2.1',
    date: '2026-10-20',
    title: 'Quadro do Mestre mais fácil de achar',
    changes: [
      {
        kind: 'melhoria',
        text: 'No celular, o botão do Quadro do Mestre saiu da barra do topo e agora fica no quadro da aventura, ocupando a largura toda.',
      },
      {
        kind: 'melhoria',
        text: 'No computador, o Quadro do Mestre abre pela lateral esquerda e fica sempre à mão numa aba presa na borda da tela: clique na aba para expandir e de novo para recolher.',
      },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-10-20',
    title: 'Quadro do Mestre',
    changes: [
      {
        kind: 'novidade',
        text: 'O mestre ganhou o Quadro do Mestre: uma gaveta lateral, visível só para ele, que reúne rolar dados, teste secreto, imagens de referência, mostrar ou esconder monstros, iniciar e encerrar combate, adicionar NPC e monstro, distribuir XP e as configurações da sessão.',
      },
      {
        kind: 'novidade',
        text: 'No quadro, o mestre vê a lista das suas rolagens ocultas e dos resultados dos testes secretos, separada das rolagens que a mesa vê.',
      },
      {
        kind: 'novidade',
        text: 'No quadro, uma visão rápida do grupo mostra Classe de Armadura, vida, Percepção passiva, CD de magia e efeitos ativos de cada personagem, sem precisar abrir ficha por ficha.',
      },
      {
        kind: 'novidade',
        text: 'O mestre pode declarar um descanso curto ou longo para o grupo de uma vez, escolhendo quem descansa. No longo, todos recuperam a vida, metade dos Dados de Vida, os espaços de magia e os recursos; no curto, os recursos de descanso curto voltam e cada jogador gasta os próprios Dados de Vida.',
      },
      {
        kind: 'novidade',
        text: 'O mestre pode aplicar dano ou cura em vários alvos de uma vez (bola de fogo, armadilha, cura em grupo), marcando quem leva só metade.',
      },
      {
        kind: 'novidade',
        text: 'O mestre tem um bloco de anotações em cada sessão, que só ele vê. As anotações entram na exportação dos dados da conta.',
      },
      {
        kind: 'novidade',
        text: 'O mestre pode apagar a sessão pelo quadro, confirmando com o código da sessão. Quem estiver na mesa vê o aviso de que a sessão foi encerrada.',
      },
      {
        kind: 'melhoria',
        text: 'Para o mestre, as rolagens ocultas agora aparecem com um cadeado no histórico e no aviso de rolagem.',
      },
      {
        kind: 'correcao',
        text: 'O bruxo agora recupera os espaços de magia de pacto no descanso curto, como manda o livro.',
      },
    ],
  },
  {
    version: '1.1.7',
    date: '2026-10-18',
    title: 'Talento Habilidoso',
    changes: [
      {
        kind: 'correcao',
        text: 'Ao escolher o talento Habilidoso na subida de nível, agora aparece a escolha de 3 perícias ou ferramentas; as perícias ficam treinadas e as ferramentas entram nas proficiências da ficha.',
      },
    ],
  },
  {
    version: '1.1.6',
    date: '2026-10-18',
    title: 'Aviso de subir de nível para todos',
    changes: [
      {
        kind: 'correcao',
        text: 'Quando o mestre dá experiência para vários personagens e mais de um pode subir de nível, o aviso agora mostra todos eles (antes aparecia só um).',
      },
    ],
  },
  {
    version: '1.1.5',
    date: '2026-10-18',
    title: 'Aviso de troca de vez para a mesa',
    changes: [
      {
        kind: 'melhoria',
        text: 'Quando a vez passa no combate, toda a mesa vê um aviso em tela cheia: o personagem que jogou sai e o próximo entra no centro, com "VEZ DE …" (ou "É A SUA VEZ!") e a rodada.',
      },
    ],
  },
  {
    version: '1.1.4',
    date: '2026-10-18',
    title: 'Animação na troca de vez',
    changes: [
      {
        kind: 'melhoria',
        text: 'No combate, quando a vez passa (finalizar, pular ou atrasar o turno), um marcador desliza do personagem que jogou até o próximo na lista de iniciativa, que pisca ao receber a vez.',
      },
    ],
  },
  {
    version: '1.1.3',
    date: '2026-10-18',
    title: 'Aplicar em destaque e aviso de conjuração longa',
    changes: [
      {
        kind: 'melhoria',
        text: 'O painel de aplicar dano ou cura depois da rolagem ficou em destaque, com título e botão principal mais visíveis.',
      },
      {
        kind: 'melhoria',
        text: 'Durante o combate, magias que levam 1 minuto ou mais para conjurar (como Oração Curativa) mostram o tempo e pedem confirmação antes de lançar.',
      },
    ],
  },
  {
    version: '1.1.2',
    date: '2026-10-18',
    title: 'Aplicar em vários alvos de uma vez',
    changes: [
      {
        kind: 'melhoria',
        text: 'Magias em área: depois de rolar, marque todos os alvos atingidos e aplique de uma vez. Cada alvo mostra quanto vai receber, com opção de marcar quem passou na resistência (metade) e a Esquiva Sobrenatural.',
      },
    ],
  },
  {
    version: '1.1.1',
    date: '2026-10-17',
    title: 'Aplicar dano e cura em aliados e monstros',
    changes: [
      {
        kind: 'melhoria',
        text: 'Depois de rolar, o jogador pode aplicar a cura ou o dano em qualquer aliado e NPC da sessão, e o dano em monstros já revelados (antes era só no próprio personagem).',
      },
      {
        kind: 'melhoria',
        text: 'A mesa recebe um aviso de quem aplicou quanto em quem.',
      },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-10-17',
    title: 'Imagens de referência na sessão',
    changes: [
      {
        kind: 'novidade',
        text: 'O mestre sobe imagens na sessão (mapas, cenas, retratos), com legenda opcional, e mostra qualquer uma em tela cheia para todos os jogadores.',
      },
      {
        kind: 'novidade',
        text: 'Cada jogador pode fechar a imagem só para si, e o mestre pode fechá-la para todos. Quem entrar na sessão depois já vê a imagem aberta.',
      },
    ],
  },
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
