# Estratégia de banco local (`DATABASE_TARGET=local-postgres`) — roadmap-v1

Decisão de como rodar a app contra um Postgres local **preservando Auth/RLS/
Storage**, sem reescrever o acesso a dados. Fonte: Contrato D
(`docs/contratos-roadmap-v1.md`) e WS-3 do prompt mestre.

## Contexto

A app usa Supabase para três coisas além do Postgres puro:
1. **Auth** (`@supabase/ssr`, JWT, cookies) — login e sessão;
2. **RLS** (políticas por `company_id`/`id_company`) — isolamento multi-tenant;
3. **Storage** (arquivos).

Postgres puro local não tem GoTrue (Auth) nem PostgREST/Storage. Há dois caminhos:

- **(A) Supabase self-hosted local** — subir o stack open-source do Supabase
  (Postgres + GoTrue + PostgREST + Storage + Kong) no cluster/host e apontar a app
  para ele. O **mesmo** `@supabase/supabase-js` funciona; Auth/RLS/Storage
  preservados; zero reescrita de queries.
- **(B) Postgres puro + shim de auth** — Postgres sozinho e um shim que emula o
  necessário de Auth. Exige reimplementar/forjar JWT e desabilitar/portar RLS;
  alto risco e divergência do comportamento de produção.

## Decisão

**Adotado o caminho (A): Supabase self-hosted local.** É o mais confiável para o
bring-up e o que melhor preserva o comportamento de produção (Auth/RLS/Storage
idênticos, mesmo cliente). O caminho (B) fica descartado por risco/divergência.

Implicações no código (já implementadas em WS-3):
- `lib/db/target.ts` resolve URL/keys por `DATABASE_TARGET`. Em `local-postgres`
  usa `LOCAL_SUPABASE_*` se definidas; senão cai nas vars padrão (basta apontá-las
  ao stack local). Em `supabase` (produção) o comportamento é idêntico ao anterior.
- `lib/supabase/server.ts` e `lib/supabase/admin.ts` resolvem por essa camada.
- `lib/db/pg.ts` + `lib/db/adapters/{aurora,cloudsql}.ts` são esqueletos de acesso
  SQL direto/futuro (não ativados).

## Componentes do deploy local

- **`StatefulSet postgres-app`** (`k8s/base/postgres-app.yaml`) — o Postgres.
- Stack Supabase self-hosted (GoTrue/PostgREST/Storage/Kong) apontando para o
  `postgres-app`. **Pendência de bring-up:** os manifests desse stack ainda não
  estão no repo; subir em WS-7 (via imagens oficiais do Supabase) ou documentar o
  uso do Supabase local fora do cluster. Registrado em
  `docs/lacunas-roadmap-v1.md`.

## Ordem de migração do schema

Aplicar no Postgres local, **nesta ordem**:
1. `scripts/*.sql` (ordem numérica: `024_…`, `025_…`, `1001_…`, etc.);
2. `supabase/migrations/*.sql` (ordem cronológica do nome).

Inclui as colunas reais ASAAS de `agreements` (`asaas_invoice_url`,
`asaas_payment_url`, `asaas_boleto_url`, `asaas_pix_qrcode_url`) e as políticas RLS.
As políticas RLS dependem de `auth.uid()`/roles do GoTrue — por isso o caminho (A).

## O que NÃO foi resolvido (vai para lacunas)

- Manifests do stack Supabase self-hosted (GoTrue/PostgREST/Storage/Kong) — WS-7.
- Migração dos factories de cliente ad-hoc nos workers
  (`lib/queue/workers/*: getSupabaseAdmin`) para `lib/db/target` — funcionam hoje
  via as vars padrão; migrar é follow-up.
- `client.ts` (browser) usa `NEXT_PUBLIC_*` inlinadas em build; trocar destino no
  browser exigiria `NEXT_PUBLIC_DATABASE_TARGET` — fora do escopo desta fase.
