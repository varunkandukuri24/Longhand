import type { Metadata, Viewport } from "next";
import { VercelAnalytics } from "@/components/analytics/VercelAnalytics";
import { rootDomain, siteProtocol } from "@/lib/hosts";
import { dmMono, literata } from "./fonts";
import "./globals.css";

function metadataBaseUrl(): URL | undefined {
  try {
    return new URL(`${siteProtocol()}://${rootDomain()}`);
  } catch {
    return undefined;
  }
}

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: "Longhand",
  description: "A place to write for humans",
  openGraph: {
    title: "Longhand",
    description: "A place to write for humans",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  let analyticsRoot = "localhost:3000";
  try {
    analyticsRoot = rootDomain();
  } catch {
    /* ROOT_DOMAIN unset in some test/build contexts */
  }

  return (
    <html
      lang="en"
      className={`${literata.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-paper text-ink">
        {children}
        <VercelAnalytics rootDomain={analyticsRoot} />
      </body>
    </html>
  );
}
