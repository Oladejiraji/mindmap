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
  // Inside convex/, force the custom wrappers (userQuery, userMutation,
  // llmAction) defined in lib/functions.ts. Importing the bare
  // query/mutation/action from _generated/server bypasses auth and
  // rate-limiting — internal variants are still fine.
  {
    files: ["convex/**/*.ts"],
    ignores: ["convex/_generated/**", "convex/lib/functions.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "./_generated/server",
              importNames: ["query", "mutation", "action"],
              message:
                "Import userQuery / userMutation / llmAction from ./lib/functions instead. These bake in auth + rate-limiting. For server-to-server helpers, use internalQuery / internalMutation / internalAction.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
