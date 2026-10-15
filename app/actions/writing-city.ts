"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { geocodeCity } from "@/lib/scene/geocode";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

const CITY_MAX = 80;

function safeNext(raw: FormDataEntryValue | null): string {
  const nextRaw = String(raw ?? "").trim();
  return nextRaw.startsWith("/") && !nextRaw.startsWith("//")
    ? nextRaw
    : "/dashboard";
}

/** Save or clear the optional writing city (geocoded; never IP or browser geo). */
export async function saveWritingCity(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const next = safeNext(formData.get("next"));
  const cityRaw = String(formData.get("city") ?? "").trim().slice(0, CITY_MAX);

  if (!cityRaw) {
    await db
      .update(users)
      .set({ cityName: null, latitude: null, longitude: null })
      .where(eq(users.id, session.user.id));
    redirect(next);
  }

  const geocoded = await geocodeCity(cityRaw);
  if (!geocoded) {
    // Keep prior location; bounce back without inventing a place.
    redirect(next);
  }

  await db
    .update(users)
    .set({
      cityName: geocoded.cityName,
      latitude: geocoded.latitude,
      longitude: geocoded.longitude,
    })
    .where(eq(users.id, session.user.id));

  redirect(next);
}
