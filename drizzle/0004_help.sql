ALTER TYPE "public"."event_type" ADD VALUE 'help.responded';--> statement-breakpoint
CREATE TABLE "help_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_code" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "help_place_idx" ON "help_requests" USING btree ("place_code");--> statement-breakpoint
CREATE INDEX "help_created_idx" ON "help_requests" USING btree ("created_at");