import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Quill + baseline from the receipt seal, ~60% of the square and centred. */
export default function AppleIcon() {
  // Seal coords: mark spans ~14.5–29.5 (w 15), ~16–29.5 (h 13.5); centre ≈ (22, 22.75).
  const scale = (180 * 0.6) / 15;
  const tx = 90 - 22 * scale;
  const ty = 90 - 22.75 * scale;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#3D5A8A",
        }}
      >
        <svg width="180" height="180" viewBox="0 0 180 180">
          <g
            transform={`translate(${tx} ${ty}) scale(${scale})`}
            fill="none"
            stroke="#FFFFFF"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M15.5 26.5c2.2-0.4 4.2-2.2 5.6-4.6 1.2-2 2.2-4.6 4.4-6 1.6-1 3.1-0.6 3 0.9-0.2 2.2-3.4 4-6 5.2"
              strokeWidth="1.4"
            />
            <path d="M14.5 29.5h15" strokeWidth="1" />
          </g>
        </svg>
      </div>
    ),
    { ...size },
  );
}
