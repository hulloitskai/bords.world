import js from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier/flat"
import packageJson from "eslint-plugin-package-json"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import toml from "eslint-plugin-toml"
import tseslint from "typescript-eslint"
import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.nodeBuiltin,
    },
  },
  {
    files: [
      "scripts/check-recording-controls.js",
      "scripts/download-sounds.js",
    ],
    languageOptions: {
      globals: {
        document: "readonly",
        getComputedStyle: "readonly",
        Node: "readonly",
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ["**/package.json"],
    extends: [packageJson.configs.recommended],
  },
  {
    files: ["**/mise.toml"],
    extends: [toml.configs.recommended],
  },
  eslintConfigPrettier,
])
