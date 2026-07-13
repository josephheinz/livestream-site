# MiniMessage Ticker and Stream Title Design

## Goal

Render administrator-authored MiniMessage formatting in the public stream title and ticker tape while keeping the stored dashboard values unchanged for editing.

## Rendering

Add one small client-side `MiniMessageText` component backed by `minimessage-js`. It deserializes the supplied string and renders directly into a referenced DOM element using the library's DOM renderer. This avoids HTML-string injection and keeps all parsing behavior in the dependency.

Use the component for the large public stream heading and each ticker item. The automatic `ON AIR` prefix remains ordinary text, while the embedded stream title keeps its MiniMessage formatting. Plain strings continue to render normally.

## Allowed Behavior

Support the library's normal formatting and interactive tags except player heads and obfuscated text. `<head>` and `<obf>`/`<obfuscated>` must never activate their DOM effects. Invalid markup must fall back to readable text rather than breaking the title or ticker.

Dashboard inputs continue storing and displaying raw MiniMessage strings. No schema or Convex changes are needed.

## Verification

Focused component tests cover nested formatting in the stream heading and ticker, forbidden player-head and obfuscated effects, malformed input fallback, and unchanged plain text. Run the focused tests, typecheck, and lint before completion.
