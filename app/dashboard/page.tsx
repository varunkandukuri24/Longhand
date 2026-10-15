import { DashboardSettings } from "@/components/dashboard/DashboardSettings";
import { NewPieceActions } from "@/components/dashboard/NewPieceActions";
import { QuoteIcon } from "@/components/icons/LonghandIcons";
import { PaperShell } from "@/components/scene/PaperShell";
import { signOut } from "@/auth";
import { db } from "@/db";
import { pieces } from "@/db/schema";
import { requireUserWithDisplayName } from "@/lib/auth/display-name";
import { dashboardDisplayTitle } from "@/lib/dashboard/display-title";
import { loadPieceState } from "@/lib/pieces/load-state";
import { wordCount } from "@/lib/receipt/compute-receipt";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ respond?: string }>;
}) {
  const user = await requireUserWithDisplayName();
  const params = await searchParams;

  const userPieces = await db
    .select({
      id: pieces.id,
      title: pieces.title,
      status: pieces.status,
      slug: pieces.slug,
      mode: pieces.mode,
      sourceTitle: pieces.sourceTitle,
      sourceSite: pieces.sourceSite,
      finalText: pieces.finalText,
      updatedAt: pieces.updatedAt,
    })
    .from(pieces)
    .where(eq(pieces.userId, user.id))
    .orderBy(desc(pieces.updatedAt));

  const listed = await Promise.all(
    userPieces.map(async (piece) => {
      let text = piece.finalText ?? "";
      if (piece.status !== "published") {
        const state = await loadPieceState(piece.id);
        text = state.text;
      }
      const display = dashboardDisplayTitle({
        mode: piece.mode,
        title: piece.title,
        sourceTitle: piece.sourceTitle,
        bodyText: text,
      });
      return {
        id: piece.id,
        display,
        status: piece.status,
        slug: piece.slug,
        mode: piece.mode,
        sourceSite: piece.sourceSite,
        words: wordCount(text),
        updatedAt: piece.updatedAt,
      };
    }),
  );

  const cityLabel = user.cityName?.trim() || "No city";

  return (
    <PaperShell initialWindowSide={user.windowSide}>
      <main className="dashboard-column mx-auto flex min-h-dvh flex-col px-4 pb-16">
        <header>
          <h1 className="font-writing text-[32px] leading-tight text-ink">
            Longhand
          </h1>
          <div className="mt-2 flex flex-wrap items-center font-ui text-[13px] text-label">
            <span>{user.name}</span>
            <span className="mx-2 text-label/40">·</span>
            <span>{cityLabel}</span>
            <span className="mx-2 text-label/40">·</span>
            <DashboardSettings
              displayName={user.name}
              cityName={user.cityName}
              email={user.email ?? ""}
            />
            <span className="mx-2 text-label/40">·</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/signin" });
              }}
              className="inline"
            >
              <button type="submit" className="editor-bar-btn min-h-0 px-0">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <div className="mt-6">
          <NewPieceActions startRespondOpen={params.respond === "1"} />
        </div>

        <section className="mt-8">
          {listed.length === 0 ? (
            <p className="font-ui text-[13px] text-label">No pieces yet.</p>
          ) : (
            <ul className="flex flex-col gap-7">
              {listed.map((piece) => (
                <li key={piece.id}>
                  <Link
                    href={`/write/${piece.id}`}
                    className={[
                      "line-clamp-2 font-writing text-[24px] leading-[1.3] underline-offset-2 hover:underline",
                      piece.display.muted ? "text-label" : "text-ink",
                    ].join(" ")}
                  >
                    {piece.display.label}
                  </Link>
                  <p className="mt-1 flex flex-wrap items-center gap-x-0 font-ui text-[12.5px] text-label">
                    {piece.mode === "response" && piece.sourceSite ? (
                      <>
                        <QuoteIcon size={12} className="mr-1.5 inline-block align-[-1px]" />
                        <span>{piece.sourceSite}</span>
                        <span className="mx-2 text-label/40">·</span>
                      </>
                    ) : null}
                    <span>
                      {piece.updatedAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="mx-2 text-label/40">·</span>
                    <span>
                      {piece.words} {piece.words === 1 ? "word" : "words"}
                    </span>
                    <span className="mx-2 text-label/40">·</span>
                    {piece.status === "published" ? (
                      <>
                        <span>published</span>
                        {piece.slug ? (
                          <>
                            <span className="mx-2 text-label/40">·</span>
                            <Link
                              href={`/p/${piece.slug}`}
                              className="underline-offset-2 hover:underline"
                            >
                              receipt
                            </Link>
                          </>
                        ) : null}
                      </>
                    ) : (
                      <span>draft</span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </PaperShell>
  );
}
