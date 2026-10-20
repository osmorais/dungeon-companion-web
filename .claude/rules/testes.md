# Regra: testes a cada nova implementação

Vale para toda implementação nova, correção de bug ou mudança de comportamento neste repositório.

## Ao terminar a implementação (antes de dizer que está pronto ou de commitar)

1. **Rodar a suíte existente** e confirmar que tudo que já passava continua passando:
   ```bash
   npm run test:run
   npm run build
   ```
   - `npm run test:run` roda o Vitest uma vez (`ng test --watch=false`); `npm test` fica em modo
     watch e não termina sozinho.
   - O `npm run build` faz o type-check dos templates (`strictTemplates`). Os avisos de orçamento
     de SCSS já existentes não são problema novo; um **erro** de orçamento é.
   - Se algum teste antigo quebrar: descobrir se a mudança introduziu uma regressão (corrigir o
     código) ou se o comportamento mudou de propósito (atualizar o teste e **avisar o usuário**
     qual comportamento mudou). Nunca apagar, enfraquecer ou dar `skip` num teste só pra suíte
     passar sem explicar o motivo ao usuário.
2. **Criar testes novos para a funcionalidade implementada**, com arquivos `*.spec.ts` ao lado
   do código, cobrindo o caminho feliz e os casos de borda/validação:
   - Evento novo de socket → `src/app/services/session-event.reducer.spec.ts` (o reducer tem que
     tratar todos os tipos de `SessionEvent`).
   - Constante/tabela de regra nova ou alterada → `src/app/constants/rules-constants.spec.ts`.
   - Lógica de componente (cálculos, decisões, signals/computed) → spec do componente usando
     TestBed com os serviços mockados, sem renderizar o template (ver
     `session-panel.component.spec.ts`: instanciar via `TestBed.runInInjectionContext` e usar
     `TestBed.tick()` pra rodar os `effect`s).
   - Lógica pura que hoje está presa dentro de um componente grande pode ser extraída pra uma
     função/arquivo próprio se isso facilitar o teste — avisar o usuário quando fizer isso.
   - Fábricas de dados reutilizáveis → `src/testing/` (fora do build da aplicação).
3. Rodar `npm run test:run` de novo com os testes novos e `npx prettier --check` nos arquivos de
   teste criados/alterados.
4. **Relatar no resumo final**: quantos testes passam, quais testes novos foram criados e se
   algum teste antigo precisou mudar (e por quê).

## Observações

- Não substitui o teste manual de UI: o usuário continua testando a interface no browser — os
  testes unitários cobrem lógica, não aparência.
- Se escrever um teste revelar um bug **fora do escopo** da tarefa, não corrigir sem pedir:
  deixar o teste com `it.skip(...)` e um comentário explicando o bug, e avisar o usuário.
- Tabelas que são cópia do backend (`dungeon-companion-api/src/services/character-sheet/`) têm
  testes nos dois repositórios com os mesmos valores — ao mudar um lado, atualizar o outro e os
  testes de ambos.
- Documentação completa da suíte: `~/projects/docs/dungeon-companion/conceitos/testes.md` (atualizar a
  seção de cobertura quando adicionar uma área nova de testes).
