import { sql } from "drizzle-orm";
import {
  bigserial,
  customType,
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
import { EVENT_TYPES, ROLES } from "@/lib/core/events";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

export const placeLevel = pgEnum("place_level", ["national", "state", "lga", "ward", "pu"]);
export const role = pgEnum("role", ROLES);
export const eventType = pgEnum("event_type", EVENT_TYPES);
export const witnessKind = pgEnum("witness_kind", ["signed", "firsthand", "secondhand", "forwarded"]);
export const anchorStatus = pgEnum("anchor_status", ["pending", "confirmed", "failed"]);

export const places = pgTable(
  "places",
  {
    code: text("code").primaryKey(),
    level: placeLevel("level").notNull(),
    parentCode: text("parent_code"),
    name: text("name").notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    landmark: text("landmark"),
    registered: integer("registered"),
  },
  (t) => [index("places_parent_idx").on(t.parentCode), index("places_level_idx").on(t.level)],
);

export const actors = pgTable("actors", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: role("role").notNull(),
  party: text("party"),
  displayName: text("display_name").notNull(),
  publicKey: text("public_key").notNull().unique(),
  placeCode: text("place_code"),
  relAlpha: integer("rel_alpha").notNull().default(3),
  relBeta: integer("rel_beta").notNull().default(1),
  isDemo: integer("is_demo").notNull().default(0),
  /** One person can hold several keys (one per phone). All of a person's keys share the account id of the first. */
  accountId: uuid("account_id"),
  /** Retired: recovery codes were replaced by passwords. Kept so the migration is additive. */
  recoveryHash: text("recovery_hash"),
  /** Login name, set on the first key of an account (unique). */
  username: text("username").unique(),
  /** scrypt hash of the password, on the same first key. */
  passwordHash: text("password_hash"),
  failedLogins: integer("failed_logins").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  /** A signed-out key can no longer author or witness anything new. Its earlier records stay valid. */
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Append-only ledger. Rows are never updated or deleted by the application. */
export const events = pgTable(
  "events",
  {
    seq: bigserial("seq", { mode: "number" }).primaryKey(),
    id: uuid("id").notNull().unique(),
    type: eventType("type").notNull(),
    placeCode: text("place_code").notNull(),
    payload: jsonb("payload").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    authorKey: text("author_key").notNull(),
    authorId: uuid("author_id").notNull(),
    contentHash: text("content_hash").notNull(),
    signature: text("signature").notNull(),
    prevHash: text("prev_hash").notNull(),
    ledgerHash: text("ledger_hash").notNull().unique(),
    channel: text("channel").notNull().default("app"),
  },
  (t) => [
    index("events_place_idx").on(t.placeCode, t.type),
    uniqueIndex("events_content_hash_idx").on(t.contentHash),
  ],
);

export const witnesses = pgTable(
  "witnesses",
  {
    contentHash: text("content_hash").notNull(),
    actorId: uuid("actor_id").notNull(),
    kind: witnessKind("kind").notNull().default("signed"),
    signature: text("signature"),
    signedAt: timestamp("signed_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.contentHash, t.actorId] })],
);

export const media = pgTable("media", {
  sha256: text("sha256").primaryKey(),
  mime: text("mime").notNull(),
  bytes: bytea("bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const anchors = pgTable("anchors", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromSeq: integer("from_seq").notNull(),
  toSeq: integer("to_seq").notNull(),
  merkleRoot: text("merkle_root").notNull(),
  calendars: jsonb("calendars").notNull().default(sql`'[]'::jsonb`),
  status: anchorStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Public 2023 polling-unit results, used as an independent reference ("external witness") and for Replay 2023. */
export const reference2023 = pgTable("reference_2023", {
  puCode: text("pu_code").primaryKey(),
  votes: jsonb("votes").notNull(),
  accredited: integer("accredited").notNull(),
  registered: integer("registered").notNull(),
  source: text("source").notNull(),
});

/** A phone number that wants SMS alerts about one polling unit. The number is only read by the server to send alerts. */
export const alertSubscriptions = pgTable(
  "alert_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    placeCode: text("place_code").notNull(),
    phone: text("phone").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("alert_sub_unique").on(t.placeCode, t.phone), index("alert_sub_place_idx").on(t.placeCode)],
);

/** One alert per subscription per event, so a re-sync never texts anyone twice. */
export const alertDeliveries = pgTable(
  "alert_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subscriptionId: uuid("subscription_id").notNull().references(() => alertSubscriptions.id, { onDelete: "cascade" }),
    contentHash: text("content_hash").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull(),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("alert_delivery_once").on(t.subscriptionId, t.contentHash)],
);

/** One browser that opted into Web Push. `topic` is "mission" for the live board or "place:<code>" for one place. */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    topic: text("topic").notNull().default("mission"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("push_sub_endpoint_topic").on(t.endpoint, t.topic), index("push_sub_topic_idx").on(t.topic)],
);

/** A push already sent to one subscription for one event, so a re-sync never buzzes twice. */
export const pushDeliveries = pgTable(
  "push_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subscriptionId: uuid("subscription_id").notNull().references(() => pushSubscriptions.id, { onDelete: "cascade" }),
    eventKey: text("event_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("push_delivery_once").on(t.subscriptionId, t.eventKey)],
);

/**
 * A voter's request for priority help (elderly, disabled, pregnant or with a small child) at a polling unit. It is a public
 * form, so it is not a signed record. The answer is: an officer or observer signs a help.responded event that names the request.
 * Holds no name or phone number.
 */
export const helpRequests = pgTable(
  "help_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    placeCode: text("place_code").notNull(),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("help_place_idx").on(t.placeCode), index("help_created_idx").on(t.createdAt)],
);
