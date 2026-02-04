import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core"
import { companies } from "./companies"

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  userId: uuid("user_id"),
  customerId: uuid("customer_id"),
  title: text("title"),
  message: text("message"),
  type: varchar("type", { length: 50 }),
  channel: varchar("channel", { length: 30 }),
  status: varchar("status", { length: 30 }).default("unread"),
  isRead: boolean("is_read").default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  readAt: timestamp("read_at", { mode: "date" }),
})

export const securityEvents = pgTable("security_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  userId: uuid("user_id"),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  action: varchar("action", { length: 100 }),
  resource: varchar("resource", { length: 100 }),
  resourceId: text("resource_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  details: jsonb("details"),
  severity: varchar("severity", { length: 20 }).default("info"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  customerId: uuid("customer_id"),
  channel: varchar("channel", { length: 30 }),
  direction: varchar("direction", { length: 10 }),
  content: text("content"),
  status: varchar("status", { length: 30 }).default("sent"),
  externalId: text("external_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})
