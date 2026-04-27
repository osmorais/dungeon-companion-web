# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Dev server at http://localhost:4200
npm run build      # Production build (outputs to dist/)
npm run watch      # Build in watch/dev mode
npm test           # Run unit tests with Vitest
```

To run a single test file: `npx vitest run src/app/path/to/file.spec.ts`

## Architecture

This is an Angular 21 single-page app for D&D 5e character creation and management. It requires a backend API running at `http://localhost:3000` in development (configured in `src/environments/environment.ts`).

**Routing** — lazy-loaded standalone components (no NgModules):
- `/` → home
- `/create` → character wizard (main feature)
- `/sheet-result` → character sheet after creation
- `/characters` → saved character list
- `/character-sheet/:id` → individual character sheet

**State management** — Angular Signals for synchronous local state, RxJS Observables for HTTP responses. `CharacterService` holds cross-route state via signals: `currentCharacter`, `avatarUrl`, `cachedOptions`.

**HTTP layer** — all requests go through `LoadingInterceptor` which automatically shows/hides the loading overlay. API calls are made via `CharacterService` and `BackgroundService`.

**Character Wizard** (`src/app/character-wizard/`) — the core feature. A 6-step form with:
- Three attribute allocation methods: Standard Array, Point Buy, Dice Roll
- Drag-and-drop between an attribute pool and character stats
- Paginated spell/weapon selection
- Conditional step skipping (magic step is skipped for non-spellcaster classes)

**Backend API endpoints** called by the frontend:
- `POST /api/character-sheet` — save new character
- `GET /api/character-sheet` — list all characters
- `GET /api/character-sheet/:id` — get character by ID
- `GET /api/character-options` — fetch races, classes, skills, spells, weapons, etc.

## Code Style

TypeScript strict mode is enabled (`strict`, `strictTemplates`, `noImplicitOverride`, `noImplicitReturns`). Prettier is configured with 100-char line width, single quotes, and the Angular HTML parser (`.prettierrc`). Use 2-space indentation (enforced by `.editorconfig`).

All components are standalone — do not use NgModules.
