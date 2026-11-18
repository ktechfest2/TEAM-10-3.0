CREATE TYPE "public"."anchor_status" AS ENUM('pending', 'confirmed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('material.dispatched', 'material.received', 'staff.checked_in', 'pu.opened', 'pu.queue', 'pu.closed', 'result.declared', 'transmission.attempted', 'cancellation.recorded', 'collation.entered', 'incident.reported', 'claim.reported');--> statement-breakpoint
CREATE TYPE "public"."place_level" AS ENUM('national', 'state', 'lga', 'ward', 'pu');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('presiding_officer', 'party_agent', 'observer', 'community_leader', 'collation_officer', 'logistics', 'citizen', 'system');--> statement-breakpoint
CREATE TYPE "public"."witness_kind" AS ENUM('signed', 'firsthand', 'secondhand', 'forwarded');--> statement-breakpoint
CREATE TABLE "actors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "role" NOT NULL,
	"party" text,
	"display_name" text NOT NULL,
	"public_key" text NOT NULL,
	"place_code" text,
	"rel_alpha" integer DEFAULT 3 NOT NULL,
	"rel_beta" integer DEFAULT 1 NOT NULL,
	"is_demo" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "actors_public_key_unique" UNIQUE("public_key")
);
--> statement-breakpoint
CREATE TABLE "anchors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_seq" integer NOT NULL,
	"to_seq" integer NOT NULL,
	"merkle_root" text NOT NULL,
	"calendars" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "anchor_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"seq" bigserial PRIMARY KEY NOT NULL,
	"id" uuid NOT NULL,
	"type" "event_type" NOT NULL,
	"place_code" text NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"author_key" text NOT NULL,
	"author_id" uuid NOT NULL,
	"content_hash" text NOT NULL,
	"signature" text NOT NULL,
	"prev_hash" text NOT NULL,
	"ledger_hash" text NOT NULL,
	"channel" text DEFAULT 'app' NOT NULL,
	CONSTRAINT "events_id_unique" UNIQUE("id"),
	CONSTRAINT "events_ledger_hash_unique" UNIQUE("ledger_hash")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"sha256" text PRIMARY KEY NOT NULL,
	"mime" text NOT NULL,
	"bytes" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "places" (
	"code" text PRIMARY KEY NOT NULL,
	"level" "place_level" NOT NULL,
	"parent_code" text,
	"name" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"landmark" text,
	"registered" integer
);
--> statement-breakpoint
CREATE TABLE "reference_2023" (
	"pu_code" text PRIMARY KEY NOT NULL,
	"votes" jsonb NOT NULL,
	"accredited" integer NOT NULL,
	"registered" integer NOT NULL,
	"source" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "witnesses" (
	"content_hash" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"kind" "witness_kind" DEFAULT 'signed' NOT NULL,
	"signature" text,
	"signed_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "witnesses_content_hash_actor_id_pk" PRIMARY KEY("content_hash","actor_id")
);
--> statement-breakpoint
CREATE INDEX "events_place_idx" ON "events" USING btree ("place_code","type");--> statement-breakpoint
CREATE UNIQUE INDEX "events_content_hash_idx" ON "events" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "places_parent_idx" ON "places" USING btree ("parent_code");--> statement-breakpoint
CREATE INDEX "places_level_idx" ON "places" USING btree ("level");