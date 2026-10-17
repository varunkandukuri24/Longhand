import { auth } from "@/auth";
import { validateHandle } from "@/lib/handles";
import { isHandleAvailable } from "@/lib/handles/change";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const raw = url.searchParams.get("h") ?? "";
  const checked = validateHandle(raw);

  if (!checked.ok) {
    return Response.json({
      available: false,
      reason: checked.error,
    });
  }

  const available = await isHandleAvailable(checked.handle, session.user.id);
  return Response.json({
    available,
    handle: checked.handle,
    reason: available ? null : "taken",
  });
}
