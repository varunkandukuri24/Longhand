import { auth } from "@/auth";
import { PaperShell } from "@/components/scene/PaperShell";
import { userHasDisplayName } from "@/lib/auth/display-name";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.id) {
    if (!(await userHasDisplayName(session.user.id))) {
      redirect("/onboarding/name");
    }
    redirect("/dashboard");
  }

  return (
    <PaperShell>
      <main className="writing-column mx-auto flex min-h-dvh flex-col px-4 pb-16 pt-24">
        <h1 className="font-writing text-[32px] leading-tight text-ink">
          Longhand
        </h1>
        <p className="mt-3 font-ui text-[13px] text-label">
          A focused place to write, with an effort receipt when you publish.
        </p>
        <Link href="/signin" className="editor-bar-btn mt-8 inline-flex w-fit">
          Sign in
        </Link>
      </main>
    </PaperShell>
  );
}
