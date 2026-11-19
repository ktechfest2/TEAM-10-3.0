ALTER TYPE "public"."event_type" ADD VALUE 'pu.relocated';--> statement-breakpoint
CREATE TABLE "alert_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"content_hash" text NOT NULL,
	"message" text NOT NULL,
	"status" text NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_code" text NOT NULL,
	"phone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_subscription_id_alert_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."alert_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alert_delivery_once" ON "alert_deliveries" USING btree ("subscription_id","content_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "alert_sub_unique" ON "alert_subscriptions" USING btree ("place_code","phone");--> statement-breakpoint
CREATE INDEX "alert_sub_place_idx" ON "alert_subscriptions" USING btree ("place_code");