type ResponseLineProps = {
  title: string;
  url: string;
  /** Shown after the title on the writing/public page. */
  site?: string;
  /** Public receipt uses "Response to"; editor/page use "In response to". */
  variant?: "page" | "receipt";
};

export function ResponseLine({
  title,
  url,
  site,
  variant = "page",
}: ResponseLineProps) {
  if (variant === "receipt") {
    return (
      <p className="font-ui text-[12px] text-ink/60">
        Response to{" "}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          {title}
        </a>
      </p>
    );
  }

  return (
    <p className="font-ui text-[12px] text-ink/55">
      In response to{" "}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline-offset-2 hover:underline"
      >
        {title}
      </a>
      {site ? (
        <>
          <span className="text-ink/35"> · </span>
          <span>{site}</span>
        </>
      ) : null}
    </p>
  );
}
