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
    // Capacitor Android Gradle build output (generated JS)
    "android/app/build/**",
  ]),
  // Legacy CommonJS tooling — not part of the Next.js app bundle.
  {
    name: "node-scripts",
    files: ["scripts/**/*.js", "docs/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Baseline: 0 errors; tighten these over time as refactors land.
  // - `no-img-element`: most media is dynamic Supabase/CDN URLs; `next/image` needs broad remotePatterns.
  // - `set-state-in-effect`: many legitimate init/sync patterns (drawer reset, counts from props); use queueMicrotask/startTransition when adding new effects.
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "react/no-unescaped-entities": "error",
      "react-hooks/purity": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
]);

export default eslintConfig;
