/**
 * Load a Google Font binary for next/og ImageResponse.
 * Requests a TrueType/OpenType file — Satori rejects woff2 (wOF2).
 */
export async function loadGoogleFont(
  family: string,
  weight = 400,
  style: "normal" | "italic" = "normal",
): Promise<ArrayBuffer> {
  const axis =
    style === "italic"
      ? `ital,wght@1,${weight}`
      : `wght@${weight}`;
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:${axis}`;

  // Older Safari UA makes Google Fonts serve TTF instead of woff2.
  const css = await fetch(cssUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
    },
  }).then((res) => {
    if (!res.ok) {
      throw new Error(`font css ${res.status}`);
    }
    return res.text();
  });

  const match =
    css.match(/src:\s*url\(([^)]+)\)\s*format\('(truetype|opentype)'\)/) ??
    css.match(/src:\s*url\(([^)]+)\)/);
  if (!match?.[1]) {
    throw new Error(`font url missing for ${family}`);
  }

  const fontRes = await fetch(match[1]);
  if (!fontRes.ok) {
    throw new Error(`font file ${fontRes.status}`);
  }
  return fontRes.arrayBuffer();
}
