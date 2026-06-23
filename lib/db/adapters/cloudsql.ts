/**
 * Adapter Cloud SQL (GCP PostgreSQL) — SKELETON, não ativado (Contrato D).
 * Evolução futura do diagrama (docs/arquitetura-roadmap-v1.mermaid). A migração
 * de Auth/Storage para fora do Supabase é decisão futura (docs/lacunas-roadmap-v1.md).
 */
export const CLOUDSQL_ADAPTER = {
  target: "cloudsql" as const,
  activated: false,
  describe() {
    return "Cloud SQL (GCP) — skeleton; conectar via lib/db/pg.ts quando ativado.";
  },
};
