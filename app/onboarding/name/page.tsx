import { NameOnboardingForm } from "@/components/onboarding/NameOnboardingForm";
import { auth } from "@/auth";
import { PaperPage, PAGE_TOP_OFFSET_PX } from "@/components/scene/PaperPage";
import { userHasDisplayName } from "@/lib/auth/display-name";
import { rootDomain } from "@/lib/hosts";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function DisplayNameOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  if (await userHasDisplayName(session.user.id)) {
    redirect("/");
  }

  const [row] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const params = await searchParams;
  const next =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/";

  return (
    <PaperPage topOffsetPx={PAGE_TOP_OFFSET_PX}>
      <NameOnboardingForm
        next={next}
        domain={rootDomain()}
        initialName={row?.name?.trim() ?? ""}
      />
    </PaperPage>
  );
}
