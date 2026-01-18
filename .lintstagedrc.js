/**
 * Lint-staged configuration for running linters on staged files
 * Runs Prettier formatting and ESLint on committed code
 */

export default {
  // Run Prettier and ESLint on TypeScript/TSX files (excluding node_modules and dist)
  '**/*.{ts,tsx}': (filenames) => {
    const filtered = filenames.filter(
      (file) => !file.includes('node_modules') && !file.includes('dist')
    )
    const commands = []

    // Group files by workspace and run eslint in the correct context
    const apiFiles = filtered.filter((file) => file.includes('treasurer-api/'))
    const frontendFiles = filtered.filter((file) => file.includes('treasurer/'))

    // Run prettier on all files
    commands.push(...filtered.map((file) => `prettier --write ${file}`))

    // Run eslint from the correct workspace
    if (apiFiles.length > 0) {
      const relativeFiles = apiFiles.map((file) => file.replace(/^.*treasurer-api\//, ''))
      commands.push(
        `pnpm --filter treasurer-api exec eslint --fix --max-warnings 0 ${relativeFiles.join(' ')}`
      )
    }
    if (frontendFiles.length > 0) {
      const relativeFiles = frontendFiles.map((file) => file.replace(/^.*treasurer\//, ''))
      commands.push(
        `pnpm --filter treasurer exec eslint --fix --max-warnings 0 ${relativeFiles.join(' ')}`
      )
    }

    return commands
  },

  // Run Prettier on CSS and JSON files (excluding node_modules and dist)
  '**/*.{css,json}': (filenames) =>
    filenames
      .filter((file) => !file.includes('node_modules') && !file.includes('dist'))
      .map((file) => `prettier --write ${file}`),
};
