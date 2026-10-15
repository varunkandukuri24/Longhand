"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { normalizeDisplayName } from "@/lib/auth/normalize-display-name";
import { geocodeCity } from "@/lib/scene/geocode";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

const CITY_MAX = 80;

export async function saveDisplayName(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const nextRaw = String(formData.get("next") ?? "").trim();
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/dashboard";

  const name = normalizeDisplayName(String(formData.get("name") ?? ""));
  if (!name) {
    // Do not clear an existing name; bounce back (dashboard re-prompts if unset).
    redirect(next);
  }

  const cityRaw = String(formData.get("city") ?? "").trim().slice(0, CITY_MAX);
  const locationUpdate: {
    cityName?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } = {};

  if (formData.has("city")) {
    if (!cityRaw) {
      locationUpdate.cityName = null;
      locationUpdate.latitude = null;
      locationUpdate.longitude = null;
    } else {
      const geocoded = await geocodeCity(cityRaw);
      if (geocoded) {
        locationUpdate.cityName = geocoded.cityName;
        locationUpdate.latitude = geocoded.latitude;
        locationUpdate.longitude = geocoded.longitude;
      }
    }
  }

  await db
    .update(users)
    .set({ name, ...locationUpdate })
    .where(eq(users.id, session.user.id));

  redirect(next);
}
