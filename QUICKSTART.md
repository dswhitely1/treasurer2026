# CI/CD Quick Start Guide

## One-Minute Setup

### 1. Install Dependencies

```bash
cd /home/don/dev/treasurer2026

# Install pnpm dependencies
pnpm install

# Install Husky git hooks
pnpm exec husky install
```

### 2. Start Local Development

**Option A: Using Docker (Recommended)**
```bash
# Start all services
./scripts/deploy-docker.sh --environment dev --detach

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop services
./scripts/deploy-docker.sh --environment dev --action down
```

**Option B: Using Docker Compose directly**
```bash
docker compose -f docker-compose.dev.yml up -d
```

**Access Points:**
- Frontend: http://localhost:3000
- API: http://localhost:3001
- API Docs: http://localhost:3001/api-docs

### 3. Verify Setup

```bash
# Check services are running
docker compose -f docker-compose.dev.yml ps

# Check API health
curl http://localhost:3001/health

# View logs
docker compose -f docker-compose.dev.yml logs api
docker compose -f docker-compose.dev.yml logs client
```

## Git Workflow

### Making Changes

1. Create feature branch:
```bash
git checkout -b feat/my-feature
```

2. Make changes and stage:
```bash
git add src/components/MyComponent.tsx
```

3. Pre-commit hook runs automatically:
   - Prettier formats code
   - ESLint validates (must pass with zero warnings)
   - Fixes applied automatically

4. Commit with conventional message:
```bash
git commit -m "feat(auth): add login functionality"
```

5. Pre-push hook runs automatically:
   - TypeScript type checking
   - Must pass before push allowed

6. Push to GitHub:
```bash
git push origin feat/my-feature
```

7. Create Pull Request:
   - GitHub Actions CI runs automatically
   - Tests, linting, and builds verified
   - Merge only after CI passes

### Valid Commit Types

```
feat      - New feature
fix       - Bug fix
docs      - Documentation changes
style     - Code style (no logic change)
refactor  - Code refactoring
perf      - Performance improvement
test      - Test changes
chore     - Build/dependency updates
ci        - CI configuration
build     - Build system changes
```

**Commit Message Format:**
```
<type>(<scope>): <description>

Examples:
feat(auth): add login functionality
fix(database): resolve connection timeout
docs: update README
chore(deps): upgrade typescript
```

## CI/CD Pipeline

### GitHub Actions

**Automatic on:**
- Push to main branch
- Pull requests

**What it does:**
- Backend tests & linting
- Frontend tests & linting
- TypeScript type checking
- Production builds
- Coverage reporting

**Check status:**
- GitHub Actions tab in repository
- Check marks on commit/PR

### Deploy to Production

**Trigger deployment:**
```bash
# Create version tag
git tag v1.0.0
git push origin v1.0.0
```

**What happens:**
1. GitHub Actions builds Docker images
2. Images pushed to GitHub Container Registry
3. Can be deployed to Kubernetes or Docker Compose

## Common Tasks

### Run Tests

```bash
# Frontend tests
cd treasurer && pnpm test

# Backend tests
cd treasurer-api && pnpm test

# Test with UI
pnpm test:ui

# Test coverage
pnpm test:coverage
```

### Type Checking

```bash
# Check types without changes
pnpm type-check

# Or let pre-push hook catch issues
git push  # Will fail if type errors
```

### Linting

```bash
# Check code style
pnpm lint

# Fix automatically
pnpm lint:fix

# Format with Prettier
pnpm format

# Check format
pnpm format:check
```

### Build Production

```bash
# Frontend build
cd treasurer && pnpm build

# Backend build
cd treasurer-api && pnpm build

# Docker images
./scripts/deploy-docker.sh --environment prod --build
```

## Docker Cheat Sheet

```bash
# Start services
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f <service>

# Stop services
docker compose -f docker-compose.dev.yml down

# Reset database
docker compose -f docker-compose.dev.yml down -v

# View services status
docker compose -f docker-compose.dev.yml ps

# Execute command in container
docker compose -f docker-compose.dev.yml exec api pnpm db:migrate

# View environment variables
docker compose -f docker-compose.dev.yml exec api env
```

## Kubernetes Deployment

**Prerequisites:**
```bash
# Install kubectl
brew install kubectl  # macOS
# or see https://kubernetes.io/docs/tasks/tools/

# Configure kubeconfig
export KUBECONFIG=/path/to/kubeconfig.yaml

# Verify cluster access
kubectl cluster-info
```

**Deploy:**
```bash
# Development deployment
./scripts/deploy-k8s.sh --environment dev

# Production deployment
./scripts/deploy-k8s.sh --environment prod

# Dry run first
./scripts/deploy-k8s.sh --environment prod --dry-run

# Check status
kubectl get all -n treasurer
```

**View logs:**
```bash
# Pod logs
kubectl logs -n treasurer deployment/api --follow

# All namespace logs
kubectl logs -n treasurer --all-containers=true -f
```

**Access services:**
```bash
# Port forward to local
kubectl port-forward -n treasurer svc/api 3001:3001
kubectl port-forward -n treasurer svc/client 3000:3000

# Then access: http://localhost:3000 and http://localhost:3001
```

## Troubleshooting

### Git hooks not running

```bash
# Reinstall Husky
pnpm exec husky install

# Make hooks executable
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
chmod +x .husky/commit-msg
```

### Docker container won't start

```bash
# Check logs
docker compose logs api

# Rebuild
docker compose build --no-cache

# Clean start
docker compose down -v
docker compose up --build
```

### Type errors on push

```bash
# Run type checking locally
pnpm type-check

# Fix issues then try again
git push
```

### ESLint errors

```bash
# Show lint errors
pnpm lint

# Auto-fix many errors
pnpm lint:fix

# Manual fixes for remaining errors
# Edit files and try again
```

### Tests failing

```bash
# Run tests with verbose output
pnpm test -- --reporter=verbose

# Run specific test file
pnpm test -- path/to/test.test.ts

# Run with UI
pnpm test:ui
```

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001/api
VITE_APP_TITLE=Treasurer
```

### Backend (.env)
```
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://treasurer:treasurer@localhost:5432/treasurer_db?schema=public
JWT_SECRET=your-minimum-32-character-secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

### Production
Update `.env` files in docker-compose.prod.yml with secure values before deploying.

## Next Steps

1. Read full CI/CD documentation: [CI-CD.md](./CI-CD.md)
2. Set up GitHub Secrets for automated deployments
3. Configure domain and SSL certificates
4. Set up monitoring and alerting
5. Plan database backup strategy

## Support

For detailed documentation, see [CI-CD.md](./CI-CD.md)

For issues, check:
1. Docker logs: `docker compose logs -f`
2. GitHub Actions: Repository > Actions tab
3. Husky hooks: `.husky/` directory
4. Configuration files: `.github/`, `k8s/`, `docker-compose.*.yml`
