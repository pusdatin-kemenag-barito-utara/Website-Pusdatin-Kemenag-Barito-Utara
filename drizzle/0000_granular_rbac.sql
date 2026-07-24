CREATE SCHEMA "pusdatin";
--> statement-breakpoint
CREATE TABLE "pusdatin"."app_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"app_id" varchar(50) NOT NULL,
	"role" varchar(20) DEFAULT 'none' NOT NULL,
	"features" jsonb
);
--> statement-breakpoint
CREATE TABLE "pusdatin"."audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" varchar(20) NOT NULL,
	"target" varchar(255) NOT NULL,
	"target_schema" varchar(100),
	"performed_by" varchar(255) NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"ip" varchar(50),
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pusdatin"."satellite_apps" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"icon" varchar(50),
	"url" varchar(500),
	"schema_name" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'online' NOT NULL,
	"last_health_check" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pusdatin"."system_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cpu" integer DEFAULT 0 NOT NULL,
	"ram" integer DEFAULT 0 NOT NULL,
	"storage" integer DEFAULT 0 NOT NULL,
	"uptime" varchar(100),
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pusdatin"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text,
	"role" varchar(50) DEFAULT 'viewer' NOT NULL,
	"user_type" varchar(50) DEFAULT 'internal_admin' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"avatar" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "pusdatin"."app_permissions" ADD CONSTRAINT "app_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "pusdatin"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pusdatin"."app_permissions" ADD CONSTRAINT "app_permissions_app_id_satellite_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "pusdatin"."satellite_apps"("id") ON DELETE cascade ON UPDATE no action;