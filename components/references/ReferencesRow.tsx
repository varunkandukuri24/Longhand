import { QuoteIcon } from "@/components/icons/LonghandIcons";
import type { Reference } from "@/lib/references";

type ReferencesRowProps = {
  references: readonly Reference[];
  /** When true, pills are plain labels (editor). When false, they are links. */
  plain?: boolean;
};

function PillInner({ label }: { label: string }) {
  return (
    <>
      <QuoteIcon size={12} className="text-label" />
      <span>{label}</span>
    </>
  );
}

export function ReferencesRow({
  references,
  plain = false,
}: ReferencesRowProps) {
  if (references.length === 0) {
    return null;
  }

  return (
    <div className="mt-14 w-full" data-references-row>
      <p className="font-ui text-[11px] tracking-[0.14em] text-[#9A9387] uppercase">
        References
      </p>
      <ul className="mt-3 flex flex-wrap gap-2.5">
        {references.map((ref) => (
          <li key={ref.url} className="min-w-0 max-w-full">
            {plain ? (
              <span className="reference-pill">
                <PillInner label={ref.label} />
              </span>
            ) : (
              <a
                href={ref.url}
                target="_blank"
                rel="noopener nofollow ugc"
                className="reference-pill"
              >
                <PillInner label={ref.label} />
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
