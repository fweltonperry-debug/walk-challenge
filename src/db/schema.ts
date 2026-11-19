import {
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  cashtag: text("cashtag").notNull().unique(),
  displayName: text("display_name").notNull(),
  pinHash: text("pin_hash").notNull(),
  // Required for the 18+ eligibility check at signup.
  dateOfBirth: date("date_of_birth", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A room is one 35-seat competition for a tier (daily / weekly / monthly / yearly).
// status: filling -> active (all seats paid, clock starts) -> completed (winners paid out)
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  tier: text("tier").notNull(),
  feeCents: integer("fee_cents").notNull(),
  durationDays: integer("duration_days").notNull(),
  capacity: integer("capacity").notNull().default(35),
  status: text("status").notNull().default("filling"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  poolCents: integer("pool_cents").notNull().default(0),
  prizePoolCents: integer("prize_pool_cents").notNull().default(0),
  platformCents: integer("platform_cents").notNull().default(0),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A seat in a room. status: awaiting_payment -> payment_claimed -> paid (or refunded/cancelled)
export const entries = pgTable(
  "entries",
  {
    id: serial("id").primaryKey(),
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    paymentCode: text("payment_code").notNull().unique(),
    amountCents: integer("amount_cents").notNull(),
    status: text("status").notNull().default("awaiting_payment"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("entries_room_user_idx").on(t.roomId, t.userId)],
);

// One row per entry per calendar day (UTC). Re-submitting the same day overwrites it.
export const stepLogs = pgTable(
  "step_logs",
  {
    id: serial("id").primaryKey(),
    entryId: integer("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    logDate: date("log_date", { mode: "string" }).notNull(),
    steps: integer("steps").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("step_logs_entry_date_idx").on(t.entryId, t.logDate)],
);

// Prize payouts owed to winners. status: pending -> sent -> paid (or failed)
export const payouts = pgTable(
  "payouts",
  {
    id: serial("id").primaryKey(),
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    entryId: integer("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    place: integer("place").notNull(),
    amountCents: integer("amount_cents").notNull(),
    cashtag: text("cashtag").notNull(),
    status: text("status").notNull().default("pending"),
    providerRef: text("provider_ref"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("payouts_room_place_idx").on(t.roomId, t.place)],
);
