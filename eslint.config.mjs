import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Design-brief artifacts, not app code
    "docs/**",
    // Local dev media server + its HLS output (`.ts` segments are MPEG-TS, not TypeScript)
    "tools/media-server/**",
    // Vendored Dice UI registry code — upstream style, not ours
    "components/ui/media-player.tsx",
    "lib/compose-refs.ts",
  ]),
]);

export default eslintConfig;
