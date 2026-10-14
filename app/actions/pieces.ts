"use server";

import { db } from "@/db";
import { pieces } from "@/db/schema";
import { requireUserWithDisplayName } from "@/lib/auth/display-name";
import {
  fetchSourceMeta,
  hostnameFromUrl,
} from "@/lib/source/fetch-source";
import { redirect } from "next/navigation";

export async function createPiece() {
  const user = await requireUserWithDisplayName();

  const [piece] = await db
    .insert(pieces)
    .values({
      userId: user.id,
      title: "",
      mode: "freewrite",
      status: "draft",
    })
    .returning({ id: pieces.id });

  redirect(`/write/${piece.id}`);
}

export async function createResponsePiece(formData: FormData) {
  const user = await requireUserWithDisplayName();

  const rawUrl = String(formData.get("url") ?? "").trim();
  if (rawUrl.length === 0) {
    redirect("/dashboard?respond=1");
  }

  const fetched = await fetchSourceMeta(rawUrl);
  const hostname = fetched.ok
    ? new URL(fetched.meta.url).hostname
    : hostnameFromUrl(rawUrl);

  const sourceUrl = fetched.ok
    ? fetched.meta.url
    : (() => {
        try {
          const withProtocol = /^https?:\/\//i.test(rawUrl)
            ? rawUrl
            : `https://${rawUrl}`;
          return new URL(withProtocol).toString();
        } catch {
          return rawUrl;
        }
      })();

  const sourceTitle = fetched.ok ? fetched.meta.title : hostname;
  const sourceSite = fetched.ok ? fetched.meta.siteName : hostname;
  // Editable title defaults to the fetched title, or hostname on failure.
  const title = sourceTitle;

  const [piece] = await db
    .insert(pieces)
    .values({
      userId: user.id,
      title,
      mode: "response",
      sourceUrl,
      sourceTitle,
      sourceSite,
      status: "draft",
    })
    .returning({ id: pieces.id });

  redirect(`/write/${piece.id}`);
}
