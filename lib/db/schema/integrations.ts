import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  jsonb,
  boolean,
  integer,
} from "drizzle-orm/pg-core"
import { companies } from "./companies"

export const erpIntegrations = pgTable("erp_integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  erpType: varchar("erp_type", { length: 50 }).notNull(),
  name: text("name"),
  config: jsonb("config"),
  credentials: jsonb("credentials"),
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at", { mode: "date" }),
  status: varchar("status", { length: 30 }).default("active"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
})

export const integrationLogs = pgTable("integration_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  integrationId: uuid("integration_id").references(() => erpIntegrations.id),
  companyId: uuid("company_id").references(() => companies.id),
  action: varchar("action", { length: 50 }),
  status: varchar("status", { length: 30 }),
  recordsProcessed: integer("records_processed"),
  recordsFailed: integer("records_failed"),
  details: jsonb("details"),
  error: text("error"),
  metadata: jsonb("metadata"),
  startedAt: timestamp("started_at", { mode: "date" }),
  completedAt: timestamp("completed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})

export const erpIntegrationLogs = pgTable("erp_integration_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  integrationId: uuid("integration_id").references(() => erpIntegrations.id),
  companyId: uuid("company_id").references(() => companies.id),
  action: varchar("action", { length: 50 }),
  status: varchar("status", { length: 30 }),
  details: jsonb("details"),
  error: text("error"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})

export const dataImports = pgTable("data_imports", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  importType: varchar("import_type", { length: 50 }),
  fileName: text("file_name"),
  status: varchar("status", { length: 30 }).default("pending"),
  totalRecords: integer("total_records"),
  processedRecords: integer("processed_records"),
  failedRecords: integer("failed_records"),
  errors: jsonb("errors"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { mode: "date" }),
})
