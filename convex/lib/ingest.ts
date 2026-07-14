export function generateIngestKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export function deriveLiveUrl(base: string, key: string): string {
  return `${base}/live/${key}/index.m3u8`;
}
