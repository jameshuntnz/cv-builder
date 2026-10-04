import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

const NO_CASTS = [
  { selector: "TSAsExpression", message: "No `as` casts. Narrow with a type guard." },
  { selector: "TSTypeAssertion", message: "No type assertions. Narrow with a type guard." },
];

/*
  Tests assert exact values on specific elements. A prefix, a substring, "some object with
  these keys" or "any string" passes for the wrong reasons, so those matchers aren't allowed:
  compare the whole text, the whole list, the whole object. (toBeCloseTo stays, for decimals.)
*/
const LOOSE =
  "toMatch|toContain|toContainText|toHaveTextContent|toMatchObject|toBeGreaterThan|toBeGreaterThanOrEqual|toBeLessThan|toBeLessThanOrEqual|toBeTruthy|toBeFalsy|toBeDefined";
const EXACT_ASSERTIONS = [
  {
    selector: `CallExpression[callee.property.name=/^(${LOOSE})$/]`,
    message:
      "Assert the exact value: toBe, toEqual, toHaveText or a full list, on the element itself.",
  },
  {
    selector:
      "MemberExpression[object.name='expect'][property.name=/^(any|anything|stringContaining|stringMatching|objectContaining|arrayContaining)$/]",
    message: "Assert the exact value, not a shape or a pattern.",
  },
];

export default tseslint.config(
  {
    ignores: [
      "dist",
      "coverage",
      "node_modules",
      "test-results",
      "playwright-report",
      "a11y-report",
    ],
  },
  {
    // Inline `eslint-disable` comments are not honoured, and any left behind are errors.
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: "error" },
  },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat["recommended-latest"],
    ],
    plugins: { "react-refresh": reactRefresh },
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        { considerDefaultExhaustiveForUnions: true, requireDefaultForNonUnion: true },
      ],
      "@typescript-eslint/prefer-readonly": "error",
      "react-refresh/only-export-components": ["error", { allowConstantExport: true }],
      // No casts of any kind, `as const` included: narrow with a type guard instead.
      "no-restricted-syntax": ["error", ...NO_CASTS],
      eqeqeq: "error",
      complexity: ["error", 14],
      "max-depth": ["error", 3],
      "max-params": ["error", 4],
      "no-console": "error",
      "no-param-reassign": ["error", { props: false }],
    },
  },
  {
    files: ["test/**/*.{ts,tsx}", "e2e/**/*.ts"],
    rules: { "no-restricted-syntax": ["error", ...NO_CASTS, ...EXACT_ASSERTIONS] },
  },
  {
    // Declaration merging into React's CSSProperties needs an index signature; a Record
    // can't merge into an interface.
    files: ["src/react-css.d.ts"],
    rules: { "@typescript-eslint/consistent-indexed-object-style": "off" },
  },
  {
    // Specs take `test` from e2e/test.ts, which is what puts the accessibility watcher on them.
    files: ["e2e/**/*.spec.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@playwright/test", message: "Import test and expect from e2e/test.ts." },
          ],
        },
      ],
    },
  },
  {
    // The in-page scanner can only report a failed scan to the browser console.
    files: ["e2e/a11y/inPage.ts"],
    rules: { "no-console": ["error", { allow: ["warn"] }] },
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: { globals: globals.node },
  },
  {
    rules: { "max-lines": ["error", { max: 400, skipBlankLines: false, skipComments: false }] },
  },
);
