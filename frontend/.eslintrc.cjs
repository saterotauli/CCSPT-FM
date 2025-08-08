module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ["airbnb-base", "prettier"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ["@typescript-eslint", "prettier", "react", "react-hooks"],
  ignorePatterns: ["**/dist/*", "**/node_modules/*", "**/*.json", "**/*.js"],
  rules: {
    "prettier/prettier": [
      "error",
      {
        endOfLine: "auto",
      },
    ],
    indent: "off",
    "no-shadow": "off",
    "lines-between-class-members": "off",
    "linebreak-style": "off",
    "arrow-body-style": "off",
    "prefer-destructuring": "off",
    "no-console": "off",
    "no-param-reassign": "off",
    "eol-last": "off",
    "no-unused-vars": "off",
    "class-methods-use-this": "off",
    "no-await-in-loop": "off",
    "no-return-assign": "off",
    "no-restricted-syntax": "off",
    "no-useless-constructor": "off",
    "no-empty-function": "off",
    "no-continue": "off",
    "no-underscore-dangle": "off",
    "guard-for-in": "off",
    "import/extensions": [
      "error",
      "ignorePackages",
      {
        ts: "never",
        tsx: "never",
      },
    ],
    "react/react-in-jsx-scope": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "import/prefer-default-export": "off",
    "no-plusplus": "off",
  },
  settings: {
    "import/resolver": {
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx", ".d.ts"],
      },
    },
  },
  overrides: [
    {
      files: ["*.test.ts"],
      env: {
        jest: true,
      },
    },
  ],
};
