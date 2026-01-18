/**
 * Lint-staged configuration for running linters on staged files
 * Runs Prettier formatting and ESLint on committed code
 */

export default {
  // Run Prettier and ESLint on TypeScript/TSX files (excluding node_modules and dist)
  '**/*.{ts,tsx}': (filenames) =>
    filenames
      .filter((file) => !file.includes('node_modules') && !file.includes('dist'))
      .flatMap((file) => [`prettier --write ${file}`, `eslint --fix --max-warnings 0 ${file}`]),

  // Run Prettier on CSS and JSON files (excluding node_modules and dist)
  '**/*.{css,json}': (filenames) =>
    filenames
      .filter((file) => !file.includes('node_modules') && !file.includes('dist'))
      .map((file) => `prettier --write ${file}`),
};
