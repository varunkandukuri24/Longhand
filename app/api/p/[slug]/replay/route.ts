import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

/**
 * Public replay was removed from the MVP. The event log is never served
 * publicly; this route always returns 404.
 */
export async function GET(_request: Request, _context: RouteContext) {
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}
