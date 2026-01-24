---
name: vite
description: |
  Configures Vite build tool with hot module replacement for React frontend development.
  Use when: configuring build settings, adding plugins, optimizing bundle size, setting up HMR, or configuring test environments with Vitest.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# Vite Skill

Vite 5.x powers the frontend build with instant server start and lightning-fast HMR. This project uses Vite for both development (`pnpm dev`) and production builds (`pnpm build`), with Vitest integrated for testing via the same configuration file.

## Quick Start

### Development Server

```bash
# Start dev server with HMR (port 3000)
cd treasurer && pnpm dev

# Preview production build
pnpm preview
```

### Production Build

```bash
# TypeScript check + Vite build
pnpm build

# Output: treasurer/dist/
```

## Configuration Overview

```typescript
// treasurer/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true, // Required for Docker
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    css: true,
  },
})
```

## Key Concepts

| Concept | Usage | Example |
|---------|-------|---------|
| Path alias | Import from `@/` | `import { Button } from '@/components/ui'` |
| HMR | Automatic on file save | Edit `.tsx` files |
| Code splitting | Manual chunks | `manualChunks: { vendor: [...] }` |
| Test integration | Vitest in same config | `test: { environment: 'jsdom' }` |
| Docker support | `host: true` in server | Exposes to all interfaces |

## Common Patterns

### Adding Environment Variables

```typescript
// Access in code via import.meta.env
const apiUrl = import.meta.env.VITE_API_URL

// .env file (must prefix with VITE_)
VITE_API_URL=http://localhost:3001/api
VITE_APP_TITLE=Treasurer
```

### Manual Chunks for Bundle Optimization

```typescript
// vite.config.ts - already configured
rollupOptions: {
  output: {
    manualChunks: {
      vendor: ['react', 'react-dom'],
      router: ['react-router-dom'],
      redux: ['@reduxjs/toolkit', 'react-redux'],
    },
  },
},
```

### Proxy API Requests (Alternative to CORS)

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    },
  },
},
```

## See Also

- [unit](references/unit.md) - Unit testing patterns with Vitest
- [integration](references/integration.md) - Integration testing with MSW
- [mocking](references/mocking.md) - Mocking strategies for tests
- [fixtures](references/fixtures.md) - Test fixture patterns

## Related Skills

- See the **react** skill for React component patterns
- See the **vitest** skill for detailed testing configuration
- See the **typescript** skill for TypeScript strict mode setup
- See the **tailwind** skill for CSS configuration

## Documentation Resources

> Fetch latest Vite documentation with Context7.

**Library ID:** `/websites/vite_dev` _(website documentation preferred over source code)_

**Recommended Queries:**
- "vite configuration options"
- "vite build optimization"
- "vite env variables"
- "vite server proxy"