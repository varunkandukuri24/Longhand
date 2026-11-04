import { connection } from "next/server";

export default async function VerifyRequestPage() {
  await connection();
  const showMailpit =
    process.env.NODE_ENV !== "production" && !process.env.AUTH_RESEND_KEY;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-16">
      <h1 className="font-writing text-[28px] leading-tight text-ink">
        Check your email
      </h1>
      <p className="mt-3 font-ui text-[13px] text-ink/70">
        {showMailpit
          ? "We sent you a link. Open it on this device to sign in. Locally, open Mailpit at http://localhost:8025."
          : "We sent you a link. Open it on this device to sign in."}
      </p>
    </main>
  );
}
