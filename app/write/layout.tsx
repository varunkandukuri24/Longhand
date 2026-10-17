import { Instrument_Sans, Newsreader } from "next/font/google";
import type { ReactNode } from "react";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

/** Load Newsreader and Instrument Sans only on the writing screen. */
export default function WriteLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${newsreader.variable} ${instrumentSans.variable}`}>
      {children}
    </div>
  );
}
