CREATE TYPE "public"."window_side" AS ENUM('left', 'right');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "window_side" "window_side" DEFAULT 'left' NOT NULL;