# Regra: versão do sistema e notas de versão a cada implementação

Vale para toda implementação, correção de bug ou mudança de comportamento — **nos dois
repositórios** (api e web). O sistema tem **uma versão só**, no formato `A.B.C`, e cada versão
publicada tem uma entrada nas notas de versão, exibidas na página pública `/novidades`.

## O número

| Parte | Quando sobe | O que zera |
|---|---|---|
| **A** | Mudança grande do sistema (reformulação, quebra de compatibilidade, marco). **Só quando o usuário decidir** — nunca subir A por conta própria; propor e perguntar. | B e C voltam a 0 |
| **B** | Cada **funcionalidade nova** (algo que o jogador/mestre não conseguia fazer antes: tela nova, mecânica nova, fluxo novo). | C volta a 0 |
| **C** | Cada **correção de bug** ou **funcionalidade pequena** (ajuste de regra, texto, visual, validação, melhoria num fluxo que já existia). | — |

- Uma entrega (o que vai num commit/push pedido pelo usuário) gera **uma** versão. Se a entrega
  junta várias coisas, a versão sobe pela maior delas (funcionalidade nova + correção = sobe B) e
  todas entram na mesma nota.
- Cada versão fica a exatamente um passo da anterior: 1.4.2 → 1.4.3, 1.5.0 ou 2.0.0. Nunca pular
  número nem subir dois de uma vez.
- Mudança só interna, sem efeito pra quem usa (refatoração, testes, docs, regras em `.claude`),
  **não** gera versão. Na dúvida, perguntar ao usuário.

## Onde registrar

1. `src/app/release-notes/release-notes.ts` (neste repositório, mesmo quando a mudança é só na
   api): nova entrada **no topo** de `RELEASES`, com:
   - `version`: o número novo;
   - `date`: a data da publicação (`AAAA-MM-DD`, o dia em que vai pro ar);
   - `title`: uma frase curta com o destaque da versão;
   - `changes`: um item por mudança, `kind` `novidade` | `melhoria` | `correcao`.
2. `version` do `package.json` (e o topo do `package-lock.json`) **nos dois repositórios** igual
   à versão nova.

## Como escrever as notas

- Para o jogador e o mestre: português simples, sem nome de arquivo, endpoint, tabela ou termo
  técnico. Diga o que mudou na experiência ("A ficha agora mostra…"), não como foi feito.
- Correção de segurança: descrever de forma genérica ("Ajustes de segurança em …"), sem detalhe
  que ajude a explorar a falha.
- Nunca citar usuários, personagens, sessões ou qualquer dado pessoal.

## Validação (a cada implementação, antes de dizer que está pronto ou de commitar)

1. Classificar a mudança (A, B, C ou sem versão) e conferir com a tabela acima. Se a
   classificação não for óbvia, perguntar ao usuário antes de gravar.
2. `npm run test:run` — `release-notes.spec.ts` confere o formato A.B.C, o passo único entre
   versões, a ordem das datas, o `package.json` e a página. Conferir à mão o `package.json` da
   api (os testes não enxergam o outro repositório).
3. Revisar a última entrada: a versão bate com o que foi feito? O texto está compreensível pra
   quem não é programador?

## No resumo final

Incluir uma linha **Versão**: o número novo e o tipo (ex.: "1.3.0 — funcionalidade nova"), ou
"sem versão" com o motivo (mudança interna).
