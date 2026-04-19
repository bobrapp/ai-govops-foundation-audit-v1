/**
 * WebCrypto-backed HMAC-SHA256 + SHA-256 helpers.
 * Works in Node 18+, Deno, Bun, Cloudflare Workers, and modern browsers.
 */
const enc = new TextEncoder();

function getCrypto(): Crypto {
  if (typeof globalThis.crypto?.subtle === "undefined") {
    throw new Error(
      "WebCrypto subtle API not available. Use Node >=18, Deno, Bun, or a modern browser.",
    );
  }
  return globalThis.crypto;
}

export function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(bytes: Uint8Array | string): Promise<string> {
  const data = typeof bytes === "string" ? enc.encode(bytes) : bytes;
  const buf = await getCrypto().subtle.digest("SHA-256", data);
  return toHex(buf);
}

export async function hmacSha256Hex(
  secret: string,
  message: string,
): Promise<string> {
  const key = await getCrypto().subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await getCrypto().subtle.sign("HMAC", key, enc.encode(message));
  return toHex(sig);
}
