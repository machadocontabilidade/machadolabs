# PostgreSQL local

## Bancos e configuração

O ambiente local usa Docker Compose e PostgreSQL 16 (compatível com o requisito PostgreSQL 15+). O serviço fica publicado somente em `127.0.0.1:5432` e mantém os dados no volume nomeado `machado_labs_pgdata`.

- Desenvolvimento: `machado_labs_dev`, acessado por `DATABASE_URL`.
- Testes: `machado_labs_test`, acessado por `TEST_DATABASE_URL`.

Copie `apps/api/.env.example` para `apps/api/.env`. Os valores de usuário e senha do exemplo são apenas credenciais demonstrativas locais; não são credenciais de produção. Se definir `POSTGRES_PASSWORD` no ambiente antes do Compose, use o mesmo valor nas duas URLs. Nunca conecte estas variáveis a um banco de produção.

## Inicialização e migrations

Na raiz do repositório:

```powershell
docker compose up -d db
docker compose ps
Copy-Item apps/api/.env.example apps/api/.env
npm run migrate --workspace @machado-labs/api
```

O script `database/init/01-create-test-db.sql` cria o banco de testes somente se ele ainda não existir. Ele não remove bancos nem dados. Scripts de inicialização do PostgreSQL são executados quando o volume de dados é inicializado; se você já tinha um volume, crie o banco de testes manualmente apenas se estiver ausente:

```powershell
docker compose exec db psql -U machado_local -d postgres -c "SELECT 'CREATE DATABASE machado_labs_test' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'machado_labs_test')\gexec"
```

O runner de migrations aplica `database/migrations/*.sql` em ordem, registra versões em `schema_migrations` e usa transação e advisory lock. Use `npm run migrate --workspace @machado-labs/api` somente com `DATABASE_URL` de desenvolvimento.

## Regra única para o banco de testes

`TEST_DATABASE_URL` precisa usar host local (`localhost`, `127.0.0.1` ou `::1`) e um nome de banco que termine exatamente com `_test` (por exemplo, `machado_labs_test`). A suíte de integração valida essas condições antes de limpar tabelas de domínio. A regra coincide com `apps/api/test/integration.test.ts`; a redação anterior “nome contendo `test`” era menos restritiva e foi substituída por esta regra única.

A suíte pode ser executada com `npm test` depois da validação do ambiente; ela carrega `TEST_DATABASE_URL` de `apps/api/.env`. Não execute testes destrutivos nem use o banco de desenvolvimento como banco de testes.
