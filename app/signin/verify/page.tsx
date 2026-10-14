export default function VerifyRequestPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-16">
      <h1 className="font-writing text-[28px] leading-tight text-ink">
        Check your email
      </h1>
      <p className="mt-3 font-ui text-[13px] text-ink/70">
        A sign-in link is on its way. Locally, open Mailpit at
        http://localhost:8025.
      </p>
    </main>
  );
}
