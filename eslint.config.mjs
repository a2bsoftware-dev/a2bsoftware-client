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
    // Standalone CommonJS Node script for the Dockerfile's HEALTHCHECK - runs
    // directly via `node healthcheck.js`, outside the Next.js/TS app bundle
    // and its module system (no "type": "module" in package.json, so
    // require() here is correct, not a violation to fix).
    "healthcheck.js",
  ]),
]);

export default eslintConfig;
