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
    // The Prisma client is generated and partly minified. Linting it reports
    // thousands of problems in code nobody writes or can fix, which buries any
    // real finding in our own source.
    "src/generated/**",
  ]),
]);

export default eslintConfig;
