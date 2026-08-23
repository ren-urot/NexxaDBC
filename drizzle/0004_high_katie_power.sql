CREATE TABLE "customer_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"job_title" varchar(150),
	"company" varchar(150),
	"mobile" varchar(30),
	"email" varchar(255),
	"template_id" varchar(64) NOT NULL,
	"amount" integer NOT NULL,
	"order_created_at" timestamp NOT NULL,
	"archived_at" timestamp DEFAULT now() NOT NULL
);
