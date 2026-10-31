/**
 * Elemento e função de cada magia, pros filtros do grimório. Classificação feita à mão sobre as
 * descrições do livro (2026-10-30), com a lista de categorias aprovada pelo usuário. Uma magia
 * pode ter vários elementos (Orbe Cromática) ou nenhum (Invisibilidade) e sempre tem ao menos
 * uma função. "Físico" junta concussão, cortante e perfurante.
 */
export type SpellElement =
  | 'fogo'
  | 'frio'
  | 'eletrico'
  | 'trovao'
  | 'acido'
  | 'veneno'
  | 'necrotico'
  | 'radiante'
  | 'energia'
  | 'psiquico'
  | 'fisico';

export type SpellFunction =
  | 'dano-alvo'
  | 'dano-area'
  | 'atordoar'
  | 'controlar'
  | 'prender'
  | 'enfraquecer'
  | 'fortalecer'
  | 'proteger'
  | 'curar'
  | 'invocar'
  | 'mover'
  | 'furtividade'
  | 'detectar'
  | 'utilidade';

export type SpellTags = [SpellElement[], SpellFunction[]];

export const SPELL_ELEMENTS: { value: SpellElement; label: string }[] = [
  { value: 'fogo', label: 'Fogo' },
  { value: 'frio', label: 'Frio' },
  { value: 'eletrico', label: 'Elétrico' },
  { value: 'trovao', label: 'Trovão' },
  { value: 'acido', label: 'Ácido' },
  { value: 'veneno', label: 'Veneno' },
  { value: 'necrotico', label: 'Necrótico' },
  { value: 'radiante', label: 'Radiante' },
  { value: 'energia', label: 'Energia' },
  { value: 'psiquico', label: 'Psíquico' },
  { value: 'fisico', label: 'Físico' },
];

export const SPELL_FUNCTIONS: { value: SpellFunction; label: string }[] = [
  { value: 'dano-alvo', label: 'Dano em alvo único' },
  { value: 'dano-area', label: 'Dano em área' },
  { value: 'atordoar', label: 'Atordoar / incapacitar' },
  { value: 'controlar', label: 'Controlar mente' },
  { value: 'prender', label: 'Prender / imobilizar' },
  { value: 'enfraquecer', label: 'Enfraquecer inimigos' },
  { value: 'fortalecer', label: 'Fortalecer aliados' },
  { value: 'proteger', label: 'Proteger' },
  { value: 'curar', label: 'Curar / reviver' },
  { value: 'invocar', label: 'Invocar' },
  { value: 'mover', label: 'Mover / teletransportar' },
  { value: 'furtividade', label: 'Furtividade / enganar' },
  { value: 'detectar', label: 'Detectar / informar' },
  { value: 'utilidade', label: 'Utilidade' },
];

