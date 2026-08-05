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
  ]),
  {
    rules: {
      // The dashboard contains API response models that are incrementally typed.
      "@typescript-eslint/no-explicit-any": "warn",
      // This application intentionally initializes client auth/data state from effects.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
