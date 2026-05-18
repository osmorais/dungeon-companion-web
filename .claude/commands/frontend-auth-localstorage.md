# Instruções de Implementação: Frontend (Angular 20.x)

Implementar a interface e lógica de autenticação utilizando Standalone Components, Signals e Reactive Forms.

## 1. Core e Infraestrutura
- **AuthService (`auth.service.ts`):**
    - Utilizar `inject(HttpClient)`.
    - Criar um `currentUser = signal<User | null>(null)`.
    - Métodos: `login(creds)`, `signup(user)`, `forgotPassword(email)`, `resetPassword(data)`.
    - Gerenciar `localStorage` para persistência do token.
- **AuthInterceptor (`auth.interceptor.ts`):**
    - Interceptor funcional para injetar o header `Authorization: Bearer <token>` em requisições para a API.
- **AuthGuard (`auth.guard.ts`):**
    - Proteger rotas privadas, redirecionando para `/login` se o Signal de usuário estiver nulo.

## 2. Componentes de Interface (HTML + SCSS + TS)

### A. Login (`/login`)
- Formulário Reativo: `email`, `password`.
- Botão de submit com estado de "carregando" (Signals).
- Link para "Criar Conta" e "Esqueci minha senha".

### B. Cadastro (`/signup`)
- Formulário Reativo: `full_name`, `email`, `password`, `confirmPassword`.
- Validador customizado para comparar `password` e `confirmPassword`.
- Feedback visual para requisitos de senha forte.

### C. Recuperação de Conta (`/forgot-password`)
- Campo único de `email`.
- Tela de sucesso informando que o link de recuperação foi enviado para o e-mail informado.

### D. Nova Senha (`/reset-password`)
- Capturar o parâmetro `token` da QueryString via `ActivatedRoute`.
- Campos: `newPassword`, `confirmPassword`.
- Ao salvar, enviar token + senha para o backend e redirecionar para o login após sucesso.

## 3. Padrões de Implementação
- Utilizar **Signals** para gerenciar erros de formulário e estados de loading.
- Seguir a arquitetura: `Component -> Service -> HttpClient -> Backend`.
- Estilização moderna com SCSS (Flexbox/Grid).
- Implementar feedbacks de erro amigáveis (ex: "E-mail ou senha inválidos").