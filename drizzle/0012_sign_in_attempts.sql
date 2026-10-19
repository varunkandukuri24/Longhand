CREATE TABLE "sign_in_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"ip" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "sign_in_attempts_email_created_idx" ON "sign_in_attempts" ("email","created_at");--> statement-breakpoint
CREATE INDEX "sign_in_attempts_ip_created_idx" ON "sign_in_attempts" ("ip","created_at");
