import { auth, emailProviderId, googleEnabled } from "@/auth";
import { FocusEditor } from "@/components/editor/FocusEditor";
import { userHasDisplayName } from "@/lib/auth/display-name";
import { getGuest, getGuestPiece } from "@/lib/guest/get-guest";
import { rootDomain } from "@/lib/hosts";
import { openFreshPiece } from "@/lib/pieces/open-fresh-piece";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.id) {
    if (!(await userHasDisplayName(session.user.id))) {
      redirect("/onboarding/name");
    }
    const pieceId = await openFreshPiece(session.user.id);
    redirect(`/write/${pieceId}`);
  }

  const guest = await getGuest();
  const guestPiece = guest ? await getGuestPiece(guest.id) : null;
  const examplePieceUrl = process.env.EXAMPLE_PIECE_URL?.trim() || null;

  return (
    <FocusEditor
      mode="guest"
      pieceId={guestPiece?.id ?? null}
      domain={rootDomain()}
      examplePieceUrl={examplePieceUrl}
      googleEnabled={googleEnabled}
      emailProviderId={emailProviderId}
    />
  );
}
