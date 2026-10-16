import { saveDisplayName } from "@/app/actions/display-name";
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
      <form action={saveDisplayName} className="flex flex-col gap-6">
        <input type="hidden" name="next" value={next} />
        <label className="font-ui text-[13px] text-label">
          What name should appear on your writing?
          <input
            type="text"
            name="name"
            required
            maxLength={80}
            autoComplete="nickname"
            autoFocus
            className="mt-3 w-full border-b border-ink/20 bg-transparent py-2 font-ui text-[13px] text-ink outline-none"
          />
        </label>
        <label className="font-ui text-[13px] text-label">
          What city are you writing from?
          <input
            type="text"
            name="city"
            maxLength={80}
            autoComplete="address-level2"
            placeholder="Optional"
            className="mt-3 w-full border-b border-ink/20 bg-transparent py-2 font-ui text-[13px] text-ink outline-none placeholder:text-label/50"
          />
        </label>
        <button type="submit" className="editor-bar-btn mt-2 w-fit">
          Continue
        </button>
      </form>
    </PaperPage>
  );
}
