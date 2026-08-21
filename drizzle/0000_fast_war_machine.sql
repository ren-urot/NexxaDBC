CREATE TYPE "public"."draft_status" AS ENUM('draft', 'submitted', 'expired');--> statement-breakpoint
CREATE TYPE "public"."orientation" AS ENUM('vertical', 'horizontal');--> statement-breakpoint
CREATE TABLE "card_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"template_id" varchar(64) NOT NULL,
	"orientation" "orientation" NOT NULL,
	"status" "draft_status" DEFAULT 'draft' NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"job_title" varchar(150),
	"company" varchar(150),
	"mobile" varchar(30),
	"email" varchar(255),
	"address" text,
	"website" varchar(255),
	"logo_url" text,
	"facebook" varchar(255),
	"linkedin" varchar(255),
	"instagram" varchar(255),
	"whatsapp" varchar(255),
	"messenger" varchar(255),
	"style_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