// Uma linha por magia — id: [elementos, funções], // nome
// prettier-ignore
export const SPELL_TAGS: Record<number, SpellTags> = {
  2: [[], ['controlar']], // Acalmar Emoções
  3: [[], ['detectar']], // Adivinhação
  4: [[], ['fortalecer', 'proteger']], // Ajuda
  5: [[], ['detectar', 'utilidade']], // Alarme
  6: [[], ['invocar']], // Aliado Planar
  7: [[], ['fortalecer']], // Aljava Veloz
  8: [[], ['fortalecer', 'mover']], // Alterar Forma
  9: [[], ['fortalecer', 'furtividade']], // Alterar-se
  10: [[], ['controlar']], // Amizade
  11: [[], ['controlar']], // Amizade Animal
  12: [[], ['prender', 'utilidade']], // Ampliar Plantas
  13: [[], ['controlar']], // Âncora Planar
  14: [[], ['mover', 'utilidade']], // Andar na Água
  15: [[], ['invocar']], // Animar Mortos
  16: [['fisico'], ['dano-alvo', 'invocar']], // Animar Objetos
  17: [[], ['controlar']], // Antipatia/Simpatia
  18: [[], ['fortalecer']], // Aprimorar Habilidade
  19: [[], ['prender']], // Aprisionamento
  20: [[], ['utilidade']], // Arca Secreta de Leomund
  21: [[], ['prender']], // Área Escorregadia
  22: [['fogo', 'frio', 'eletrico', 'trovao', 'acido'], ['fortalecer']], // Arma Elemental
  23: [['energia'], ['dano-alvo']], // Arma Espiritual
  24: [[], ['fortalecer']], // Arma Mágica
  25: [[], ['proteger']], // Armadura Arcana
  26: [['frio'], ['dano-alvo', 'proteger']], // Armadura de Agathys
  27: [[], ['utilidade']], // ArromBAR
  28: [['psiquico'], ['dano-alvo', 'controlar']], // Assassino Fantasmagórico
  29: [[], ['fortalecer']], // Ataque Certeiro
  30: [[], ['atordoar', 'controlar']], // Ataque Visual
  31: [[], ['detectar']], // Augúrio
  32: [[], ['enfraquecer', 'fortalecer']], // Aumentar/Reduzir
  33: [['veneno'], ['proteger']], // Aura de Pureza
  34: [['necrotico'], ['proteger', 'curar']], // Aura de Vida
  35: [[], ['curar']], // Aura de Vitalidade
  36: [[], ['furtividade']], // Aura Mágica de Nystul
  37: [[], ['enfraquecer', 'proteger']], // Aura Sagrada
  38: [['radiante'], ['dano-alvo', 'fortalecer']], // Auxílio Divino
  39: [[], ['atordoar']], // Banimento
  40: [[], ['proteger', 'curar']], // Banquete de Heróis
  41: [['fisico'], ['dano-area', 'prender']], // Barreira de Lâminas
  42: [[], ['fortalecer']], // Bênção
  43: [[], ['utilidade']], // Boca Encantada
  44: [['fogo'], ['dano-area']], // Bola de Fogo
  45: [['fogo'], ['dano-area']], // Bola de Fogo Controlável
  46: [[], ['curar']], // Bom Fruto
  47: [[], ['dano-alvo', 'fortalecer']], // Bordão Místico
  48: [['necrotico'], ['dano-area', 'enfraquecer']], // Braços de Hadar
  49: [['necrotico'], ['dano-alvo', 'enfraquecer']], // Bruxaria
  50: [[], ['mover']], // Caminhar em Árvores
  51: [[], ['mover']], // Caminhar no Vento
  52: [[], ['proteger']], // Campo Antimagia
  53: [['fisico'], ['invocar', 'detectar']], // Cão Fiel de Mordenkainen
  54: [[], ['controlar', 'enfraquecer']], // Cativar
  55: [[], ['atordoar', 'prender']], // Carne para Pedra
  56: [[], ['enfraquecer']], // Cegueira/Surdez
  57: [[], ['utilidade']], // Chama Contínua
  58: [['radiante'], ['dano-alvo']], // Chama Sagrada
  59: [['fisico'], ['dano-alvo']], // Chicote de Espinhos
  60: [['fogo', 'fisico'], ['dano-area']], // Chuva de Meteoros
  61: [['necrotico'], ['dano-area']], // Círculo da Morte
  62: [[], ['proteger']], // Círculo de Poder
  63: [[], ['mover']], // Círculo de Teletransporte
  64: [[], ['prender', 'proteger']], // Círculo Mágico
  65: [[], ['detectar']], // Clarividência
  66: [[], ['curar']], // Clone
  67: [['fogo', 'radiante'], ['dano-area']], // Coluna de Chamas
  68: [[], ['controlar']], // Comando
  69: [[], ['detectar', 'utilidade']], // Compreender Idiomas
  70: [[], ['controlar']], // Compulsão
  71: [[], ['detectar']], // Comunhão
  72: [[], ['detectar']], // Comunhão com a Natureza
  73: [['frio'], ['dano-area']], // Cone de Frio
  74: [[], ['controlar']], // Confusão
  75: [[], ['detectar']], // Conhecimento Lendário
  76: [[], ['invocar']], // Conjurar Animais
  77: [[], ['invocar']], // Conjurar Celestial
  78: [[], ['invocar']], // Conjurar Elementais Menores
  79: [[], ['invocar']], // Conjurar Elemental
  80: [[], ['invocar']], // Conjurar Fada
  81: [['fisico'], ['dano-area']], // Conjurar Rajada
  82: [['fisico'], ['dano-area']], // Conjurar Saraivada
  83: [[], ['invocar']], // Conjurar Seres da Floresta
  84: [[], ['enfraquecer', 'proteger']], // Consagrar
  85: [[], ['utilidade']], // Consertar
  86: [[], ['prender']], // Constrição
  87: [['psiquico'], ['detectar']], // Contato Extraplanar
  88: [[], ['proteger']], // Contramágica
  89: [[], ['utilidade']], // Contingência
  90: [['fisico'], ['prender', 'utilidade']], // Controlar a Água
  91: [[], ['utilidade']], // Controlar o Clima
  92: [[], ['invocar', 'detectar']], // Convocar Familiar
  93: [[], ['invocar', 'mover']], // Convocar Montaria
  94: [['eletrico'], ['dano-area']], // Convocar Relâmpagos
  95: [[], ['controlar']], // Coroa da Loucura
  96: [['fisico'], ['dano-alvo']], // Cordão de Flechas
  97: [['eletrico'], ['dano-alvo']], // Corrente de Relâmpagos
  98: [['fisico'], ['dano-area', 'prender']], // Crescer Espinhos
  99: [[], ['utilidade']], // Criação
  100: [[], ['utilidade']], // Criar Alimentos
  101: [['fogo'], ['dano-alvo', 'utilidade']], // Criar Chamas
  102: [[], ['invocar']], // Criar Mortos-Vivos
  103: [[], ['utilidade']], // Criar ou Destruir Água
  104: [[], ['mover', 'utilidade']], // Criar Passagem
  105: [[], ['proteger']], // Cúpula Antivida
  106: [[], ['curar']], // Cura Completa
  107: [[], ['curar']], // Cura Completa em Massa
  108: [[], ['curar']], // Curar Ferimentos
  109: [[], ['curar']], // Curar Ferimentos em Massa
  110: [[], ['controlar', 'enfraquecer']], // Dança Irresistível de Otto
  111: [['necrotico'], ['dano-alvo']], // Dedo da Morte
  112: [[], ['utilidade']], // Desejo
  113: [['energia'], ['dano-alvo']], // Desintegrar
  114: [['trovao'], ['dano-area']], // Despedaçar
  115: [[], ['utilidade']], // Despertar
  116: [[], ['furtividade']], // Despistar
  117: [['energia'], ['dano-alvo', 'atordoar']], // Destruição Banidora
  118: [['radiante'], ['dano-alvo', 'enfraquecer']], // Destruição Cegante
  119: [['psiquico'], ['dano-alvo', 'controlar']], // Destruição Colérica
  120: [['psiquico'], ['dano-alvo', 'enfraquecer']], // Destruição Estonteante
  121: [['fogo'], ['dano-alvo']], // Destruição Lancinante
  122: [['trovao'], ['dano-alvo']], // Destruição Troveante
  123: [[], ['detectar']], // Detectar o Bem e Mal
  124: [[], ['detectar']], // Detectar Magia
  125: [[], ['detectar']], // Detectar Pensamentos
  126: [[], ['detectar']], // Detectar Veneno e Doença
  127: [[], ['furtividade']], // Dificultar Detecção
  128: [[], ['utilidade']], // Disco Flutuante de Tenser
  129: [[], ['furtividade']], // Disfarçar-se
  130: [[], ['proteger']], // Dissipar Magia
  131: [[], ['proteger']], // Dissipar o Bem e Mal
  132: [['necrotico'], ['dano-alvo']], // Doença Plena
  133: [[], ['controlar']], // Dominar Besta
  134: [[], ['controlar']], // Dominar Monstro
  135: [[], ['controlar']], // Dominar Pessoa
  136: [[], ['utilidade']], // Druidismo
  137: [[], ['controlar']], // Duelo Compelido
  138: [['psiquico'], ['dano-area', 'controlar']], // Encarnação Fantasmagórica
  139: [[], ['detectar']], // Encontrar Armadilhas
  140: [[], ['detectar']], // Encontrar o Caminho
  141: [[], ['controlar']], // Enfeitiçar Pessoa
  142: [['psiquico'], ['dano-alvo', 'atordoar']], // Enfraquecer Intelecto
  143: [[], ['detectar']], // Enviar Mensagem
  144: [[], ['furtividade', 'utilidade']], // Escrita Ilusória
  145: [[], ['proteger']], // Escudo Arcano
  146: [[], ['proteger']], // Escudo da Fé
  147: [['fogo', 'frio'], ['dano-alvo', 'proteger']], // Escudo de Fogo
  148: [[], ['furtividade']], // Escuridão
  149: [['frio'], ['dano-area']], // Esfera Congelante de Otiluke
  150: [['fogo'], ['dano-area']], // Esfera Flamejante
  151: [[], ['prender', 'proteger']], // Esfera Resiliente de Otiluke
  152: [['energia'], ['dano-alvo']], // Espada de Mordenkainen
  153: [['necrotico', 'radiante'], ['dano-area', 'prender']], // Espíritos Guardiões
  154: [['acido'], ['dano-alvo']], // Espirro Ácido
  155: [['fogo'], ['dano-alvo', 'enfraquecer']], // Esquentar Metal
  156: [[], ['curar']], // Estabilizar
  157: [['radiante'], ['dano-area', 'enfraquecer']], // Explosão Solar
  158: [[], ['utilidade']], // Fabricar
  159: [[], ['detectar']], // Falar com Animais
  160: [[], ['detectar']], // Falar com os Mortos
  161: [[], ['detectar']], // Falar com Plantas
  162: [['acido'], ['dano-alvo']], // Flecha Ácida de Melf
  163: [['eletrico'], ['dano-alvo', 'dano-area']], // Flecha Relampejante
  164: [[], ['enfraquecer']], // Fogo das Fadas
  165: [['frio', 'acido'], ['dano-area', 'enfraquecer']], // Fome de Hadar
  166: [['psiquico'], ['dano-alvo', 'controlar']], // Força Fantasmagórica
  167: [[], ['proteger', 'furtividade']], // Forjar Morte
  168: [[], ['mover', 'furtividade']], // Forma Etérea
  169: [[], ['proteger', 'mover']], // Forma Gasosa
  170: [[], ['fortalecer']], // Formas Animais
  171: [['fogo', 'frio', 'eletrico', 'trovao', 'acido'], ['dano-area']], // Glifo de Vigilância
  172: [[], ['proteger']], // Globo de Invulnerabilidade
  173: [[], ['utilidade']], // Globos de Luz
  174: [['fisico'], ['dano-alvo', 'prender']], // Golpe Constritor
  175: [['radiante'], ['dano-alvo', 'proteger']], // Guardião da Fé
  176: [[], ['fortalecer', 'proteger']], // Heroísmo
  177: [[], ['detectar']], // Identificação
  178: [[], ['detectar', 'utilidade']], // Idiomas
  179: [[], ['furtividade']], // Ilusão Menor
  180: [[], ['furtividade']], // Ilusão Programada
  181: [[], ['furtividade']], // Imagem Maior
  182: [[], ['furtividade']], // Imagem Silenciosa
  183: [[], ['atordoar']], // Imobilizar Monstro
  184: [[], ['atordoar']], // Imobilizar Pessoa
  185: [['necrotico'], ['dano-alvo']], // Infligir Ferimentos
  186: [[], ['invocar']], // Inseto Gigante
  187: [[], ['prender']], // Inverter a Gravidade
  188: [[], ['furtividade']], // Invisibilidade
  189: [[], ['fortalecer', 'furtividade']], // Invisibilidade Maior
  190: [[], ['utilidade']], // Invocação Instantânea de Drawmij
  191: [[], ['proteger', 'furtividade']], // Isolamento
  192: [[], ['atordoar']], // Labirinto
  193: [['fogo'], ['dano-alvo']], // Lâmina Flamejante
  194: [[], ['prender', 'enfraquecer']], // Lentidão
  195: [[], ['enfraquecer']], // Leque Cromático
  196: [[], ['mover']], // Levitação
  197: [[], ['detectar']], // Ligação Telepática de Rary
  198: [[], ['proteger']], // Limpar a Mente
  199: [[], ['detectar']], // Localizar Animais ou Plantas
  200: [[], ['detectar']], // Localizar Criatura
  201: [[], ['detectar']], // Localizar Objeto
  202: [[], ['fortalecer']], // Loquacidade
  203: [[], ['prender']], // Lufada de Vento
  204: [[], ['utilidade']], // Luz
  205: [[], ['utilidade']], // Luz do Dia
  206: [['necrotico'], ['dano-alvo']], // Malogro
  207: [[], ['utilidade']], // Mansão Magnífica de Mordenkainen
  208: [['radiante'], ['fortalecer']], // Manto do Cruzado
  209: [['energia', 'fisico'], ['dano-alvo', 'prender', 'proteger']], // Mão de Bigby
  210: [['fogo'], ['dano-area']], // Mãos Flamejantes
  211: [[], ['utilidade']], // Mãos Mágicas
  212: [['radiante'], ['dano-alvo']], // Marca da Punição
  213: [[], ['dano-alvo', 'detectar']], // Marca do Caçador
  214: [[], ['controlar']], // Medo
  215: [[], ['detectar']], // Mensageiro Animal
  216: [[], ['detectar']], // Mensagem
  217: [[], ['furtividade']], // Mesclar-se às Rochas
  218: [[], ['fortalecer', 'mover']], // Metamorfose
  219: [[], ['atordoar', 'fortalecer']], // Metamorfose Verdadeira
  220: [[], ['furtividade']], // Miragem
  221: [[], ['controlar']], // Missão
  222: [['energia'], ['dano-alvo']], // Mísseis Mágicos
  223: [[], ['controlar']], // Modificar Memória
  224: [[], ['utilidade']], // Moldar Rochas
  225: [[], ['invocar', 'mover']], // Montaria Fantasmagórica
  226: [[], ['utilidade']], // Mover Terra
  227: [[], ['proteger', 'mover']], // Movimentação Livre
  228: [[], ['prender', 'proteger']], // Muralha de Energia
  229: [['fisico'], ['dano-area', 'prender']], // Muralha de Espinhos
  230: [['fogo'], ['dano-area', 'prender']], // Muralha de Fogo
  231: [['frio'], ['dano-area', 'prender']], // Muralha de Gelo
  232: [[], ['prender', 'proteger']], // Muralha de Pedra
  233: [['fisico'], ['dano-area', 'proteger']], // Muralha de Vento
  234: [['fogo', 'frio', 'eletrico', 'acido', 'veneno'], ['dano-area', 'atordoar', 'proteger']], // Muralha Prismática
  235: [['frio'], ['prender', 'enfraquecer']], // Nevasca
  236: [['veneno'], ['enfraquecer', 'furtividade']], // Névoa Fétida
  237: [['veneno'], ['dano-area']], // Névoa Mortal
  238: [[], ['furtividade']], // Névoa Obscurecente
  239: [[], ['proteger']], // Nublar
  240: [['fisico'], ['dano-area']], // Nuvem de Adagas
  241: [['fogo'], ['dano-area']], // Nuvem Incendiária
  242: [[], ['detectar']], // Olho Arcano
  243: [['trovao', 'radiante'], ['dano-area']], // Onda Destrutiva
  244: [['trovao'], ['dano-area']], // Onda Troveante
  245: [[], ['curar']], // Oração Curativa
  246: [['fogo', 'frio', 'eletrico', 'trovao', 'acido', 'veneno'], ['dano-alvo']], // Orbe Cromática
  247: [[], ['fortalecer']], // Orientação
  248: [[], ['atordoar', 'controlar']], // Padrão Hipnótico
  249: [[], ['curar']], // Palavra Curativa
  250: [[], ['curar']], // Palavra Curativa em Massa
  251: [[], ['atordoar']], // Palavra de Poder Atordoar
  252: [[], ['curar']], // Palavra de Poder Curar
  253: [[], ['dano-alvo']], // Palavra de Poder Matar
  254: [[], ['mover']], // Palavra de Recordação
  255: [[], ['atordoar', 'enfraquecer']], // Palavra Divina
  256: [[], ['utilidade']], // Parar o Tempo
  257: [[], ['mover']], // Passo Nebuloso
  258: [[], ['mover']], // Passos Longos
  259: [[], ['furtividade']], // Passos Sem Pegadas
  260: [[], ['mover']], // Patas de Aranha
  261: [[], ['proteger']], // Pele de Árvore
  262: [[], ['proteger']], // Pele de Pedra
  263: [[], ['proteger', 'utilidade']], // Pequena Cabana de Leomund
  264: [[], ['enfraquecer']], // Perdição
  265: [[], ['proteger', 'mover']], // Piskar
  266: [[], ['mover']], // Porta Dimensional
  267: [[], ['invocar', 'mover']], // Portal
  268: [[], ['mover']], // Portal Arcano
  269: [[], ['enfraquecer']], // Praga
  270: [['fisico'], ['dano-area']], // Praga de Insetos
  271: [[], ['utilidade']], // Prestidigitação
  272: [[], ['prender']], // Prisão de Energia
  273: [['necrotico', 'radiante'], ['proteger']], // Proibição
  274: [[], ['mover']], // Projeção Astral
  275: [[], ['furtividade']], // Projetar Imagem
  276: [[], ['proteger']], // Proteção contra a Morte
  277: [['fogo', 'frio', 'eletrico', 'trovao', 'acido'], ['proteger']], // Proteção contra Energia
  278: [['fisico'], ['proteger']], // Proteção contra Lâminas
  279: [[], ['proteger']], // Proteção contra o Bem e Mal
  280: [['veneno'], ['proteger', 'curar']], // Proteção contra Veneno
  281: [[], ['proteger']], // Proteger Fortaleza
  282: [[], ['utilidade']], // Purificar Alimentos
  283: [[], ['proteger', 'mover']], // Queda Suave
  284: [['veneno'], ['dano-alvo', 'enfraquecer']], // Raio Adoecente
  285: [['fogo'], ['dano-alvo']], // Raio Ardente
  286: [['eletrico'], ['dano-alvo']], // Raio de Bruxa
  287: [['fogo'], ['dano-alvo']], // Raio de Fogo
  288: [['frio'], ['dano-alvo', 'prender']], // Raio de Gelo
  289: [[], ['enfraquecer']], // Raio do Enfraquecimento
  290: [['radiante'], ['dano-alvo', 'enfraquecer']], // Raio Guiador
  291: [['radiante'], ['dano-area']], // Raio Lunar
  292: [['radiante'], ['dano-area', 'enfraquecer']], // Raio Solar
  293: [['veneno'], ['dano-alvo']], // Rajada de Veneno
  294: [['energia'], ['dano-alvo']], // Rajada Mística
  295: [['fogo', 'frio', 'eletrico', 'acido', 'veneno'], ['dano-area', 'atordoar']], // Rajada Prismática
  296: [[], ['controlar']], // Recipiente Arcano
  297: [[], ['mover']], // Recuo Acelerado
  298: [[], ['curar']], // Reencarnação
  299: [[], ['proteger']], // Reflexos
  300: [[], ['curar']], // Regeneração
  301: [['eletrico'], ['dano-area']], // Relâmpago
  302: [[], ['curar']], // Remover Maldição
  303: [[], ['utilidade']], // Repouso Tranquilo
  304: [['fogo'], ['dano-alvo']], // Repreensão Infernal
  305: [[], ['fortalecer']], // Resistência
  306: [[], ['utilidade']], // Respirar na Água
  307: [[], ['curar']], // Ressurreição
  308: [[], ['curar']], // Ressurreição Verdadeira
  309: [[], ['curar']], // Restauração Maior
  310: [[], ['curar']], // Restauração Menor
  311: [[], ['curar']], // Reviver os Mortos
  312: [[], ['curar']], // Revivificar
  313: [[], ['atordoar']], // Riso Histérico de Tasha
  314: [['necrotico'], ['dano-alvo', 'enfraquecer']], // Rogar Maldição
  315: [[], ['mover']], // Salto
  316: [[], ['proteger']], // Santuário
  317: [[], ['proteger', 'furtividade']], // Santuário Particular de Mordenkainen
  318: [['fisico'], ['dano-area']], // Saraivada de Espinhos
  319: [[], ['utilidade']], // Semiplano
  320: [[], ['detectar']], // Sentido Bestial
  321: [[], ['utilidade']], // Servo Invisível
  322: [[], ['fortalecer', 'proteger']], // Sexto Sentido
  323: [[], ['enfraquecer']], // Silêncio
  324: [['necrotico'], ['dano-area', 'atordoar', 'controlar']], // Símbolo
  325: [[], ['furtividade']], // Similaridade
  326: [[], ['invocar']], // Simulacro
  327: [[], ['proteger', 'curar']], // Sinal de Esperança
  328: [['psiquico'], ['dano-alvo', 'detectar']], // Sonho
  329: [[], ['atordoar']], // Sono
  330: [[], ['controlar']], // Sugestão
  331: [[], ['controlar']], // Sugestão em Massa
  332: [['psiquico'], ['dano-alvo', 'controlar']], // Sussurros Dissonantes
  333: [[], ['utilidade']], // Taumaturgia
  334: [[], ['prender']], // Teia
  335: [[], ['prender', 'utilidade']], // Telecinésia
  336: [[], ['detectar']], // Telepatia
  337: [[], ['mover']], // Teletransporte
  338: [[], ['mover']], // Teletransporte por Árvores
  339: [['frio', 'eletrico', 'trovao', 'acido', 'fisico'], ['dano-area', 'enfraquecer']], // Tempestade da Vingança
  340: [['fogo'], ['dano-area']], // Tempestade de Fogo
  341: [['frio', 'fisico'], ['dano-area', 'prender']], // Tempestade de Gelo
  342: [['fisico'], ['dano-area', 'prender']], // Tentáculos Negros de Evard
  343: [['fisico'], ['dano-area', 'prender']], // Terremoto
  344: [[], ['furtividade']], // Terreno Alucinógeno
  345: [['necrotico'], ['dano-alvo', 'enfraquecer']], // Toque Arrepiante
  346: [['eletrico'], ['dano-alvo']], // Toque Chocante
  347: [['necrotico'], ['dano-alvo', 'curar']], // Toque Vampírico
  348: [[], ['proteger', 'utilidade']], // Tranca Arcana
  349: [[], ['furtividade', 'utilidade']], // Truque de Corda
  350: [['fisico'], ['dano-area']], // Tsunami
  351: [[], ['fortalecer', 'mover']], // Velocidade
  352: [[], ['detectar']], // Ver o Invisível
  353: [[], ['mover']], // Viagem Planar
  354: [[], ['detectar']], // Vidência
  355: [[], ['proteger']], // Vínculo Protetor
  356: [['fisico'], ['prender']], // Vinha Esmagadora
  357: [[], ['detectar']], // Visão da Verdade
  358: [[], ['fortalecer']], // Visão no Escuro
  359: [[], ['proteger']], // Vitalidade Falsa
  360: [[], ['mover']], // Voo
  361: [['psiquico'], ['dano-alvo', 'enfraquecer']], // Zombaria Viciosa
  362: [[], ['detectar']], // Zona da Verdade
};
