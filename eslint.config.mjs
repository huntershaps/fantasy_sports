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
    // Generated or copied build output, none of it hand-written:
    // src/generated is the Prisma client; .netlify is what the Netlify CLI
    // leaves behind, and it contains a full copy of the Next build, which is
    // what put 6487 problems in front of any real finding.
    "src/generated/**",
    ".netlify/**",
  ]),
]);

export default eslintConfig;
