-- Response mode is removed. Source URLs are not migrated into piece text
-- (published text is frozen). Drop mode and source columns.
ALTER TABLE "pieces" DROP COLUMN IF EXISTS "mode";-->statement-breakpoint
ALTER TABLE "pieces" DROP COLUMN IF EXISTS "source_url";-->statement-breakpoint
ALTER TABLE "pieces" DROP COLUMN IF EXISTS "source_title";-->statement-breakpoint
ALTER TABLE "pieces" DROP COLUMN IF EXISTS "source_site";-->statement-breakpoint
DROP TYPE IF EXISTS "public"."piece_mode";
