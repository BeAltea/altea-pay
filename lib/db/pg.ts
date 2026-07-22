/**
 * Adaptador SQL direto (skeleton — Contrato D). Para targets que NÃO passam pelo
 * cliente Supabase (`aurora`/`cloudsql`) ou para acesso direto ao Postgres local
 * (scripts/migrações/diagnóstico). A app em `local-postgres` continua usando o
 * cliente Supabase (self-hosted), então este pool é opcional.
 *
 * `pg` é dependência OPCIONAL: importada dinamicamente para não exigir instalação
 * enquanto os targets diretos não estão ativados. Instalar `pg` + `@types/pg`
 * para ativar `local-postgres` em modo SQL direto.
 */
import { getDatabaseTarget } from "./target";

let _pool: any = null;

export async function getPgPool(): Promise<any> {
  const target = getDatabaseTarget();

  if (target === "supabase") {
    throw new Error(
      "[db/pg] getPgPool() não se aplica ao target 'supabase' — use o cliente Supabase.",
    );
  }
  if (target === "aurora" || target === "cloudsql") {
    throw new Error(
      `[db/pg] target '${target}' é skeleton e NÃO está ativado (roadmap-v1). ` +
        `Ver docs/db-local-strategy.md e lib/db/adapters/${target}.ts.`,
    );
  }

  // local-postgres (acesso SQL direto opcional).
  if (!_pool) {
    // Especificador não-literal → tsc não exige o módulo em build (dep opcional).
    const pgModuleName = "pg";
    const pg: any = await import(pgModuleName);
    const connectionString =
      process.env.DATABASE_URL ??
      "postgres://altea:altea@postgres-app.alteapay-app.svc.cluster.local:5432/alteapay";
    _pool = new pg.Pool({ connectionString });
  }
  return _pool;
}
