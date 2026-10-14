import { auth, signIn } from "@/auth";
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
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-16">
      <h1 className="font-writing text-[28px] leading-tight text-ink">
        Longhand
      </h1>
      <p className="mt-3 font-ui text-[13px] text-ink/70">
        Sign in with a magic link sent to your email.
      </p>

      {params.error ? (
        <p className="mt-6 font-ui text-[13px] text-ink/80" role="alert">
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
          <span className="font-ui text-[12px] text-ink/70">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded-[6px] border border-ink/15 bg-page px-3 py-2 font-ui text-[13px] text-ink outline-none focus:border-lamp"
          />
        </label>
        <button
          type="submit"
          className="rounded-[6px] bg-lamp px-4 py-2 font-ui text-[13px] text-ink"
        >
          Email me a link
        </button>
      </form>
    </main>
  );
}
