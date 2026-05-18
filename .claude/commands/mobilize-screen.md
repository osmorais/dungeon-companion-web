# Skill: mobilize-screen

Adapta uma tela Angular para ter layout desktop (preservado) e layout mobile, seguindo o padrão do `character-sheet`.

## Padrão do projeto

O `character-sheet` é a referência. O padrão é:

**`.ts`** — adiciona signal `isMobile` e listener de resize:
```typescript
isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);

@HostListener('window:resize')
onResize() {
  this.isMobile.set(window.innerWidth < 768);
}
```
Imports necessários: `signal` e `HostListener` de `@angular/core`.

**`.html`** — separa os dois layouts com `@if (isMobile())`:
```html
@if (isMobile()) {
  <!-- ===== MOBILE LAYOUT ===== -->
  <div class="mobile-[nome]-container">
    <!-- layout mobile aqui -->
  </div>
} @else {
  <!-- ===== DESKTOP LAYOUT ===== -->
  <!-- conteúdo original intacto aqui -->
}
```

**`.scss`** — classes mobile prefixadas com `mobile-`, sem alterar nenhuma classe desktop existente. O container raiz mobile **obrigatoriamente** deve usar:
```scss
.mobile-[nome]-container {
  width: 100vw;
  max-width: 100vw;
  min-height: 100vh;
  box-sizing: border-box;
  overflow-x: hidden;
  /* padding interno conforme o layout */
}
```
> **Por quê:** o `body` global usa `display: flex; justify-content: center`, então `width: 100%` resolve relativo ao host do componente (que só tem a largura do seu conteúdo), não à viewport. Usar `100vw` é a única forma de garantir que o layout mobile ocupe toda a largura da tela.

## Breakpoint

- **Mobile**: `window.innerWidth < 768` (abaixo de 768px)
- **Desktop**: 768px ou mais (layout original, nunca alterado)

## Passos de execução

Quando o usuário invoca `/mobilize-screen [nome-do-componente]`:

### 1. Identifique o componente alvo
- Se o nome foi passado como argumento, localize em `src/app/[nome]/[nome].component.{ts,html,scss}`
- Se não foi passado, pergunte ao usuário qual tela adaptar

### 2. Leia os 3 arquivos do componente
- `.ts` — para entender a estrutura atual e imports
- `.html` — para entender o layout desktop existente
- `.scss` — para ver os estilos desktop existentes

### 3. Modifique o `.ts`
- Adicione `signal` e `HostListener` aos imports de `@angular/core` (se ausentes)
- Adicione a propriedade `isMobile` após as outras propriedades/signals
- Adicione o método `onResize()` com `@HostListener('window:resize')`
- **NUNCA remova ou altere lógica existente**

### 4. Modifique o `.html`
- Envolva TODO o conteúdo existente em `@else { <!-- DESKTOP --> ... }`
- Adicione o bloco `@if (isMobile()) { <!-- MOBILE --> ... }` antes do desktop
- O layout mobile deve ser uma versão simplificada/adaptada para tela pequena:
  - Use `div` com classes `mobile-[componente]-container`
  - Prefira scroll vertical ao invés de layouts horizontais
  - Simplifique tabelas em cards empilhados
  - Use botão de voltar (`←`) no topo quando houver navegação
  - Para telas com múltiplas seções, use tabs (como no character-sheet)
- **NUNCA altere o bloco desktop**

### 5. Modifique o `.scss`
- Adicione seção `/* ===== MOBILE LAYOUT ===== */` no final do arquivo
- Todas as classes mobile com prefixo `mobile-`
- O container raiz mobile **sempre** deve ter `width: 100vw; max-width: 100vw; min-height: 100vh; overflow-x: hidden; box-sizing: border-box` (veja nota em "Padrão do projeto")
- **NUNCA altere estilos desktop existentes**

## Regras críticas

- A versão desktop NUNCA é alterada — nem HTML, nem CSS, nem TypeScript
- O breakpoint é sempre 768px
- Classes mobile sempre prefixadas com `mobile-`
- Imports Angular devem ser adicionados na mesma linha de imports existente (não duplicar o `import { ... } from '@angular/core'`)
- Componente deve continuar `standalone: true`

## Telas do projeto

| Rota | Componente | Arquivo |
|------|-----------|---------|
| `/` | HomeComponent | `src/app/home/` |
| `/create` | CharacterWizardComponent | `src/app/character-wizard/` |
| `/sheet-result` | (verificar) | `src/app/` |
| `/characters` | CharacterListComponent | `src/app/character-list/` |
| `/character-sheet/:id` | CharacterSheetComponent | `src/app/character-sheet/` ✅ já adaptado |

## Exemplo de uso

```
/mobilize-screen character-list
/mobilize-screen home
/mobilize-screen character-wizard
```
