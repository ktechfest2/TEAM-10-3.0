ALTER TABLE "actors" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "actors" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "actors" ADD COLUMN "failed_logins" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "actors" ADD COLUMN "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "actors" ADD CONSTRAINT "actors_username_unique" UNIQUE("username");