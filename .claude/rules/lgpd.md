# Regra: verificação de LGPD a cada nova implementação

Vale para toda implementação nova, correção de bug ou mudança de comportamento neste repositório.
O sistema é público e trata dados pessoais. A Política de Privacidade e os Termos de Uso (páginas
`/privacidade` e `/termos`, que moram **neste** repositório) prometem coisas que o código
precisa cumprir. Histórico e status completos: `~/projects/docs/dungeon-companion-lgpd.md`.
Plano de incidente: `~/projects/docs/dungeon-companion-incidente.md`.

## Ao planejar e ao terminar a implementação (junto com a regra de testes)

Percorrer o checklist abaixo. Para cada ponto que se aplicar, tratar no próprio código **ou**
avisar o usuário antes de concluir.

1. **Coleta nova?** Campo de formulário, upload ou texto livre que possa identificar uma pessoa:
   e-mail, nome real, foto.
   - Pedir só o necessário. Campo opcional sempre que der.
   - Campo de nome que fica visível para a mesa recebe o aviso
     `<p class="name-privacy-hint">Prefira um apelido: este nome aparece para todos da mesa.</p>`
     (classe global em `styles.scss`).
   - Upload de imagem: lembrar que a URL é pública (já dito na política). Imagem de pessoa real
     exige autorização dela (já dito nos termos).
2. **O que cada usuário vê?** Tela nova não pode mostrar dado de outro usuário além do que o
   backend já restringe. Exemplo: jogador só vê monstro revelado. Se a tela precisar de dado que
   hoje é só do mestre, a mudança é no backend, com checagem de permissão, não aqui.
3. **Terceiro novo carregado pelo navegador?** Script, fonte, CDN, iframe, imagem externa,
   analytics, pixel, mapa, vídeo embutido.
   - Evitar: a fonte é servida pelo próprio site (`@fontsource`, em `angular.json`) e o script
     do Google só carrega no login/cadastro (`GoogleIdentityService`). Nada de recurso externo
     no `index.html` ou no `styles.scss`.
   - Se for inevitável, atualizar as seções 4 e 5 da Política.
   - **Analytics, pixel ou qualquer cookie não essencial exige banner de consentimento antes de
     carregar.** Hoje não existe banner porque só há o cookie de autenticação.
4. **Armazenamento no navegador.** `localStorage`, `sessionStorage` ou cookie novo com dado
   pessoal ou de rastreamento precisa de justificativa e entra na seção 6 da Política. Hoje só
   existe o token de autenticação (`AUTH_TOKEN_KEY`).
5. **Direitos do titular continuam funcionando?** Dado novo do usuário precisa aparecer na
   exportação e sumir na exclusão (página `/conta`, lógica no backend). Se a funcionalidade nova
   cria dado que o usuário deveria poder corrigir, avaliar edição na própria tela ou em `/conta`.
6. **Segurança.**
   - Telas logadas usam `authGuard`. Só login, cadastro, senha, as páginas legais e
     `/novidades` (notas de versão, sem dado de usuário) são públicas.
   - Mensagens de erro da API via `apiErrorMessage` (`auth/auth-errors.ts`).
   - Senha nova via `newPasswordError` (mínimo `PASSWORD_MIN_LENGTH`, igual ao backend).
   - Não logar dado pessoal no console.
7. **Política de Privacidade / Termos de Uso precisam mudar?** Se a mudança (aqui ou na API)
   altera o que é coletado, para quê, com quem é compartilhado, por quanto tempo, o que o usuário
   pode fazer, ou regras de uso:
   - atualizar `src/app/legal/legal-page.component.html`;
   - atualizar `LEGAL_LAST_UPDATED` em `src/app/legal/legal-info.ts`;
   - avisar o usuário. Mudança relevante deve ser comunicada aos usuários (o texto promete) e o
     texto final passa por revisão jurídica.
   Mudança de idade mínima, controlador ou e-mail de contato é só em `legal-info.ts`.

## Ao achar uma falha existente

Se a análise revelar exposição de dados que já está em produção:
- **não** corrigir em silêncio: avisar o usuário com a gravidade;
- propor a correção;
- seguir `dungeon-companion-incidente.md` (avaliar risco e registrar na tabela de incidentes).

## No resumo final

Incluir uma linha **LGPD**:
- "sem impacto" (dizendo por quê, em meia frase); ou
- os pontos do checklist que se aplicaram e o que foi feito, e se a Política ou os Termos
  precisam ser (ou foram) atualizados.

Atualizar `~/projects/docs/dungeon-companion-lgpd.md` quando houver mudança relevante.
