# Arquitetura Machado Labs

## Aplicação

Monorepo npm com três espaços: `apps/web` contém o shell React/TypeScript/Vite e mantém a identidade visual existente; `apps/api` contém a API Express/TypeScript; `packages/contracts` contém os tipos públicos compartilhados. A interface não embute catálogo de demonstração.

A API divide Auth, Users, Sessions, Tools e Permissions. Rotas ligam controladores; validações Zod, serviços de domínio e repositórios isolam entradas, regras e SQL. Middlewares aplicam sessão, autorização, origem, CSRF e tratamento de erro.

## Dados

Migrations SQL versionadas criam users, sessions, tools, categories, permissions, user_permissions, security_events e rate_limits. Categorias são referenciadas por ferramentas com exclusão restrita; responsáveis apontam para usuários e viram nulos quando a conta é removida. As sessões guardam SHA-256 do segredo aleatório e CSRF, nunca o token original. Rate limits sobrevivem a reinícios; eventos registram sucessos e falhas de login, logout, provisionamento inicial e alterações administrativas, sem segredos.

## Segurança e operação

- Senhas são armazenadas com Argon2id.
- Cookies de sessão e CSRF são HttpOnly; usam SameSite=None e Secure em produção para permitir credenciais cross-site entre Vercel e Render, e SameSite=Lax sem Secure em desenvolvimento. Bloqueios de cookies de terceiros no navegador ainda podem impedir a autenticação; nesse caso, frontend e API precisam compartilhar um site via domínio ou proxy/BFF.
- Mutação exige origem configurada e token CSRF ligado à sessão.
- OWNER, ADMIN e USER são autorizados no servidor. ADMIN gerencia usuários USER, ferramentas e categorias; OWNER também administra contas ADMIN e permissões por ferramenta. Acesso USER é filtrado por ferramenta no servidor.
- O primeiro OWNER só pode ser criado pelo comando local quando não há usuários.
- O catálogo lê filtros, status e detalhes do PostgreSQL.
- Não há recuperação de senha, MFA ou deploy nesta etapa; esses fluxos dependem de decisões operacionais e não foram simulados.

## Verificação

Typecheck, build e testes estão nos scripts da raiz. Os testes de integração precisam de um PostgreSQL local descartável `TEST_DATABASE_URL` cujo banco termine com `_test`; eles limpam as tabelas da suíte antes e depois de rodar. Sem essa variável, a suíte informa que foi ignorada e não prova os fluxos de banco.
