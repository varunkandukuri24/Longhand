import { auth } from "@/auth";
import { isPieceId } from "@/lib/pieces/piece-id";
import { publishPiece, type PieceVisibility } from "@/lib/pieces/publish";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PublishBody = {
  title?: string;
  finalText?: string;
  visibility?: string;
};

function parseVisibility(raw: unknown): PieceVisibility | null {
  if (raw === "public" || raw === "private") {
    return raw;
  }
  return null;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    return await postPublish(request, context);
  } catch (err) {
    console.error("[publish] FAILED", err);
    return Response.json({ error: "internal" }, { status: 500 });
  }
}

async function postPublish(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: pieceId } = await context.params;
  if (!isPieceId(pieceId)) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  let body: PublishBody;
  try {
    body = (await request.json()) as PublishBody;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const visibility = parseVisibility(body.visibility);
  if (
    typeof body.title !== "string" ||
    typeof body.finalText !== "string" ||
    visibility === null
  ) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await publishPiece({
    pieceId,
    userId: session.user.id,
    title: body.title,
    finalText: body.finalText,
    visibility,
  });

  if (!result.ok) {
    return Response.json(
      {
        error: result.error,
        ...(result.reason ? { reason: result.reason } : {}),
      },
      { status: result.status },
    );
  }

  return Response.json({
    ok: true,
    slug: result.slug,
    visibility: result.visibility,
    url: result.url,
    signatureLine: result.signatureLine,
    finalTextHash: result.finalTextHash,
    chainHeadHash: result.chainHeadHash,
  });
}
