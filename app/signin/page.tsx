import { auth, signIn } from "@/auth";
import { PaperShell } from "@/components/scene/PaperShell";
import { redirect } from "next/navigation";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <PaperShell>
      <main className="writing-column mx-auto flex min-h-dvh flex-col px-4 pb-16 pt-24">
        <h1 className="font-writing text-[32px] leading-tight text-ink">
          Longhand
        </h1>
        <p className="mt-3 font-ui text-[13px] text-label">
          Sign in with a magic link sent to your email.
        </p>

        {params.error ? (
          <p className="mt-6 font-ui text-[13px] text-ink" role="alert">
            Sign-in failed. Try again with a valid email.
          </p>
        ) : null}

        <form
          className="mt-8 flex flex-col gap-4"
          action={async (formData) => {
            "use server";
            const email = String(formData.get("email") ?? "").trim();
            if (!email) {
              return;
            }
            await signIn("nodemailer", {
              email,
              redirectTo: "/dashboard",
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
          <button type="submit" className="editor-bar-btn mt-2 w-fit">
            Email me a link
          </button>
        </form>
      </main>
    </PaperShell>
  );
}
