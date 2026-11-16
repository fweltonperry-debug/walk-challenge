import { pgTable, serial, varchar, integer, decimal, timestamp, boolean, text, jsonb, date } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  cashTag: varchar("cash_tag", { length: 50 }).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  birthDate: date("birth_date"),
  agreedTermsAt: timestamp("agreed_terms_at"),
  totalSteps: integer("total_steps").default(0).notNull(),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pools = pgTable("pools", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 20 }).notNull(), // daily, weekly, monthly, yearly
  title: varchar("title", { length: 100 }).notNull(),
  entryFee: decimal("entry_fee", { precision: 10, scale: 2 }).notNull(),
  maxParticipants: integer("max_participants").default(35).notNull(),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  status: varchar("status", { length: 20 }).default("open").notNull(), // open, live, closed, paid
  houseCutPercent: integer("house_cut_percent").default(10).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  poolId: integer("pool_id").notNull().references(() => pools.id),
  userId: integer("user_id").notNull().references(() => users.id),
  cashAppTxId: varchar("cash_app_tx_id", { length: 100 }),
  paymentStatus: varchar("payment_status", { length: 20 }).default("pending").notNull(), // pending, verified, rejected
  steps: integer("steps").default(0).notNull(),
  manualStepsBlocked: integer("manual_steps_blocked").default(0).notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  syncSource: varchar("sync_source", { length: 30 }),
  flagged: boolean("flagged").default(false).notNull(),
  flagReason: text("flag_reason"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const stepLogs = pgTable("step_logs", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull().references(() => entries.id),
  userId: integer("user_id").notNull().references(() => users.id),
  steps: integer("steps").notNull(),
  source: varchar("source", { length: 20 }).default("manual").notNull(),
  verified: boolean("verified").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  poolId: integer("pool_id").notNull().references(() => pools.id),
  userId: integer("user_id").notNull().references(() => users.id),
  entryId: integer("entry_id").notNull().references(() => entries.id),
  place: integer("place").notNull(), // 1,2,3
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  cashTag: varchar("cash_tag", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).default("queued").notNull(), // queued, processing, paid, failed
  cashAppTxId: varchar("cash_app_tx_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  paidAt: timestamp("paid_at"),
});

export const botLogs = pgTable("bot_logs", {
  id: serial("id").primaryKey(),
  level: varchar("level", { length: 20 }).default("info").notNull(),
  message: text("message").notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 50 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
