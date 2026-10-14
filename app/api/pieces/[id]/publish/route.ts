import { auth } from "@/auth";
import { publishPiece } from "@/lib/pieces/publish";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PublishBody = {
  title?: string;
  finalText?: string;
  replayPublic?: boolean;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: pieceId } = await context.params;

  let body: PublishBody;
  try {
    body = (await request.json()) as PublishBody;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  if (
    typeof body.title !== "string" ||
    typeof body.finalText !== "string" ||
    (body.replayPublic !== undefined && typeof body.replayPublic !== "boolean")
  ) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await publishPiece({
    pieceId,
    userId: session.user.id,
    title: body.title,
    finalText: body.finalText,
    replayPublic: body.replayPublic === true,
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
    finalTextHash: result.finalTextHash,
    chainHeadHash: result.chainHeadHash,
  });
}
