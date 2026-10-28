import { isMainHost, isPreview, subdomainHandle } from "@/lib/hosts";
import { type NextRequest, NextResponse } from "next/server";

function notFound(): NextResponse {
  return new NextResponse(null, { status: 404 });
}

export function proxy(request: NextRequest) {
  // Previews have no writer subdomains; /u/{handle} is the public writer page.
  if (isPreview()) {
    return NextResponse.next();
  }

  const root = process.env.ROOT_DOMAIN?.trim();
  if (!root) {
    return NextResponse.next();
  }

  const host = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  if (isMainHost(host)) {
    if (pathname === "/u" || pathname.startsWith("/u/")) {
      return notFound();
    }
    return NextResponse.next();
  }

  const handle = subdomainHandle(host);
  if (!handle) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();

  if (pathname === "/") {
    url.pathname = `/u/${handle}`;
    return NextResponse.rewrite(url);
  }

  if (pathname === "/opengraph-image") {
    url.pathname = `/u/${handle}/opengraph-image`;
    return NextResponse.rewrite(url);
  }

  const pieceOg = pathname.match(/^\/([^/]+)\/opengraph-image$/);
  if (pieceOg) {
    url.pathname = `/u/${handle}/${pieceOg[1]}/opengraph-image`;
    return NextResponse.rewrite(url);
  }

  const piece = pathname.match(/^\/([^/]+)$/);
  if (piece) {
    url.pathname = `/u/${handle}/${piece[1]}`;
    return NextResponse.rewrite(url);
  }

  return notFound();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
