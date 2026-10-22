import { auth, emailProviderId, googleEnabled, signIn } from "@/auth";
import { GoogleMark } from "@/components/auth/GoogleMark";
import { PaperPage, PAGE_TOP_OFFSET_PX } from "@/components/scene/PaperPage";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  const params = await searchParams;

  return (
    <PaperPage topOffsetPx={PAGE_TOP_OFFSET_PX}>
      <h1
        className="font-writing text-[36px] leading-tight text-ink"
        data-paper-heading
      >
        Longhand
      </h1>
      <p className="mt-3 font-writing text-[18px] leading-snug text-[#5C564C]">
        A quiet place to write, and a record of how you wrote it.
      </p>

      {params.error ? (
        <p className="mt-6 font-ui text-[13px] text-ink" role="alert">
          Sign-in failed. Try again with a valid email.
        </p>
      ) : null}

      {googleEnabled ? (
        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/auth/continue?then=write" });
          }}
        >
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-3 rounded-md border border-[#CFC9BE] font-ui text-[14px] text-ink"
          >
            <GoogleMark />
            Continue with Google
          </button>
        </form>
      ) : null}

      {googleEnabled ? (
        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-[#E6E0D4]" />
          <span className="font-ui text-[12px] text-label">or</span>
          <span className="h-px flex-1 bg-[#E6E0D4]" />
        </div>
      ) : (
        <div className="mt-8" />
      )}

      <form
        className="flex flex-col gap-4"
        action={async (formData) => {
          "use server";
          const email = String(formData.get("email") ?? "").trim();
          if (!email) {
            return;
          }
          await signIn(emailProviderId, {
            email,
            redirectTo: "/auth/continue?then=write",
          });
        }}
      >
        <label className="flex flex-col gap-2">
          <span className="font-ui text-[12px] text-label">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="border-b border-ink/20 bg-transparent py-2 font-ui text-[13px] text-ink outline-none"
          />
        </label>
        <button
          type="submit"
          className="mt-2 h-11 w-fit rounded px-[22px] bg-ink font-ui text-[13px] text-white"
        >
          Email me a sign-in link
        </button>
      </form>

      <p className="mt-4 font-ui text-[11.5px] text-[#9A9387]">
        No password. New here? Either way makes your account.
      </p>

      <p className="mt-12 font-ui text-[12px] text-label">
        <Link
          href="/privacy"
          className="underline decoration-[#BDB6AA] underline-offset-4 hover:decoration-ink"
        >
          Privacy
        </Link>
      </p>
    </PaperPage>
  );
}
