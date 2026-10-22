import { auth } from "@/auth";
import { userHasDisplayName } from "@/lib/auth/display-name";
import { clearGuestCookie, readGuestCookie } from "@/lib/guest/cookie";
import { claimGuestPieces } from "@/lib/guest/claim";
import { NextResponse } from "next/server";

function parseThen(raw: string | null): "write" | "publish" {
  return raw === "publish" ? "publish" : "write";
}

function safeNext(path: string): string {
  if (path.startsWith("/") && !path.startsWith("//")) return path;
  return "/";
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const url = new URL(request.url);
  const then = parseThen(url.searchParams.get("then"));
  const token = await readGuestCookie();

  let pieceId: string | null = null;
  if (token) {
    pieceId = await claimGuestPieces({
      token,
      userId: session.user.id,
    });
    await clearGuestCookie();
  }

  if (!pieceId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const dest = safeNext(
    `/write/${pieceId}${then === "publish" ? "?publish=1" : ""}`,
  );

  if (!(await userHasDisplayName(session.user.id))) {
    return NextResponse.redirect(
      new URL(`/onboarding/name?next=${encodeURIComponent(dest)}`, request.url),
    );
  }

  return NextResponse.redirect(new URL(dest, request.url));
}
