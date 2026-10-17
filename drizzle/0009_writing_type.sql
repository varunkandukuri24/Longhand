CREATE TYPE "public"."writing_font" AS ENUM('literata', 'newsreader', 'instrument-sans', 'dm-mono');--> statement-breakpoint
CREATE TYPE "public"."writing_font_size" AS ENUM('18', '20', '22', '24');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "font" "writing_font" DEFAULT 'literata' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "font_size" "writing_font_size" DEFAULT '20' NOT NULL;
