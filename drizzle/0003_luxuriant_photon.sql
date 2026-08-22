ALTER TABLE "orders" DROP CONSTRAINT "orders_provisioning_token_unique";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "provisioning_token";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "provisioning_token_status";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "provisioning_expires_at";--> statement-breakpoint
DROP TYPE "public"."provisioning_token_status";