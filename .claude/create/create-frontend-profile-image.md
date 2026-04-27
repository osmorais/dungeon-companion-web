# Implementação: Seletor de Avatar Pré-definido

Este documento descreve a tarefa para o Claude Code implementar o seletor de imagens de perfil pré-definidas.

## 🎯 Objetivo
Substituir ou complementar o upload de fotos permitindo que o usuário escolha entre uma galeria de avatares prontos em um Modal.

## 🛠 Contexto do Projeto
- **Localização dos Componentes:** `src/components/`
- **Padrão de UI:** Seguir o design system existente (verificar `src/components/ui` ou bibliotecas como Shadcn, Tailwind, etc).
- **Gerenciamento de Estado:** Utilizar o padrão do projeto (Context API, Redux ou State local).

## 🚀 Requisitos de Implementação

### 1. Gatilho (Trigger)
- No componente de perfil/configurações, a imagem atual deve ser clicável.
- Adicionar um efeito de hover (ex: sobreposição escura com ícone de câmera/lápis).
- Ao clicar, disparar o Modal.

### 2. O Modal de Seleção (`AvatarPickerModal`)
- **Grid:** Exibir as imagens em um grid responsivo (ex: 3x3 ou 4x4).
- **Lista de Imagens:** As imagens devem vir de uma constante centralizada (ex: `src/constants/avatars.ts`).
- **Seleção Visual:** A imagem clicada deve receber um destaque visual (borda, checkmark ou brilho) para indicar que foi selecionada.
- **Ações:** 
  - Botão "Cancelar": Fecha o modal sem salvar.
  - Botão "Salvar": Atualiza o perfil e fecha o modal.

### 3. Persistência
- Ao clicar em "Salvar", chamar a função/endpoint de atualização de perfil existente:
  ```typescript
  // Exemplo de integração esperada
  updateUser({ avatarUrl: selectedImage.url });