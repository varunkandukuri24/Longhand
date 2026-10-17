import { NameOnboardingForm } from "@/components/onboarding/NameOnboardingForm";
import { auth } from "@/auth";
import { PaperPage, PAGE_TOP_OFFSET_PX } from "@/components/scene/PaperPage";
import { userHasDisplayName } from "@/lib/auth/display-name";
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
    redirect("/dashboard");
  }

  const params = await searchParams;
  const next =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/dashboard";

  return (
    <PaperPage topOffsetPx={PAGE_TOP_OFFSET_PX}>
      <NameOnboardingForm next={next} />
    </PaperPage>
  );
}
