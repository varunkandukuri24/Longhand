/** "Write on Longhand" on writer subdomain pages (DESIGN.md). */

type WriteOnLonghandLinkProps = {
  /** Absolute URL to the main site, from mainOrigin() on the server. */
  href: string;
};

export function WriteOnLonghandLink({ href }: WriteOnLonghandLinkProps) {
  return (
    <a href={href} className="write-on-longhand">
      Write on Longhand
    </a>
  );
}
