import { auth, emailProviderId, googleEnabled, signIn } from "@/auth";
import { PaperPage, PAGE_TOP_OFFSET_PX } from "@/components/scene/PaperPage";
import Link from "next/link";
import { redirect } from "next/navigation";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}

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
            await signIn("google", { redirectTo: "/" });
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
            redirectTo: "/",
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
