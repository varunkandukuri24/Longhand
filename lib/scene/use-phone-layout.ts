"use client";

import { PHONE_LAYOUT_QUERY } from "@/lib/scene/phone-layout";
import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void): () => void {
  const mq = window.matchMedia(PHONE_LAYOUT_QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(PHONE_LAYOUT_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/** True under 768 px. SSR and the first client paint assume desktop. */
export function usePhoneLayout(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
