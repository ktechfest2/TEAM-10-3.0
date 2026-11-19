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
