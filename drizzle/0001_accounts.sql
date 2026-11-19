ALTER TABLE "actors" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "actors" ADD COLUMN "recovery_hash" text;--> statement-breakpoint
ALTER TABLE "actors" ADD COLUMN "revoked_at" timestamp with time zone;