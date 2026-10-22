import { PaperPage, PAGE_TOP_OFFSET_PX } from "@/components/scene/PaperPage";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy · Longhand",
  description: "What Longhand stores, and what stays private.",
};

export default function PrivacyPage() {
  return (
    <PaperPage topOffsetPx={PAGE_TOP_OFFSET_PX}>
      <h1
        className="font-writing text-[32px] leading-tight text-ink"
        data-paper-heading
      >
        Privacy
      </h1>
      <p className="mt-3 font-ui text-[13px] text-label">
        What Longhand stores, and what stays private.
      </p>

      <div className="mt-10 flex flex-col gap-8 font-writing text-[17px] leading-[1.65] text-ink">
        <section>
          <h2 className="font-ui text-[12px] tracking-[0.14em] text-label uppercase">
            Account
          </h2>
          <p className="mt-3">
            Sign-in uses your email address and a magic link. Public pages show
            only the display name and page address you choose, never any part of
            your email. An optional writing city is stored only to set the side
            window; it is never shown on public pages.
          </p>
        </section>

        <section>
          <h2 className="font-ui text-[12px] tracking-[0.14em] text-label uppercase">
            Drafts and the writing log
          </h2>
          <p className="mt-3">
            Drafts and the event log are private to you. Nothing is public until
            you publish. Private pieces are reachable only by their link: never
            listed on your page, left out of sitemaps, and marked so search
            engines should not index them. Sign-in cookies stay on the main
            domain and are never shared with writers&apos; subdomains.
          </p>
        </section>

        <section>
          <h2 className="font-ui text-[12px] tracking-[0.14em] text-label uppercase">
            Published pieces
          </h2>
          <p className="mt-3">
            Public pages show the text and the effort receipt only. There is no
            public replay. The event log is never served publicly. Keystroke
            timing is treated as sensitive: it is never sold, shared, or used for
            training, and it is deleted with the piece.
          </p>
        </section>

        <section>
          <h2 className="font-ui text-[12px] tracking-[0.14em] text-label uppercase">
            Guests
          </h2>
          <p className="mt-3">
            You can write before signing in. Longhand stores one random cookie
            in your browser so it can save that page. The server keeps only a
            hash of the cookie, not the cookie itself. Unclaimed guest pages,
            and everything in them, are deleted after 7 days. Rate limits use a
            keyed hash of your network address, never the address in the clear,
            and those records are deleted after a day.
          </p>
        </section>

        <section>
          <h2 className="font-ui text-[12px] tracking-[0.14em] text-label uppercase">
            Links
          </h2>
          <p className="mt-3">
            Longhand never fetches linked pages. A reference is only the address
            you typed. Published links open with{" "}
            <span className="font-ui text-[13px]">rel=&quot;noopener nofollow ugc&quot;</span>
            . The server makes no outbound requests for links in a piece.
          </p>
        </section>
      </div>

      <p className="mt-12 font-ui text-[12px] text-label">
        <Link
          href="/signin"
          className="underline decoration-[#BDB6AA] underline-offset-4 hover:decoration-ink"
        >
          Sign in
        </Link>
      </p>
    </PaperPage>
  );
}
