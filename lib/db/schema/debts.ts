import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  numeric,
  jsonb,
  date,
  integer,
} from "drizzle-orm/pg-core"
import { companies } from "./companies"
import { customers } from "./customers"

export const debts = pgTable("debts", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  amount: numeric("amount").notNull(),
  originalAmount: numeric("original_amount"),
  dueDate: date("due_date"),
  description: text("description"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  classification: varchar("classification", { length: 20 }),
  source: varchar("source", { length: 30 }),
  externalId: text("external_id"),
  installments: integer("installments"),
  paidAmount: numeric("paid_amount"),
  paidAt: timestamp("paid_at", { mode: "date" }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
})

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  debtId: uuid("debt_id").references(() => debts.id),
  customerId: uuid("customer_id").references(() => customers.id),
  amount: numeric("amount").notNull(),
  method: varchar("method", { length: 30 }),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  externalId: text("external_id"),
  paymentProvider: varchar("payment_provider", { length: 30 }),
  paidAt: timestamp("paid_at", { mode: "date" }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
})

export const agreements = pgTable("agreements", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  debtId: uuid("debt_id").references(() => debts.id),
  customerId: uuid("customer_id").references(() => customers.id),
  originalAmount: numeric("original_amount"),
  negotiatedAmount: numeric("negotiated_amount"),
  discountPercentage: numeric("discount_percentage"),
  installments: integer("installments"),
  installmentAmount: numeric("installment_amount"),
  paymentMethod: varchar("payment_method", { length: 30 }),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  externalId: text("external_id"),
  paymentProvider: varchar("payment_provider", { length: 30 }),
  paymentLink: text("payment_link"),
  invoiceUrl: text("invoice_url"),
  dueDate: date("due_date"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
})

export const negotiations = pgTable("negotiations", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  debtId: uuid("debt_id").references(() => debts.id),
  customerId: uuid("customer_id").references(() => customers.id),
  originalAmount: numeric("original_amount"),
  proposedAmount: numeric("proposed_amount"),
  discountPercentage: numeric("discount_percentage"),
  installments: integer("installments"),
  paymentMethod: varchar("payment_method", { length: 30 }),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
})
