FROM node:20-alpine

WORKDIR /app

# Install pnpm and OpenSSL for Prisma
RUN corepack enable && corepack prepare pnpm@latest --activate \
    && apk add --no-cache openssl

# Copy package files
COPY package.json ./

# Install dependencies
RUN pnpm install

# Copy prisma schema for generation
COPY prisma ./prisma/

# Generate Prisma client
RUN pnpm db:generate

# Copy source code (will be overwritten by volume mount in dev)
COPY . .

# Expose API port
EXPOSE 3001

# Copy and use entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["pnpm", "dev"]
