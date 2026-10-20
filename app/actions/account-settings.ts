"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";
import { normalizeDisplayName } from "@/lib/auth/normalize-display-name";
import { changeHandle } from "@/lib/handles/change";
import { validateHandle } from "@/lib/handles";
import { geocodeCity } from "@/lib/scene/geocode";
import { and, eq } from "drizzle-orm";

const CITY_MAX = 80;

export type AccountSettingsInput = {
  name: string;
  handle: string;
  city: string;
};

export type AccountSettingsResult =
  | { ok: true; handle: string; name: string }
  | { ok: false; error: string };

export async function saveAccountSettings(
  input: AccountSettingsInput,
): Promise<AccountSettingsResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" };
  }

  const name = normalizeDisplayName(input.name);
  if (!name) {
    return { ok: false, error: "name" };
  }

  const checked = validateHandle(input.handle);
  if (!checked.ok) {
    return { ok: false, error: "handle" };
  }

  const cityRaw = input.city.trim().slice(0, CITY_MAX);
  let cityName: string | null = null;
  let latitude: number | null = null;
  let longitude: number | null = null;
  if (cityRaw) {
    const geocoded = await geocodeCity(cityRaw);
    if (geocoded) {
      cityName = geocoded.cityName;
      latitude = geocoded.latitude;
      longitude = geocoded.longitude;
    } else {
      cityName = cityRaw;
    }
  }

  await db
    .update(users)
    .set({
      name,
      cityName,
      latitude,
      longitude,
    })
    .where(eq(users.id, session.user.id));

  const handleResult = await changeHandle(session.user.id, checked.handle);
  if (!handleResult.ok && handleResult.error !== "unchanged") {
    return { ok: false, error: handleResult.error };
  }

  return {
    ok: true,
    handle: handleResult.ok ? handleResult.handle : checked.handle,
    name,
  };
}

export async function userHasGoogleLinked(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  const [row] = await db
    .select({ provider: accounts.provider })
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, session.user.id),
        eq(accounts.provider, "google"),
      ),
    )
    .limit(1);
  return Boolean(row);
}
