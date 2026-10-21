# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Dev server at http://localhost:4200
npm run build      # Production build (outputs to dist/)
npm run watch      # Build in watch/dev mode
npm test           # Run unit tests with Vitest
npm run test:run   # Same, single run (no watch) — rodar a cada implementação
```

Test data factories live in `src/testing/` (excluded from the app build in `tsconfig.app.json`).

Rodar os testes sempre com `npm run test:run`: `npx vitest run <arquivo>` sozinho não funciona (o ambiente do Angular vem do builder `@angular/build:unit-test`, e o vitest direto falha sem rodar nenhum teste).

## Architecture

This is an Angular 21 single-page app for D&D 5e character creation and management. It requires a backend API running at `http://localhost:3000` in development (configured in `src/environments/environment.ts`).

**Routing** (`src/app/app.routes.ts`) — lazy-loaded standalone components (no NgModules):
- Públicas: `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/privacidade`, `/termos`, `/novidades`
- Com `authGuard`: `/` (home), `/create` (wizard de criação), `/sheet-result`, `/characters`, `/character-sheet/:id`, `/session-create`, `/session-join`, `/my-sessions`, `/sessions`, `/session/:id` (mesa: combate, rolagens, magias), `/conta`, `/monster-catalog` (+ `/new`, `/:id`), `/spell-catalog`

**State management** — Angular Signals for synchronous local state, RxJS Observables for HTTP responses. `CharacterService` holds cross-route state via signals: `currentCharacter`, `avatarUrl`, `cachedOptions`.

**HTTP layer** — interceptors em `app.config.ts`: `loadingInterceptor` (overlay de loading automático), `credentialsInterceptor` (`withCredentials` só pra API) e `authErrorInterceptor` (401 fora de `/auth/` desloga). Chamadas à API ficam nos services de `src/app/services/`; a sessão em tempo real usa socket.io (`session-socket.service.ts` + `session-event.reducer.ts`).

**Character Wizard** (`src/app/character-wizard/`) — the core feature. A 6-step form with:
- Three attribute allocation methods: Standard Array, Point Buy, Dice Roll
- Drag-and-drop between an attribute pool and character stats
- Paginated spell/weapon selection
- Conditional step skipping (magic step is skipped for non-spellcaster classes)

## Code Style

TypeScript strict mode is enabled (`strict`, `strictTemplates`, `noImplicitOverride`, `noImplicitReturns`). Prettier is configured with 100-char line width, single quotes, and the Angular HTML parser (`.prettierrc`). Use 2-space indentation (enforced by `.editorconfig`).

All components are standalone — do not use NgModules.

## Contexto do projeto

Estado atual, pendências, decisões e armadilhas ficam em `~/projects/docs/` (índice em
`~/projects/docs/README.md`). Antes de começar uma tarefa, ler
`~/projects/docs/dungeon-companion/estado-atual.md` e `backlog.md`; ao terminar uma entrega,
atualizar os dois (ver "Manutenção" no índice).

## Convenções que já deram problema

- **Commit e push só com pedido explícito, a cada vez** — mesmo depois de várias aprovações seguidas.
- **Não testar a UI no browser** (Playwright, screenshots, dev server): o usuário testa. Verificar com `npm run build` (type-check dos templates), testes unitários e prettier.
- **Prettier**: antes de formatar um arquivo, confirmar com `git stash && npx prettier --check <arquivo> && git stash pop` se o aviso já existia (débito antigo, não mexer) ou veio da edição (aí `--write` só nele). `session-panel.component.*` tem bastante débito antigo.
- **Orçamento de SCSS** (`angular.json`, `anyComponentStyle.maximumError` = 32 kB): `session-panel.component.scss` está perto do limite. Componente novo da sessão ganha SCSS próprio; keyframes/classes compartilhadas vão pro `styles.scss`. Se estourar, quebrar o componente em vez de subir o limite.
- **Assets** em `src/assets/*.png`, referenciados como `assets/nome.png` (sem barra inicial).
- Mais armadilhas por área: `~/projects/docs/dungeon-companion/gotchas.md`.

## Testes

Toda implementação nova termina rodando a suíte existente e criando testes para o que foi implementado — ver `.claude/rules/testes.md`.

## Versão e notas de versão

O sistema (api + web) tem uma versão `A.B.C` (A: mudança grande, só por decisão do usuário; B: funcionalidade nova; C: correção ou funcionalidade pequena). Toda entrega que muda algo pra quem usa ganha uma entrada no topo de `src/app/release-notes/release-notes.ts` (com data) e sobe o `version` dos dois `package.json` — exibido na página pública `/novidades` e validado em `release-notes.spec.ts`. Ver `.claude/rules/versionamento.md`.

## LGPD

Toda implementação nova passa pelo checklist de proteção de dados (dado novo, permissões, exclusão/exportação da conta, terceiros, segurança) e avalia se a Política de Privacidade e os Termos de Uso precisam mudar — ver `.claude/rules/lgpd.md`.
