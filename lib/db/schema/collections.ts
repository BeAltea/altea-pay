import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  integer,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core"
import { companies } from "./companies"
import { customers } from "./customers"

export const collectionRules = pgTable("collection_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  triggerType: varchar("trigger_type", { length: 50 }),
  triggerDays: integer("trigger_days"),
  channel: varchar("channel", { length: 30 }),
  messageTemplate: text("message_template"),
  isActive: boolean("is_active").default(true),
  priority: integer("priority"),
  conditions: jsonb("conditions"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
})

export const collectionRuleSteps = pgTable("collection_rule_steps", {
  id: uuid("id").defaultRandom().primaryKey(),
  ruleId: uuid("rule_id")
    .notNull()
    .references(() => collectionRules.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull(),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  channel: varchar("channel", { length: 30 }),
  delayDays: integer("delay_days").default(0),
  messageTemplate: text("message_template"),
  conditions: jsonb("conditions"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})

export const collectionRuleExecutions = pgTable("collection_rule_executions", {
  id: uuid("id").defaultRandom().primaryKey(),
  ruleId: uuid("rule_id").references(() => collectionRules.id),
  companyId: uuid("company_id").references(() => companies.id),
  customerId: uuid("customer_id"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  result: jsonb("result"),
  executedAt: timestamp("executed_at", { mode: "date" }),
  completedAt: timestamp("completed_at", { mode: "date" }),
  error: text("error"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})

export const collectionActions = pgTable("collection_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id").references(() => customers.id),
  companyId: uuid("company_id").references(() => companies.id),
  actionType: varchar("action_type", { length: 50 }),
  channel: varchar("channel", { length: 30 }),
  status: varchar("status", { length: 30 }).default("pending"),
  message: text("message"),
  result: jsonb("result"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})

export const collectionTasks = pgTable("collection_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  customerId: uuid("customer_id"),
  ruleId: uuid("rule_id").references(() => collectionRules.id),
  stepId: uuid("step_id").references(() => collectionRuleSteps.id),
  taskType: varchar("task_type", { length: 50 }),
  channel: varchar("channel", { length: 30 }),
  status: varchar("status", { length: 30 }).default("pending"),
  scheduledFor: timestamp("scheduled_for", { mode: "date" }),
  executedAt: timestamp("executed_at", { mode: "date" }),
  result: jsonb("result"),
  error: text("error"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})
