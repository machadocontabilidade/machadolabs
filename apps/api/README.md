# API Machado Labs

Node.js + TypeScript + Express 5. Módulos em `src/modules` isolam Auth, Users, Sessions, Tools e Permissions; cada módulo contém rotas e serviços/repositórios de domínio, com middleware e validação compartilhados.

## Desenvolvimento local

1. Na raiz, instale dependências com `npm install` e inicie PostgreSQL com `docker compose up -d db`.
2. Copie `apps/api/.env.example` para `apps/api/.env`. O arquivo configura `DATABASE_URL` para `machado_labs_dev` e `TEST_DATABASE_URL` para `machado_labs_test`; use somente os bancos locais. Ajuste as URLs se mudar a senha local no Compose.
3. Rode `npm run migrate --workspace @machado-labs/api` para migrar o banco de desenvolvimento.
4. Em terminais separados, execute `npm run dev:api` e `npm run dev`.

Não execute `init-owner` ainda. Aguarde a validação do ambiente antes de inicializar um OWNER. O comando exige que a tabela `users` esteja vazia; nome, e-mail e senha são informados no terminal. Não existe endpoint público de bootstrap nem senha padrão.

O middleware limita tentativas de login com contador persistido em PostgreSQL. Em produção, CORS e a validação de origem aceitam somente `https://machadolabs.vercel.app`, com credenciais; em desenvolvimento, usam `WEB_ORIGIN`. Cookies `ml_session` e `ml_csrf` são HttpOnly. Em produção usam SameSite=None e Secure; localmente continuam SameSite=Lax e sem Secure. Toda mutação continua exigindo `X-CSRF-Token` igual ao cookie `ml_csrf`, além da validação do hash CSRF armazenado na sessão.

O Render termina HTTPS no proxy reverso. A API confia em um salto de proxy apenas em produção (`trust proxy=1`), para que Express reconheça corretamente HTTPS e `req.ip`; em desenvolvimento essa confiança fica desativada. Cookies `SameSite=None; Secure` permitem o envio cross-site entre Vercel e Render, mas navegadores ou configurações que bloqueiam cookies de terceiros ainda podem impedir a sessão. Nesse caso, será necessário servir frontend e API sob o mesmo site (por exemplo, API em subdomínio/domínio próprio apropriado ou proxy/BFF same-site); o código CSRF e CORS não deve ser enfraquecido para contornar o bloqueio.

## Variáveis

`NODE_ENV`, `API_PORT`, `DATABASE_URL`, `TEST_DATABASE_URL`, `WEB_ORIGIN`, `SESSION_TTL_HOURS`, `SESSION_ROTATE_MINUTES`, `RATE_LIMIT_WINDOW_SECONDS`, `RATE_LIMIT_MAX_ATTEMPTS`. Consulte `.env.example`; ele contém apenas valores locais demonstrativos.

## Regra do banco de testes

`TEST_DATABASE_URL` deve apontar para host local (`localhost`, `127.0.0.1` ou `::1`) e para um banco cujo nome termine exatamente em `_test`. O teste valida host e sufixo antes de limpar tabelas de domínio. Não use o banco de desenvolvimento como alvo dos testes.

## Rotas

- `GET /api/health`
- `GET /api/auth/csrf`, `POST /api/auth/login`, `GET /api/auth/session`, `POST /api/auth/rotate`, `POST /api/auth/logout`
- `GET /api/users/me`, `GET /api/users?q=`, `POST /api/users`, `PATCH /api/users/:id`, `PATCH /api/users/:id/status`
- `GET /api/dashboard`, `GET /api/dashboard/admin` (OWNER/ADMIN)
- `GET /api/categories`, `POST /api/categories`, `PUT /api/categories/:name`, `DELETE /api/categories/:name` (mutations require OWNER/ADMIN; used categories cannot be removed)
- `GET /api/tools?q=&category=&status=`, `GET /api/tools/:id`, `POST /api/tools`, `PUT /api/tools/:id`, `GET|PUT /api/tools/:id/permissions` (OWNER only)

Migrations `002_admin_management.sql` and `003_tool_development_status.sql` add managed categories, responsible users, and the `development` tool status while preserving existing `maintenance` values. Administrative dashboard activity is derived from `security_events`; passwords and session secrets are never included.
