# Machado Labs

Monorepo com frontend React/TypeScript/Vite, API Express/TypeScript e migrations PostgreSQL. A interface preserva a identidade visual já implementada e usa dados vindos da API; nenhum catálogo de demonstração é embutido.

## Requisitos

Node.js 20.19+, npm 10+ e Docker Desktop com Compose. O PostgreSQL local usa a imagem PostgreSQL 16; não conecte esta etapa a dados de produção.

## Inicialização local

1. Na raiz, execute `npm install`.
2. Inicie apenas o serviço PostgreSQL: `docker compose up -d db`. Aguarde `docker compose ps` mostrar o banco como healthy. O Compose cria `machado_labs_dev` e `machado_labs_test` em um volume persistente, sem substituir volumes existentes.
3. Copie `apps/api/.env.example` para `apps/api/.env`. Ele contém URLs locais demonstrativas para os dois bancos; mantenha `WEB_ORIGIN=http://localhost:5173` no desenvolvimento. Se mudar `POSTGRES_PASSWORD` no Compose, atualize as duas URLs para corresponder.
4. Execute `npm run migrate --workspace @machado-labs/api` para preparar o banco de desenvolvimento.
5. Em terminais separados, execute `npm run dev:api` e `npm run dev`.

O banco de testes é separado e somente a suíte de integração deve usá-lo. Não rode `init-owner` nesta etapa; aguarde a validação do ambiente. Nunca use senha padrão nem versione `.env`.

## Regra do banco de testes

`TEST_DATABASE_URL` deve apontar para um host local (`localhost`, `127.0.0.1` ou `::1`) e para um banco cujo nome termine exatamente em `_test`. A suíte limpa tabelas de domínio nesse banco; não use dados de produção. A regra corresponde à validação implementada em `apps/api/test/integration.test.ts`.

## Verificações

`npm run typecheck`, `npm run build` e `npm test`. A suíte HTTP de integração usa PostgreSQL real e só executa quando `TEST_DATABASE_URL` está definido.

Veja [apps/api/README.md](apps/api/README.md) para variáveis e endpoints, e [database/README.md](database/README.md) para PostgreSQL e migrations.
