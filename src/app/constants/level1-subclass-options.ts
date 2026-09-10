// Só as classes que escolhem subclasse já na criação (nível 1) — Bruxo, Clérigo, Feiticeiro.
// As demais escolhem depois, via level-up (ver level-up-modal). Mantido em sincronia manualmente
// com `SUBCLASSES` no backend (rules.ts) — id/nome/features do nível 1 duplicados aqui só pra
// mostrar a explicação da escolha no wizard de criação; o resto do conteúdo mecânico (níveis
// seguintes) só existe no backend.

export interface Level1SubclassFeature {
  name: string;
  description: string;
}

export interface Level1SubclassOption {
  id_subclass: string;
  displayName: string;
  features: Level1SubclassFeature[];
}

// id_class reference: 3=Bruxo 4=Clérigo 6=Feiticeiro
export const LEVEL1_SUBCLASS_OPTIONS: Record<number, Level1SubclassOption[]> = {
  3: [
    {
      id_subclass: 'corruptor',
      displayName: 'O Corruptor',
      features: [
        {
          name: 'Bênção do Corruptor',
          description:
            'Quando você reduzir uma criatura hostil a 0 pontos de vida, ganha pontos de vida temporários iguais ao seu nível de bruxo + seu modificador de Carisma (mínimo de 1).',
        },
      ],
    },
    {
      id_subclass: 'arquifada',
      displayName: 'A Arquifada',
      features: [
        {
          name: 'Presença Feérica',
          description:
            'Como ação, cada criatura numa área de 3 metros de cubo a partir de você faz um teste de resistência de Sabedoria (CD de magia de bruxo) ou fica enfeitiçada ou amedrontada (à sua escolha) até o final do seu próximo turno.',
        },
      ],
    },
    {
      id_subclass: 'grande-antigo',
      displayName: 'O Grande Antigo',
      features: [
        {
          name: 'Mente Desperta',
          description:
            'Você pode se comunicar telepaticamente com qualquer criatura que possa ver a até 9 metros. Não precisa compartilhar um idioma, mas a criatura deve entender ao menos um.',
        },
      ],
    },
  ],
  4: [
    {
      id_subclass: 'conhecimento',
      displayName: 'Domínio do Conhecimento',
      features: [
        {
          name: 'Bênção do Conhecimento',
          description:
            'Você aprende dois idiomas à sua escolha e se torna proficiente em duas das seguintes perícias: Arcanismo, História, Natureza ou Religião. Seu bônus de proficiência é dobrado em qualquer teste de habilidade que você fizer usando essas duas perícias.',
        },
      ],
    },
    {
      id_subclass: 'enganacao',
      displayName: 'Domínio da Enganação',
      features: [
        {
          name: 'Bênção do Trapaceiro',
          description:
            'Como ação, você toca uma criatura (que não seja você) e concede a ela vantagem em testes de Destreza (Furtividade) por 1 hora ou até você usar essa característica de novo.',
        },
      ],
    },
    {
      id_subclass: 'guerra',
      displayName: 'Domínio da Guerra',
      features: [
        {
          name: 'Proficiência Adicional',
          description: 'Você ganha proficiência com armas marciais e armaduras pesadas.',
        },
        {
          name: 'Sacerdote da Guerra',
          description:
            'Quando você usa a ação de Atacar, pode realizar um ataque com arma como ação bônus. Pode usar essa característica um número de vezes igual ao seu modificador de Sabedoria (mínimo 1), recuperando todos os usos num descanso longo.',
        },
      ],
    },
    {
      id_subclass: 'luz',
      displayName: 'Domínio da Luz',
      features: [
        {
          name: 'Labareda Protetora',
          description:
            'Quando um ataque contra você ou outra criatura a até 9 metros for bem-sucedido, você pode usar sua reação pra impor desvantagem nessa jogada, através de uma explosão de luz — o atacante fica cego até o final do seu próximo turno se falhar num teste de resistência de Constituição.',
        },
      ],
    },
    {
      id_subclass: 'natureza',
      displayName: 'Domínio da Natureza',
      features: [
        {
          name: 'Proficiência Adicional',
          description: 'Você ganha proficiência com armaduras pesadas.',
        },
        {
          name: 'Acólito da Natureza',
          description:
            'Você aprende um truque adicional à sua escolha da lista de magias de druida, e ganha proficiência numa das seguintes perícias: Adestrar Animais, Natureza ou Sobrevivência.',
        },
      ],
    },
    {
      id_subclass: 'tempestade',
      displayName: 'Domínio da Tempestade',
      features: [
        {
          name: 'Proficiência Adicional',
          description: 'Você ganha proficiência com armas marciais e armaduras pesadas.',
        },
        {
          name: 'Ira da Tormenta',
          description:
            'Quando um inimigo a até 1,5 metro te acertar com um ataque, pode usar sua reação pra causar 2d8 de dano elétrico ou de trovão (à sua escolha) nele.',
        },
      ],
    },
    {
      id_subclass: 'vida',
      displayName: 'Domínio da Vida',
      features: [
        {
          name: 'Proficiência Adicional',
          description: 'Você ganha proficiência com armaduras pesadas.',
        },
        {
          name: 'Discípulo da Vida',
          description:
            'Suas magias de cura curam pontos de vida extra: sempre que usar uma magia de nível 1 ou superior pra restaurar pontos de vida a uma criatura, ela recupera pontos de vida adicionais iguais a 2 + o nível da magia.',
        },
      ],
    },
  ],
  6: [
    {
      id_subclass: 'linhagem-draconica',
      displayName: 'Linhagem Dracônica',
      features: [
        {
          name: 'Ancestral Dracônico',
          description:
            'Escolha um tipo de dragão como ancestral (cada um associado a um tipo de dano). Você aprende a falar, ler e escrever Dracônico.',
        },
        {
          name: 'Resiliência Dracônica',
          description:
            'Seu máximo de pontos de vida aumenta em 1 e mais 1 a cada nível ganho nessa classe. Quando não estiver usando armadura, sua CA é igual a 13 + seu modificador de Destreza.',
        },
      ],
    },
    {
      id_subclass: 'magia-selvagem',
      displayName: 'Magia Selvagem',
      features: [
        {
          name: 'Surto de Magia Selvagem',
          description:
            'Depois de conjurar uma magia de feiticeiro de 1º círculo ou superior, o mestre pode pedir pra você rolar 1d20; num resultado de 1, energia mágica caótica se manifesta e você rola numa tabela de dezenas de efeitos aleatórios diferentes.',
        },
        {
          name: 'Marés do Caos',
          description:
            'Uma vez antes de terminar um descanso longo, pode ganhar vantagem numa jogada de ataque, teste de habilidade ou teste de resistência — com risco de provocar um surto de magia selvagem depois.',
        },
      ],
    },
  ],
};
