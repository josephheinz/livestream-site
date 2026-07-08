/**
 * HLS playlist rewriting for the same-origin proxy (research D15).
 *
 * Playlists reference their segments (and init/variant files) by URI; those
 * must resolve back through the proxy, never to the node-media-server origin.
 */
export function rewritePlaylist(
  playlist: string,
  proxyPrefix: string,
  playlistUrl: string,
): string {
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
          (_match, uri: string) =>
            `URI="${rewriteUri(uri, proxyPrefix, playlistUrl)}"`,
        );
      }
      return line.replace(trimmed, rewriteUri(trimmed, proxyPrefix, playlistUrl));
    })
    .join("\n");
}

function rewriteUri(
  uri: string,
  proxyPrefix: string,
  playlistUrl: string,
): string {
  if (/^(https?:)?\/\//i.test(uri) || uri.startsWith("/")) {
    // An absolute URI would leak the origin host. When it points inside the
    // playlist's own directory, keep the nested path so the proxy can resolve
    // it; anything off-origin falls back to the bare file name.
    const dir = playlistUrl.slice(0, playlistUrl.lastIndexOf("/") + 1);
    const resolved = new URL(uri, playlistUrl);
    resolved.search = "";
    if (resolved.href.startsWith(dir)) {
      return proxyPrefix + resolved.href.slice(dir.length);
    }
    const basename = uri.split("?")[0].split("/").pop() ?? "";
    return proxyPrefix + basename;
  }
  return proxyPrefix + uri;
}
