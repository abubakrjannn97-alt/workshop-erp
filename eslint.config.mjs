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
      "src/core/config/workshop-domain.ts",
    ],
    rules: {
      "no-restricted-imports": ["error", { patterns: coreBoundaryPatterns }],
    },
  },
  {
    files: [
      "prisma/seed.ts",
      "prisma/seed-demo.ts",
      "prisma/seeds/orchestrator.ts",
      "prisma/seeds/index.ts",
      "prisma/seeds/demo-loader.ts",
      "prisma/seeds/persist-domain-settings.ts",
      "prisma/seeds/core.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/domains/facade/**",
                "**/domains/bakery/**",
                "**/demo/facade-history",
                "../../../src/domains/facade/**",
                "../../../src/domains/bakery/**",
              ],
              message:
                "Seed orchestrator/demo-loader must use DOMAIN_REGISTRY metadata, not a hardcoded domain package.",
            },
          ],
        },
      ],
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
