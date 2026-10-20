"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { accounts, handleRedirects, users } from "@/db/schema";
import { normalizeDisplayName } from "@/lib/auth/normalize-display-name";
import { isHandleAvailable } from "@/lib/handles/change";
import { validateHandle } from "@/lib/handles";
import { geocodeCity } from "@/lib/scene/geocode";
import { and, eq } from "drizzle-orm";

const CITY_MAX = 80;
const REDIRECT_DAYS = 90;

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
  const userId = session?.user?.id;
  if (!userId) {
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

  const [current] = await db
    .select({
      handle: users.handle,
      cityName: users.cityName,
      latitude: users.latitude,
      longitude: users.longitude,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!current) {
    return { ok: false, error: "unauthorized" };
  }

  const handleUnchanged = current.handle === checked.handle;
  if (!handleUnchanged) {
    const available = await isHandleAvailable(checked.handle, userId);
    if (!available) {
      return { ok: false, error: "taken" };
    }
  }

  const cityRaw = input.city.trim().slice(0, CITY_MAX);
  let cityName: string | null = null;
  let latitude: number | null = null;
  let longitude: number | null = null;

  if (cityRaw) {
    const savedCity = current.cityName?.trim() || null;
    if (savedCity !== null && cityRaw === savedCity) {
      cityName = current.cityName;
      latitude = current.latitude;
      longitude = current.longitude;
    } else {
      const geocoded = await geocodeCity(cityRaw);
      if (geocoded) {
        cityName = geocoded.cityName;
        latitude = geocoded.latitude;
        longitude = geocoded.longitude;
      } else {
        cityName = cityRaw;
        latitude = current.latitude;
        longitude = current.longitude;
      }
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        name,
        cityName,
        latitude,
        longitude,
        ...(handleUnchanged ? {} : { handle: checked.handle }),
      })
      .where(eq(users.id, userId));

    if (!handleUnchanged) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + REDIRECT_DAYS);

      await tx
        .delete(handleRedirects)
        .where(eq(handleRedirects.oldHandle, checked.handle));

      if (current.handle) {
        await tx
          .insert(handleRedirects)
          .values({
            oldHandle: current.handle,
            userId,
            expiresAt,
          })
          .onConflictDoUpdate({
            target: handleRedirects.oldHandle,
            set: { userId, expiresAt },
          });
      }
    }
  });

  return {
    ok: true,
    handle: checked.handle,
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
