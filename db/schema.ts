import type { AdapterAccountType } from "@auth/core/adapters";
import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  doublePrecision,
  index,
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
import type { EditEvent, ReceiptMetrics, TextLink } from "@/lib/receipt/types";

export const pieceStatusEnum = pgEnum("piece_status", ["draft", "published"]);
export const pieceVisibilityEnum = pgEnum("piece_visibility", [
  "public",
  "private",
]);
export const sceneConditionEnum = pgEnum("scene_condition", [
  "clear",
  "cloudy",
  "rain",
  "snow",
]);
export const windowSideEnum = pgEnum("window_side", ["left", "right"]);
export const writingFontEnum = pgEnum("writing_font", [
  "literata",
  "newsreader",
  "instrument-sans",
  "dm-mono",
]);
/** Stored as text enum labels so sizes stay 18/20/22/24. */
export const writingFontSizeEnum = pgEnum("writing_font_size", [
  "18",
  "20",
  "22",
  "24",
]);

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  // Auth.js adapter field; stores the writer's display name (PRD: display_name).
  name: text("display_name"),
  /**
   * Unique page address; personal page at {handle}.{ROOT_DOMAIN}.
   * Null until first-run onboarding chooses one (Google users arrive with a
   * name but no handle).
   */
  handle: text("handle").unique(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  /** Optional coarse writing location (city name only; never on public pages). */
  cityName: text("city_name"),
  /** Latitude rounded to 1 decimal place. */
  latitude: doublePrecision("latitude"),
  /** Longitude rounded to 1 decimal place. */
  longitude: doublePrecision("longitude"),
  /** Side window edge preference (DESIGN.md). */
  windowSide: windowSideEnum("window_side").notNull().default("left"),
  /** Editor Type menu font (DESIGN.md); published pages stay Literata. */
  font: writingFontEnum("font").notNull().default("literata"),
  /** Editor Type menu size in px (DESIGN.md); published pages stay 20. */
  fontSize: writingFontSizeEnum("font_size").notNull().default("20"),
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

/** Rolling windows for sign-in and guest rate limits. Keys are HMAC-SHA256. */
export const rateLimitHits = pgTable(
  "rate_limit_hits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bucket: text("bucket").notNull(),
    keyHash: text("key_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("rate_limit_hits_bucket_key_created_idx").on(
      table.bucket,
      table.keyHash,
      table.createdAt,
    ),
  ],
);

export const guests = pgTable("guests", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  ipHash: text("ip_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  claimedBy: text("claimed_by").references(() => users.id, {
    onDelete: "set null",
  }),
  claimedAt: timestamp("claimed_at", { withTimezone: true, mode: "date" }),
});

export const handleRedirects = pgTable("handle_redirects", {
  oldHandle: text("old_handle").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
});

export const pieces = pgTable(
  "pieces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    guestId: uuid("guest_id").references(() => guests.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull().default(""),
    status: pieceStatusEnum("status").notNull().default("draft"),
    visibility: pieceVisibilityEnum("visibility").notNull().default("public"),
    slug: text("slug").unique(),
    /**
     * Latest draft body after accepted batches (nullable until first validated
     * batch or backfill). Source for strict event checks; event log remains SoT.
     */
    draftText: text("draft_text"),
    finalText: text("final_text"),
    finalTextHash: text("final_text_hash"),
    /** Shortened link spans; computed from the event log at publish. */
    links: jsonb("links").$type<TextLink[]>(),
    /** Newest writing session that owns this piece; only its batches are accepted. */
    activeSessionId: uuid("active_session_id").references(
      (): AnyPgColumn => sessions.id,
      { onDelete: "set null" },
    ),
    publishedAt: timestamp("published_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "pieces_exactly_one_owner",
      sql`(user_id is null) <> (guest_id is null)`,
    ),
    check(
      "pieces_guest_never_publish",
      sql`status = 'draft' or user_id is not null`,
    ),
    index("pieces_guest_id_idx").on(table.guestId),
  ],
);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  pieceId: uuid("piece_id")
    .notNull()
    .references(() => pieces.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { mode: "date" }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { mode: "date" }),
  /** Ambient condition when the session started (for the receipt note). */
  condition: sceneConditionEnum("condition"),
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
  handleRedirects: many(handleRedirects),
  claimedGuests: many(guests),
}));

export const handleRedirectsRelations = relations(handleRedirects, ({ one }) => ({
  user: one(users, {
    fields: [handleRedirects.userId],
    references: [users.id],
  }),
}));

export const guestsRelations = relations(guests, ({ one, many }) => ({
  claimedByUser: one(users, {
    fields: [guests.claimedBy],
    references: [users.id],
  }),
  pieces: many(pieces),
}));

export const piecesRelations = relations(pieces, ({ one, many }) => ({
  user: one(users, { fields: [pieces.userId], references: [users.id] }),
  guest: one(guests, { fields: [pieces.guestId], references: [guests.id] }),
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
