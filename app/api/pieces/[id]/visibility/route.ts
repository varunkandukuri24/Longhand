import { auth } from "@/auth";
import { isPieceId } from "@/lib/pieces/piece-id";
import type { PieceVisibility } from "@/lib/pieces/publish";
import { setPieceVisibility } from "@/lib/pieces/set-visibility";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseVisibility(raw: unknown): PieceVisibility | null {
  if (raw === "public" || raw === "private") {
    return raw;
  }
  return null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: pieceId } = await context.params;
  if (!isPieceId(pieceId)) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  let body: { visibility?: string };
  try {
    body = (await request.json()) as { visibility?: string };
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const visibility = parseVisibility(body.visibility);
  if (!visibility) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await setPieceVisibility({
    pieceId,
    userId: session.user.id,
    visibility,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({
    ok: true,
    visibility: result.visibility,
    url: result.url,
    slug: result.slug,
  });
}
