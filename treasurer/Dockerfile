FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code (will be overwritten by volume mount in dev)
COPY . .

# Expose Vite dev server port
EXPOSE 3000

# Start development server (--host exposes to Docker network)
CMD ["npx", "vite", "--host"]
