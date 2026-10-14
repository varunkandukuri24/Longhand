import { saveDisplayName } from "@/app/actions/display-name";
import { auth } from "@/auth";
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
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-room-night px-4 py-10">
      <div className="w-full max-w-[820px] rounded-[6px] bg-page px-12 py-10 shadow-page">
        <form action={saveDisplayName} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <label className="font-ui text-[13px] text-ink/70">
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
          <button
            type="submit"
            className="mt-2 w-fit rounded-[6px] bg-lamp px-3 py-1.5 font-ui text-[12px] text-ink"
          >
            Continue
          </button>
        </form>
      </div>
    </main>
  );
}
