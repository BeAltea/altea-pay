/**
 * Camada única de abstração de banco (Contrato D — roadmap-v1).
 *
 * `DATABASE_TARGET` seleciona o destino do banco sem reescrever o acesso a dados:
 *   - `supabase`       (default de PRODUÇÃO): comportamento idêntico ao atual.
 *   - `local-postgres` (deploy local desta fase): Supabase **self-hosted** local
 *                       (Postgres + Auth + Storage). Preserva Auth/RLS/Storage e
 *                       mantém o MESMO `@supabase/supabase-js`. Ver
 *                       `docs/db-local-strategy.md`.
 *   - `aurora` / `cloudsql`: adapters esqueleto (Azure/GCP), NÃO ativados.
 *
 * Regras Supabase preservadas no resto do código (Contrato D, não-negociáveis):
 *   escritas via service-role; `.select()` encadeado após update/insert;
 *   `.range(0, 99999)` para passar do cap de 1000; `company_id`/`id_company`
 *   derivado server-side; `VMAX` isolada por `id_company`, coluna `"CPF/CNPJ"`;
 *   CPF/CNPJ digits-only antes de comparar.
 *
 * Os clientes Supabase canônicos (`lib/supabase/server.ts`, `admin.ts`) resolvem
 * URL/keys por AQUI. Em `local-postgres`, usa as vars `LOCAL_SUPABASE_*` se
 * definidas; senão cai nas vars padrão (basta apontá-las ao stack local).
 */

export type DatabaseTarget = "supabase" | "local-postgres" | "aurora" | "cloudsql";

export const DATABASE_TARGETS: readonly DatabaseTarget[] = [
  "supabase",
  "local-postgres",
  "aurora",
  "cloudsql",
];

export function getDatabaseTarget(): DatabaseTarget {
  const raw = (process.env.DATABASE_TARGET ?? "supabase").toLowerCase();
  return (DATABASE_TARGETS as readonly string[]).includes(raw)
    ? (raw as DatabaseTarget)
    : "supabase";
}

/** Lê a primeira env presente; lança erro claro se nenhuma existir. */
function firstEnv(label: string, ...names: string[]): string {
  for (const n of names) {
    const v = process.env[n];
    if (v) return v;
  }
  throw new Error(
    `[db/target] variável de ambiente ausente para ${label} (tentou: ${names.join(", ")})`,
  );
}

export function resolveSupabaseUrl(): string {
  if (getDatabaseTarget() === "local-postgres") {
    return firstEnv("URL Supabase (local)", "LOCAL_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  }
  return firstEnv("URL Supabase", "NEXT_PUBLIC_SUPABASE_URL");
}

export function resolveSupabaseAnonKey(): string {
  if (getDatabaseTarget() === "local-postgres") {
    return firstEnv("anon key (local)", "LOCAL_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return firstEnv("anon key", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function resolveSupabaseServiceRoleKey(): string {
  if (getDatabaseTarget() === "local-postgres") {
    return firstEnv(
      "service-role key (local)",
      "LOCAL_SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return firstEnv("service-role key", "SUPABASE_SERVICE_ROLE_KEY");
}
