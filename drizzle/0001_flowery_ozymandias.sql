CREATE TYPE "public"."order_status" AS ENUM('pending_payment', 'submitted', 'approved', 'rejected', 'provisioned');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('gcash', 'bank_transfer');--> statement-breakpoint
CREATE TYPE "public"."provisioning_token_status" AS ENUM('active', 'expired', 'consumed');--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"status" "order_status" DEFAULT 'pending_payment' NOT NULL,
	"amount" integer NOT NULL,
	"payment_method" "payment_method",
	"payment_reference" varchar(255),
	"payment_proof_url" text,
	"admin_notes" text,
	"provisioning_token" varchar(64),
	"provisioning_token_status" "provisioning_token_status",
	"provisioning_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_draft_id_card_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."card_drafts"("id") ON DELETE no action ON UPDATE no action;