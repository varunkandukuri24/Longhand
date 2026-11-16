import { getExampleSignature } from "@/lib/landing/example-signature";
import { dmMonoOg, literataOg } from "@/lib/og/fonts";
import { ROOF } from "@/lib/scene/window";
import { ImageResponse } from "next/og";

export const alt = "Longhand";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const example = await getExampleSignature();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#FFFFFF",
          color: "#1C1A16",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "72px 80px",
            width: 780,
            height: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Literata",
              fontSize: 26,
              color: "#736C61",
            }}
          >
            Longhand
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 18,
              fontFamily: "Literata",
              fontSize: 76,
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
            }}
          >
            Prove you write it, not AI
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 20,
              fontFamily: "Literata",
              fontSize: 28,
              lineHeight: 1.35,
              color: "#5C564C",
              maxWidth: 560,
            }}
          >
            Write here. Publish with a record of how it was written.
          </div>
          {example ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 36,
                maxWidth: 520,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                }}
              >
                {/* Seal as inline SVG — React components aren't always available in OG */}
                <svg
                  width="34"
                  height="34"
                  viewBox="0 0 44 44"
                  fill="none"
                >
                  <circle
                    cx="22"
                    cy="22"
                    r="20.5"
                    stroke="#3D5A8A"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx="22"
                    cy="22"
                    r="16.5"
                    stroke="#3D5A8A"
                    strokeWidth="0.8"
                  />
                  <path
                    d="M15.5 26.5c2.2-0.4 4.2-2.2 5.6-4.6 1.2-2 2.2-4.6 4.4-6 1.6-1 3.1-0.6 3 0.9-0.2 2.2-3.4 4-6 5.2"
                    stroke="#3D5A8A"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14.5 29.5h15"
                    stroke="#3D5A8A"
                    strokeWidth="1"
                    strokeLinecap="round"
                  />
                </svg>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      fontFamily: "Literata",
                      fontSize: 22,
                      lineHeight: 1.3,
                    }}
                  >
                    {example.sentence}
                  </div>
                  {example.meta ? (
                    <div
                      style={{
                        display: "flex",
                        marginTop: 6,
                        fontFamily: "DM Mono",
                        fontSize: 16,
                        color: "#736C61",
                      }}
                    >
                      {example.meta}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div
          style={{
            position: "absolute",
            top: 72,
            right: 72,
            width: 220,
            height: 360,
            display: "flex",
            border: "2px solid #1C1A16",
            background: "#6FA7D8",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "28%",
              display: "flex",
            }}
          >
            <svg
              viewBox="0 0 100 20"
              width="100%"
              height="100%"
              preserveAspectRatio="none"
            >
              <path d={ROOF} fill="#5A5550" />
            </svg>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            right: 72,
            bottom: 40,
            display: "flex",
            fontFamily: "DM Mono",
            fontSize: 18,
            color: "#736C61",
          }}
        >
          typelonghand.com
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Literata",
          data: literataOg,
          style: "normal",
          weight: 400,
        },
        {
          name: "DM Mono",
          data: dmMonoOg,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
