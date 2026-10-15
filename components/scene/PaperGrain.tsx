/** Full-viewport paper grain from DESIGN.md. */
export function PaperGrain() {
  return (
    <svg
      className="paper-grain"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
    >
      <filter id="paper-noise">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.85"
          numOctaves="2"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#paper-noise)" />
    </svg>
  );
}
