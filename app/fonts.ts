import localFont from "next/font/local";

export const literata = localFont({
  src: "./fonts/literata-400.woff2",
  variable: "--font-literata",
  display: "swap",
  weight: "400",
});

export const dmMono = localFont({
  src: [
    { path: "./fonts/dm-mono-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/dm-mono-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-dm-mono",
  display: "swap",
});

export const newsreader = localFont({
  src: "./fonts/newsreader-400.woff2",
  variable: "--font-newsreader",
  display: "swap",
  weight: "400",
});

export const instrumentSans = localFont({
  src: "./fonts/instrument-sans-400.woff2",
  variable: "--font-instrument-sans",
  display: "swap",
  weight: "400",
});
