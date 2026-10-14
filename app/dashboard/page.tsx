import { NewPieceActions } from "@/components/dashboard/NewPieceActions";
import { DisplayNameForm } from "@/components/dashboard/DisplayNameForm";
import { signOut } from "@/auth";
import { db } from "@/db";
import { pieces } from "@/db/schema";
import { requireUserWithDisplayName } from "@/lib/auth/display-name";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await requireUserWithDisplayName();

  const userPieces = await db
    .select({
      id: pieces.id,
      title: pieces.title,
      status: pieces.status,
      slug: pieces.slug,
      mode: pieces.mode,
      updatedAt: pieces.updatedAt,
    })
    .from(pieces)
    .where(eq(pieces.userId, user.id))
    .orderBy(desc(pieces.updatedAt));

  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-6 py-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-writing text-[28px] leading-tight text-ink">
            Longhand
          </h1>
          <DisplayNameForm initialName={user.name} />
          {user.email ? (
            <p className="mt-1 font-ui text-[12px] text-ink/45">{user.email}</p>
          ) : null}
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/signin" });
          }}
        >
          <button
            type="submit"
            className="font-ui text-[12px] text-ink/70 underline-offset-2 hover:underline"
          >
            Sign out
          </button>
        </form>
      </header>

      <section className="mt-10">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-ui text-[12px] uppercase tracking-wide text-ink/60">
            Pieces
          </h2>
          <NewPieceActions />
        </div>

        {userPieces.length === 0 ? (
          <p className="mt-6 font-ui text-[13px] text-ink/70">
            No pieces yet.
          </p>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {userPieces.map((piece) => (
              <li
                key={piece.id}
                className="flex items-baseline justify-between gap-4 border-b border-ink/10 pb-3"
              >
                <div>
                  <Link
                    href={`/write/${piece.id}`}
                    className="font-writing text-[18px] text-ink underline-offset-2 hover:underline"
                  >
                    {piece.title || "Untitled"}
                  </Link>
                  <p className="mt-1 font-ui text-[12px] text-ink/60">
                    {piece.status} · {piece.mode}
                    {piece.status === "published" && piece.slug ? (
                      <>
                        {" · "}
                        <Link
                          href={`/p/${piece.slug}`}
                          className="underline-offset-2 hover:underline"
                        >
                          receipt
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-10 font-ui text-[12px] text-ink/50">
        <Link href="/" className="underline-offset-2 hover:underline">
          Home
        </Link>
      </p>
    </main>
  );
}
