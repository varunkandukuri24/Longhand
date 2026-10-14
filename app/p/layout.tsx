/**
 * Public receipt pages: night room fills the viewport at any content length.
 */
export default function PublicReceiptLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`body { background: #1D2430; }`}</style>
      <div className="min-h-screen bg-room-night">{children}</div>
    </>
  );
}
