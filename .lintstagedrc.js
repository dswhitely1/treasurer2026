/**
 * Lint-staged configuration for running linters on staged files
 * Runs Prettier formatting and ESLint on committed code
 */

export default {
  // Run Prettier and ESLint on TypeScript/TSX files
  '**/*.{ts,tsx}': ['prettier --write', 'eslint --fix --max-warnings 0'],

  // Run Prettier on CSS and JSON files (no linting)
  '**/*.{css,json}': ['prettier --write'],

  // Exclude node_modules and dist directories
  '!**/node_modules/**': true,
  '!**/dist/**': true,
};
