// Só as classes que escolhem subclasse já na criação (nível 1) — Bruxo, Clérigo, Feiticeiro.
// As demais escolhem depois, via level-up (ver level-up-modal). Mantido em sincronia manualmente
// com `SUBCLASSES` no backend (rules.ts) — só precisa do id/nome aqui, o resto do conteúdo mecânico
// só existe no backend.

export interface Level1SubclassOption {
  id_subclass: string;
  displayName: string;
}

// id_class reference: 3=Bruxo 4=Clérigo 6=Feiticeiro
export const LEVEL1_SUBCLASS_OPTIONS: Record<number, Level1SubclassOption[]> = {
  3: [
    { id_subclass: 'corruptor', displayName: 'O Corruptor' },
    { id_subclass: 'arquifada', displayName: 'A Arquifada' },
    { id_subclass: 'grande-antigo', displayName: 'O Grande Antigo' },
  ],
  4: [
    { id_subclass: 'conhecimento', displayName: 'Domínio do Conhecimento' },
    { id_subclass: 'enganacao', displayName: 'Domínio da Enganação' },
    { id_subclass: 'guerra', displayName: 'Domínio da Guerra' },
    { id_subclass: 'luz', displayName: 'Domínio da Luz' },
    { id_subclass: 'natureza', displayName: 'Domínio da Natureza' },
    { id_subclass: 'tempestade', displayName: 'Domínio da Tempestade' },
    { id_subclass: 'vida', displayName: 'Domínio da Vida' },
  ],
  6: [
    { id_subclass: 'linhagem-draconica', displayName: 'Linhagem Dracônica' },
    { id_subclass: 'magia-selvagem', displayName: 'Magia Selvagem' },
  ],
};
