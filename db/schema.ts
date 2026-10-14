import type { AdapterAccountType } from "@auth/core/adapters";
import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { EditEvent, ReceiptMetrics } from "@/lib/receipt/types";

export const pieceModeEnum = pgEnum("piece_mode", ["freewrite", "response"]);
export const pieceStatusEnum = pgEnum("piece_status", ["draft", "published"]);

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  // Auth.js adapter field; stores the writer's display name (PRD: display_name).
  name: text("display_name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
);

export const authSessions = pgTable("auth_sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

export const pieces = pgTable("pieces", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default(""),
  mode: pieceModeEnum("mode").notNull().default("freewrite"),
  sourceUrl: text("source_url"),
  sourceTitle: text("source_title"),
  sourceSite: text("source_site"),
  status: pieceStatusEnum("status").notNull().default("draft"),
  slug: text("slug").unique(),
  finalText: text("final_text"),
  finalTextHash: text("final_text_hash"),
  replayPublic: boolean("replay_public").notNull().default(false),
  /** Newest writing session that owns this piece; only its batches are accepted. */
  activeSessionId: uuid("active_session_id").references(
    (): AnyPgColumn => sessions.id,
    { onDelete: "set null" },
  ),
  publishedAt: timestamp("published_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  pieceId: uuid("piece_id")
    .notNull()
    .references(() => pieces.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { mode: "date" }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { mode: "date" }),
});

export const eventBatches = pgTable(
  "event_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    events: jsonb("events").notNull().$type<EditEvent[]>(),
    prevHash: text("prev_hash").notNull(),
    hash: text("hash").notNull(),
    clientTStart: integer("client_t_start").notNull(),
    clientTEnd: integer("client_t_end").notNull(),
    serverReceivedAt: timestamp("server_received_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    delayed: boolean("delayed").notNull().default(false),
    clockSuspect: boolean("clock_suspect").notNull().default(false),
  },
  (table) => [
    uniqueIndex("event_batches_session_seq_uidx").on(table.sessionId, table.seq),
  ],
);

export const receipts = pgTable("receipts", {
  pieceId: uuid("piece_id")
    .primaryKey()
    .references(() => pieces.id, { onDelete: "cascade" }),
  metrics: jsonb("metrics").notNull().$type<ReceiptMetrics>(),
  chainHeadHash: text("chain_head_hash").notNull(),
  version: integer("version").notNull().default(1),
  computedAt: timestamp("computed_at", { mode: "date" }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  pieces: many(pieces),
  accounts: many(accounts),
  authSessions: many(authSessions),
}));

export const piecesRelations = relations(pieces, ({ one, many }) => ({
  user: one(users, { fields: [pieces.userId], references: [users.id] }),
  sessions: many(sessions),
  receipt: one(receipts, { fields: [pieces.id], references: [receipts.pieceId] }),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  piece: one(pieces, { fields: [sessions.pieceId], references: [pieces.id] }),
  eventBatches: many(eventBatches),
}));

export const eventBatchesRelations = relations(eventBatches, ({ one }) => ({
  session: one(sessions, {
    fields: [eventBatches.sessionId],
    references: [sessions.id],
  }),
}));

export const receiptsRelations = relations(receipts, ({ one }) => ({
  piece: one(pieces, { fields: [receipts.pieceId], references: [pieces.id] }),
}));
