import { DashboardSettings } from "@/components/dashboard/DashboardSettings";
import { NewPieceActions } from "@/components/dashboard/NewPieceActions";
import { PaperPage, PAGE_TOP_OFFSET_PX } from "@/components/scene/PaperPage";
import { signOut } from "@/auth";
import { db } from "@/db";
import { pieces } from "@/db/schema";
import { requireUserWithDisplayName } from "@/lib/auth/display-name";
import { dashboardDisplayTitle } from "@/lib/dashboard/display-title";
import { rootDomain } from "@/lib/hosts";
import { writerPageUrl } from "@/lib/piece-urls";
import { loadPieceState } from "@/lib/pieces/load-state";
import { wordCount } from "@/lib/receipt/compute-receipt";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await requireUserWithDisplayName();
  const domain = rootDomain();

  const userPieces = await db
    .select({
      id: pieces.id,
      title: pieces.title,
      status: pieces.status,
      visibility: pieces.visibility,
      slug: pieces.slug,
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
        title: piece.title,
        bodyText: text,
      });
      return {
        id: piece.id,
        display,
        status: piece.status,
        visibility: piece.visibility,
        slug: piece.slug,
        words: wordCount(text),
        updatedAt: piece.updatedAt,
      };
    }),
  );

  return (
    <PaperPage
      topOffsetPx={PAGE_TOP_OFFSET_PX}
      initialWindowSide={user.windowSide}
    >
      <header>
        <h1
          className="font-writing text-[32px] leading-tight text-ink"
          data-paper-heading
        >
          Longhand
        </h1>
        <div className="mt-2 flex flex-wrap items-center font-ui text-[13px] text-label">
          <span>{user.name}</span>
          <span className="mx-2 text-label/40">·</span>
          <a
            href={writerPageUrl(user.handle)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink underline decoration-ink underline-offset-4"
          >
            {user.handle}.{domain}
          </a>
          <span className="mx-2 text-label/40">·</span>
          <DashboardSettings
            displayName={user.name}
            handle={user.handle}
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
        <NewPieceActions />
      </div>

      <section className="mt-8">
        {listed.length === 0 ? (
          <p className="font-ui text-[13px] text-label">No pieces yet.</p>
        ) : (
          <ul className="flex flex-col gap-7">
            {listed.map((piece) => {
              const href =
                piece.status === "published" && piece.slug
                  ? `/p/${piece.slug}`
                  : `/write/${piece.id}`;
              const statusLabel =
                piece.status === "published"
                  ? piece.visibility === "private"
                    ? "private"
                    : "public"
                  : "draft";
              return (
                <li key={piece.id}>
                  <Link
                    href={href}
                    className={[
                      "line-clamp-2 font-writing text-[24px] leading-[1.3] underline-offset-2 hover:underline",
                      piece.display.muted ? "text-label" : "text-ink",
                    ].join(" ")}
                  >
                    {piece.display.label}
                  </Link>
                  <p className="mt-1 font-ui text-[12.5px] text-label">
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
                    <span>{statusLabel}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </PaperPage>
  );
}
