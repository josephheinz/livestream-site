/**
 * HLS playlist rewriting for the same-origin proxy (research D15).
 *
 * Playlists reference their segments (and init/variant files) by URI; those
 * must resolve back through the proxy, never to the node-media-server origin.
 */
export function rewritePlaylist(playlist: string, proxyPrefix: string): string {
  return playlist
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed === "") {
        return line;
      }
      if (trimmed.startsWith("#")) {
        // Tags may carry URIs too, e.g. #EXT-X-MAP:URI="init.mp4"
        return line.replace(
          /URI="([^"]+)"/g,
          (_match, uri: string) => `URI="${rewriteUri(uri, proxyPrefix)}"`,
        );
      }
      return line.replace(trimmed, rewriteUri(trimmed, proxyPrefix));
    })
    .join("\n");
}

function rewriteUri(uri: string, proxyPrefix: string): string {
  if (/^(https?:)?\/\//i.test(uri) || uri.startsWith("/")) {
    // An absolute URI would leak the origin host. node-media-server emits
    // relative segment URIs; for anything absolute keep only the file name.
    // ponytail: naive basename mapping — proxy nested absolute paths per-directory if an origin ever emits them
    const basename = uri.split("?")[0].split("/").pop() ?? "";
    return proxyPrefix + basename;
  }
  return proxyPrefix + uri;
}
