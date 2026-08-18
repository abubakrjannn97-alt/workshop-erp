import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const coreBoundaryPatterns = [
  {
    group: ["@/app", "@/app/**"],
    message: "Core must not import from the app layer.",
  },
  {
    group: ["@/components", "@/components/**"],
    message: "Core must not import from the components layer.",
  },
  {
    group: ["@/domains", "@/domains/**"],
    message:
      "Core must not import from domains (except domain-config.ts and i18n-domain.ts importing registry).",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/core/**/*.{ts,tsx}"],
    ignores: [
      "src/core/config/domain-config.ts",
      "src/core/config/i18n-domain.ts",
    ],
    rules: {
      "no-restricted-imports": ["error", { patterns: coreBoundaryPatterns }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".tmp/**",
  ]),
]);

export default eslintConfig;
