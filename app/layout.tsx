import type { Metadata, Viewport } from "next";
import { dmMono, literata } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Longhand",
  description: "Focused writing with shareable proof of effort.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${literata.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-paper text-ink">
        {children}
      </body>
    </html>
  );
}
