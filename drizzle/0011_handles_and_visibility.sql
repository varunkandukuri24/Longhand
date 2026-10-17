CREATE TYPE "public"."piece_visibility" AS ENUM('public', 'private');--> statement-breakpoint
ALTER TABLE "pieces" ADD COLUMN "visibility" "piece_visibility" DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "handle" text;--> statement-breakpoint
CREATE TABLE "handle_redirects" (
	"old_handle" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL
);--> statement-breakpoint
ALTER TABLE "handle_redirects" ADD CONSTRAINT "handle_redirects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DO $$
DECLARE
  r RECORD;
  base text;
  candidate text;
  n int;
  reserved text[] := ARRAY[
    'www','app','api','admin','mail','help','about','blog','static','assets',
    'cdn','status','support','longhand','auth','signin','login','signup',
    'dashboard','settings','write','p','u','docs','dev','staging','root'
  ];
BEGIN
  FOR r IN SELECT id, display_name FROM users ORDER BY created_at, id LOOP
    base := lower(coalesce(r.display_name, ''));
    base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
    base := trim(both '-' from base);
    base := left(base, 30);
    base := trim(both '-' from base);
    IF length(base) < 3 THEN
      base := 'writer';
    END IF;
    candidate := base;
    n := 1;
    WHILE candidate = ANY(reserved)
       OR EXISTS (SELECT 1 FROM users u WHERE u.handle = candidate) LOOP
      n := n + 1;
      candidate := left(base, greatest(1, 30 - length('-' || n::text))) || '-' || n::text;
    END LOOP;
    UPDATE users SET handle = candidate WHERE id = r.id;
  END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "handle" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_handle_unique" UNIQUE("handle");
