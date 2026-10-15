import { PaperShell } from "@/components/scene/PaperShell";

/**
 * Public receipt pages: paper, grain, left window with reader's clear sky.
 */
export default function PublicReceiptLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PaperShell publicPage>{children}</PaperShell>;
}
