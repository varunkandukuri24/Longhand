import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-16">
      <h1 className="font-writing text-[32px] leading-tight text-ink">
        Longhand
      </h1>
      <p className="mt-3 font-ui text-[13px] text-ink/70">
        A focused place to write, with an effort receipt when you publish.
      </p>
      <Link
        href="/signin"
        className="mt-8 inline-flex w-fit rounded-[6px] bg-lamp px-4 py-2 font-ui text-[13px] text-ink"
      >
        Sign in
      </Link>
    </main>
  );
}
