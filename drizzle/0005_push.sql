CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"topic" text DEFAULT 'mission' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"event_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "push_deliveries" ADD CONSTRAINT "push_deliveries_subscription_id_push_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."push_subscriptions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "push_sub_endpoint_topic" ON "push_subscriptions" USING btree ("endpoint","topic");
--> statement-breakpoint
CREATE INDEX "push_sub_topic_idx" ON "push_subscriptions" USING btree ("topic");
--> statement-breakpoint
CREATE UNIQUE INDEX "push_delivery_once" ON "push_deliveries" USING btree ("subscription_id","event_key");
