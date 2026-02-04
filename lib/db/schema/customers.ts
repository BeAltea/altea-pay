import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  numeric,
  boolean,
  jsonb,
  integer,
} from "drizzle-orm/pg-core"
import { companies } from "./companies"

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  document: text("document"),
  documentType: varchar("document_type", { length: 10 }),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  externalId: text("external_id"),
  sourceSystem: text("source_system"),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
})

export const vmax = pgTable("VMAX", {
  id: uuid("id").defaultRandom().primaryKey(),
  idCompany: uuid("id_company").references(() => companies.id),
  cliente: text("Cliente"),
  cpfCnpj: text("CPF/CNPJ"),
  cidade: text("Cidade"),
  primeiraVencida: text("Primeira_Vencida"),
  valorTotal: text("Valor_Total"),
  quantidadeTitulos: text("Quantidade_Titulos"),
  maiorAtraso: text("Maior_Atraso"),
  creditScore: numeric("credit_score"),
  riskLevel: text("risk_level"),
  approvalStatus: text("approval_status").default("PENDENTE"),
  autoCollectionEnabled: boolean("auto_collection_enabled").default(false),
  analysisMetadata: jsonb("analysis_metadata"),
  lastAnalysisDate: timestamp("last_analysis_date", { mode: "date" }),
  collectionProcessedAt: timestamp("collection_processed_at", { mode: "date" }),
  lastCollectionAttempt: timestamp("last_collection_attempt", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
})
