CREATE TYPE "public"."scene_condition" AS ENUM('clear', 'cloudy', 'rain', 'snow');--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "condition" "scene_condition";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "city_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "longitude" double precision;