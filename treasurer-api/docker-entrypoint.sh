#!/bin/sh
set -e

echo "Waiting for database to be ready..."
sleep 2

echo "Generating Prisma client..."
pnpm db:generate

echo "Running database migrations..."
pnpm db:push

echo "Starting application..."
exec "$@"
