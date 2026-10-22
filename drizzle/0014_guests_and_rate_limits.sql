CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"claimed_by" text,
	"claimed_at" timestamptz,
	CONSTRAINT "guests_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_claimed_by_users_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pieces" ALTER COLUMN "user_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "pieces" ADD COLUMN "guest_id" uuid;
--> statement-breakpoint
ALTER TABLE "pieces" ADD CONSTRAINT "pieces_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pieces" ADD CONSTRAINT "pieces_exactly_one_owner" CHECK ((user_id is null) <> (guest_id is null));
--> statement-breakpoint
ALTER TABLE "pieces" ADD CONSTRAINT "pieces_guest_never_publish" CHECK (status = 'draft' or user_id is not null);
--> statement-breakpoint
CREATE INDEX "pieces_guest_id_idx" ON "pieces" ("guest_id");
--> statement-breakpoint
CREATE TABLE "rate_limit_hits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bucket" text NOT NULL,
	"key_hash" text NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rate_limit_hits_bucket_key_created_idx" ON "rate_limit_hits" ("bucket","key_hash","created_at");
--> statement-breakpoint
DROP TABLE "sign_in_attempts";
