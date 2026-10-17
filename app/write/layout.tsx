import { instrumentSans, newsreader } from "@/app/fonts";
import type { ReactNode } from "react";

/** Load Newsreader and Instrument Sans only on the writing screen. */
export default function WriteLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${newsreader.variable} ${instrumentSans.variable}`}>
      {children}
    </div>
  );
}
