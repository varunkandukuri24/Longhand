/** SHA-256 hex digest via Web Crypto (client; also available in Node 20+). */
export async function sha256HexWeb(utf8: string): Promise<string> {
  const data = new TextEncoder().encode(utf8);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
