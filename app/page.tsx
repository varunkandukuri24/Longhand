import { auth } from "@/auth";
import { PaperPage, PAGE_TOP_OFFSET_PX } from "@/components/scene/PaperPage";
import { userHasDisplayName } from "@/lib/auth/display-name";
import { openFreshPiece } from "@/lib/pieces/open-fresh-piece";
import Link from "next/link";
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

  return (
    <PaperPage topOffsetPx={PAGE_TOP_OFFSET_PX}>
      <h1
        className="font-writing text-[32px] leading-tight text-ink"
        data-paper-heading
      >
        Longhand
      </h1>
      <p className="mt-3 font-ui text-[13px] text-label">
        A focused place to write, with proof of how it was written when you publish.
      </p>
      <Link href="/signin" className="editor-bar-btn mt-8 inline-flex w-fit">
        Sign in
      </Link>
    </PaperPage>
  );
}
