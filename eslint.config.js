import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default defineConfig([
  // reference/ and templates/ are separate packages (own deps, tsconfig, tests); runs/ is generated
  globalIgnores(["**/dist/", "runs/", "reference/", "templates/"]),
  js.configs.recommended,
  tseslint.configs.recommended,
]);
