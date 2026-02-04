import { relations } from "drizzle-orm"
import { users, accounts, sessions, profiles, passwordResetTokens } from "./auth"
import { companies } from "./companies"
import { customers, vmax } from "./customers"
import { debts, payments, agreements, negotiations } from "./debts"
import {
  collectionRules,
  collectionRuleSteps,
  collectionRuleExecutions,
  collectionActions,
  collectionTasks,
} from "./collections"
import { creditProfiles, analysisTriggers } from "./credit"
import { erpIntegrations, integrationLogs, erpIntegrationLogs, dataImports } from "./integrations"
import { notifications, securityEvents } from "./notifications"

// Users relations
export const usersRelations = relations(users, ({ one, many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.id],
  }),
  passwordResetTokens: many(passwordResetTokens),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}))

// Profiles relations
export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.id],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [profiles.companyId],
    references: [companies.id],
  }),
}))

// Companies relations
export const companiesRelations = relations(companies, ({ many }) => ({
  profiles: many(profiles),
  customers: many(customers),
  debts: many(debts),
  collectionRules: many(collectionRules),
  erpIntegrations: many(erpIntegrations),
  notifications: many(notifications),
}))

// Customers relations
export const customersRelations = relations(customers, ({ one, many }) => ({
  company: one(companies, {
    fields: [customers.companyId],
    references: [companies.id],
  }),
  debts: many(debts),
  payments: many(payments),
  agreements: many(agreements),
  collectionActions: many(collectionActions),
}))

// VMAX relations
export const vmaxRelations = relations(vmax, ({ one }) => ({
  company: one(companies, {
    fields: [vmax.idCompany],
    references: [companies.id],
  }),
}))

// Debts relations
export const debtsRelations = relations(debts, ({ one, many }) => ({
  company: one(companies, {
    fields: [debts.companyId],
    references: [companies.id],
  }),
  customer: one(customers, {
    fields: [debts.customerId],
    references: [customers.id],
  }),
  payments: many(payments),
  agreements: many(agreements),
}))

// Payments relations
export const paymentsRelations = relations(payments, ({ one }) => ({
  company: one(companies, {
    fields: [payments.companyId],
    references: [companies.id],
  }),
  debt: one(debts, {
    fields: [payments.debtId],
    references: [debts.id],
  }),
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
  }),
}))

// Agreements relations
export const agreementsRelations = relations(agreements, ({ one }) => ({
  company: one(companies, {
    fields: [agreements.companyId],
    references: [companies.id],
  }),
  debt: one(debts, {
    fields: [agreements.debtId],
    references: [debts.id],
  }),
  customer: one(customers, {
    fields: [agreements.customerId],
    references: [customers.id],
  }),
}))

// Negotiations relations
export const negotiationsRelations = relations(negotiations, ({ one }) => ({
  company: one(companies, {
    fields: [negotiations.companyId],
    references: [companies.id],
  }),
  debt: one(debts, {
    fields: [negotiations.debtId],
    references: [debts.id],
  }),
  customer: one(customers, {
    fields: [negotiations.customerId],
    references: [customers.id],
  }),
}))

// Collection rules relations
export const collectionRulesRelations = relations(collectionRules, ({ one, many }) => ({
  company: one(companies, {
    fields: [collectionRules.companyId],
    references: [companies.id],
  }),
  steps: many(collectionRuleSteps),
  executions: many(collectionRuleExecutions),
}))

export const collectionRuleStepsRelations = relations(collectionRuleSteps, ({ one }) => ({
  rule: one(collectionRules, {
    fields: [collectionRuleSteps.ruleId],
    references: [collectionRules.id],
  }),
}))

export const collectionRuleExecutionsRelations = relations(collectionRuleExecutions, ({ one }) => ({
  rule: one(collectionRules, {
    fields: [collectionRuleExecutions.ruleId],
    references: [collectionRules.id],
  }),
  company: one(companies, {
    fields: [collectionRuleExecutions.companyId],
    references: [companies.id],
  }),
}))

export const collectionActionsRelations = relations(collectionActions, ({ one }) => ({
  customer: one(customers, {
    fields: [collectionActions.customerId],
    references: [customers.id],
  }),
  company: one(companies, {
    fields: [collectionActions.companyId],
    references: [companies.id],
  }),
}))

// Credit relations
export const creditProfilesRelations = relations(creditProfiles, ({ one }) => ({
  company: one(companies, {
    fields: [creditProfiles.companyId],
    references: [companies.id],
  }),
}))

export const analysisTriggersRelations = relations(analysisTriggers, ({ one }) => ({
  company: one(companies, {
    fields: [analysisTriggers.companyId],
    references: [companies.id],
  }),
}))

// ERP relations
export const erpIntegrationsRelations = relations(erpIntegrations, ({ one, many }) => ({
  company: one(companies, {
    fields: [erpIntegrations.companyId],
    references: [companies.id],
  }),
  logs: many(integrationLogs),
}))

export const integrationLogsRelations = relations(integrationLogs, ({ one }) => ({
  integration: one(erpIntegrations, {
    fields: [integrationLogs.integrationId],
    references: [erpIntegrations.id],
  }),
  company: one(companies, {
    fields: [integrationLogs.companyId],
    references: [companies.id],
  }),
}))

// Notifications relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  company: one(companies, {
    fields: [notifications.companyId],
    references: [companies.id],
  }),
}))

export const securityEventsRelations = relations(securityEvents, ({ one }) => ({
  company: one(companies, {
    fields: [securityEvents.companyId],
    references: [companies.id],
  }),
}))
