import { PaperPage, PAGE_TOP_OFFSET_PX } from "@/components/scene/PaperPage";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy · Longhand",
  description: "What we keep, and what stays private.",
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
        What we keep, and what stays private.
      </p>

      <div className="mt-10 flex flex-col gap-8 font-writing text-[17px] leading-[1.65] text-ink">
        <section>
          <h2 className="font-ui text-[12px] tracking-[0.14em] text-label uppercase">
            Account
          </h2>
          <p className="mt-3">
            You sign in with Google or an emailed link. Your pages only ever show
            the name and address you pick, never your email. An optional writing
            city is stored only to set the side window; it is never shown on
            public pages.
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
            public replay. The event log is never served publicly. We never sell
            or share your typing data or use it to train AI, and it&apos;s deleted
            with the piece.
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
            and everything in them, are deleted after 7 days. To stop spam we
            count new pages per network, using a scrambled version of your IP
            address that we delete after a day.
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

        <section>
          <h2 className="font-ui text-[12px] tracking-[0.14em] text-label uppercase">
            Analytics
          </h2>
          <p className="mt-3">
            We count visits with Vercel Web Analytics, which uses no cookies, and
            we keep simple counts of what happens in the app, like when a piece
            is published. None of it includes what you write.
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
