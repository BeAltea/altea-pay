import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  numeric,
  jsonb,
  integer,
} from "drizzle-orm/pg-core"
import { companies } from "./companies"

export const creditProfiles = pgTable("credit_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  customerId: uuid("customer_id"),
  cpf: text("cpf"),
  name: text("name"),
  score: numeric("score"),
  riskLevel: varchar("risk_level", { length: 20 }),
  data: jsonb("data"),
  provider: varchar("provider", { length: 30 }),
  analysisType: varchar("analysis_type", { length: 50 }),
  status: varchar("status", { length: 30 }).default("completed"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
})

export const analysisTriggers = pgTable("analysis_triggers", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  customerId: uuid("customer_id"),
  triggerType: varchar("trigger_type", { length: 50 }),
  triggerSource: varchar("trigger_source", { length: 50 }),
  status: varchar("status", { length: 30 }).default("pending"),
  cpf: text("cpf"),
  analysisId: uuid("analysis_id"),
  result: jsonb("result"),
  error: text("error"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
})

export const analysisLogs = pgTable("analysis_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  customerId: uuid("customer_id"),
  analysisType: varchar("analysis_type", { length: 50 }),
  provider: varchar("provider", { length: 30 }),
  status: varchar("status", { length: 30 }),
  requestData: jsonb("request_data"),
  responseData: jsonb("response_data"),
  error: text("error"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})
