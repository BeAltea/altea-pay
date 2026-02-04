import { pgTable, uuid, text, timestamp, varchar } from "drizzle-orm/pg-core"

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  cnpj: text("cnpj"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipcode: text("zipcode"),
  zipCode: text("zip_code"),
  sector: text("sector"),
  customerTableName: text("customer_table_name"),
  logoUrl: text("logo_url"),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
})
