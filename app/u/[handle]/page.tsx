import { PaperPage, PAGE_TOP_OFFSET_PX } from "@/components/scene/PaperPage";
import { resolveHandle } from "@/lib/handles/resolve";
import { writerOrigin } from "@/lib/hosts";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

type PageProps = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const resolved = await resolveHandle(handle);
  if (resolved.kind !== "user") {
    return { title: "Longhand" };
  }
  const name = resolved.name?.trim() || resolved.handle;
  return {
    title: `${name} · Longhand`,
    description: `${name} on Longhand`,
  };
}

/**
 * Writer's personal page (served on `{handle}.{ROOT_DOMAIN}` via proxy rewrite).
 * Full layout lands in a later step; routing and redirects ship here.
 */
export default async function WriterPage({ params }: PageProps) {
  const { handle } = await params;
  const resolved = await resolveHandle(handle);

  if (resolved.kind === "redirect") {
    permanentRedirect(writerOrigin(resolved.handle));
  }
  if (resolved.kind === "missing") {
    notFound();
  }

  const name = resolved.name?.trim() || resolved.handle;

  return (
    <PaperPage topOffsetPx={PAGE_TOP_OFFSET_PX} publicPage>
      <h1
        className="font-writing text-[40px] leading-[1.15] text-ink"
        data-paper-heading
      >
        {name}
      </h1>
      <p className="mt-3 font-writing text-[17px] text-[#5C564C]">
        Nothing published here yet.
      </p>
    </PaperPage>
  );
}
