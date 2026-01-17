# CI/CD Pipeline Documentation

## Overview

This document provides a comprehensive guide to the CI/CD infrastructure for the Treasurer application. The setup includes:

- **GitHub Actions** for continuous integration and automated testing
- **Husky** pre-commit hooks for code quality enforcement
- **Docker** for containerization with development and production configurations
- **Kubernetes** manifests for cloud-native deployment
- **Automated deployment** workflows for container registry publishing

## Table of Contents

1. [GitHub Actions Workflows](#github-actions-workflows)
2. [Pre-commit Hooks (Husky)](#pre-commit-hooks-husky)
3. [Docker Setup](#docker-setup)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Deployment Scripts](#deployment-scripts)
6. [Environment Setup](#environment-setup)
7. [Troubleshooting](#troubleshooting)

## GitHub Actions Workflows

### CI Pipeline (.github/workflows/ci.yml)

Runs on every push to `main` branch and pull requests. Provides:

- **Parallel jobs** for frontend and backend testing
- **Type checking** with TypeScript compiler
- **ESLint validation** with zero-warnings policy
- **Unit tests** with coverage reporting
- **Production builds** to verify buildability
- **Artifact uploads** for test coverage and build outputs

**Workflow Configuration:**
- Runs on: Push to main, Pull requests
- Concurrency: Cancels in-progress runs when new commits arrive
- Caching: pnpm dependencies cached for faster execution

**Jobs:**
1. **Backend** (treasurer-api/)
   - pnpm install
   - pnpm type-check
   - pnpm lint
   - pnpm test:coverage
   - pnpm build
   - Upload coverage artifacts

2. **Frontend** (treasurer/)
   - pnpm install
   - pnpm type-check
   - pnpm lint
   - pnpm test:coverage
   - pnpm build
   - Upload coverage artifacts
   - Upload build artifacts

### Deploy Workflow (.github/workflows/deploy.yml)

Triggered on semantic version tags (v*.*.*)

- Builds Docker images for frontend and backend
- Pushes to GitHub Container Registry (GHCR)
- Applies semantic versioning to images
- Requires workflow permissions for package publishing

**Usage:**
```bash
git tag v1.0.0
git push origin v1.0.0
```

## Pre-commit Hooks (Husky)

### Installation

```bash
cd /home/don/dev/treasurer2026
pnpm install
pnpm exec husky install
```

### Hooks

#### .husky/pre-commit
Runs **lint-staged** on staged files before commit

- Formats code with Prettier
- Lints with ESLint (enforces zero-warnings)
- Applies fixes automatically
- Prevents committing code that fails linting

**Configuration:** `.lintstagedrc.js`

#### .husky/pre-push
Runs **type checking** before push

- Type checks treasurer-api with tsc --noEmit
- Type checks treasurer with tsc --noEmit
- Prevents pushing code with type errors

#### .husky/commit-msg
Validates **conventional commit** format

Valid commit types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`

**Examples:**
```
feat(auth): add login functionality
fix(database): resolve connection timeout
docs: update README
chore(deps): upgrade dependencies
```

## Docker Setup

### Development Environment

**File:** `docker-compose.dev.yml`

Components:
- **PostgreSQL 16** with persistent volume
- **Express API** with hot reload via volume mounts
- **React Frontend** with Vite dev server
- **Health checks** for all services
- **Automatic restart** on failure

**Commands:**
```bash
# Start all services
docker compose -f docker-compose.dev.yml up

# Start in background
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop services
docker compose -f docker-compose.dev.yml down

# Reset database
docker compose -f docker-compose.dev.yml down -v
```

**Access Points:**
- Frontend: http://localhost:3000
- API: http://localhost:3001
- API Docs: http://localhost:3001/api-docs

### Production Environment

**Files:**
- `docker-compose.prod.yml` - Production compose configuration
- `treasurer/Dockerfile.prod` - Multi-stage frontend build
- `treasurer-api/Dockerfile.prod` - Multi-stage backend build

**Features:**
- Multi-stage builds for optimized images
- Non-root user execution for security
- Health checks for all services
- Resource limits and requests
- Restart policies for reliability
- Environment variable validation

**Dockerfiles:**

**Frontend (Dockerfile.prod):**
- Builder stage: Installs dependencies and builds Vite bundle
- Runtime stage: Uses lightweight Node image with `serve` package
- Multi-stage reduces final image size

**Backend (Dockerfile.prod):**
- Builder stage: Installs dependencies, generates Prisma client, builds TypeScript
- Runtime stage: Only production dependencies installed
- Non-root user (nodejs:1001) for security
- Uses dumb-init for proper signal handling

**Environment Variables for Production:**

Create `.env.prod` file:
```bash
# Database
DB_USER=treasurer
DB_PASSWORD=your-secure-password
DB_NAME=treasurer_db

# JWT
JWT_SECRET=your-secure-32-character-secret-minimum

# CORS
CORS_ORIGIN=https://treasurer.example.com

# Frontend
VITE_API_URL=https://api.treasurer.example.com
```

**Building Images:**
```bash
# Build using deployment script
./scripts/deploy-docker.sh --environment prod --build

# Manual build
docker build -f treasurer-api/Dockerfile.prod -t treasurer-api:latest ./treasurer-api
docker build -f treasurer/Dockerfile.prod -t treasurer-client:latest ./treasurer
```

## Kubernetes Deployment

### Structure

```
k8s/
├── namespace.yaml              # Treasurer namespace
├── configmap.yaml              # Configuration variables
├── secrets.yaml                # Sensitive data (secrets template)
├── postgres.yaml               # PostgreSQL StatefulSet
├── api.yaml                    # Backend Deployment + Service + HPA
├── client.yaml                 # Frontend Deployment + Service + HPA
├── ingress.yaml                # Ingress and SSL configuration
├── network-policy.yaml         # Network isolation policies
├── kustomization.yaml          # Kustomize base configuration
└── overlays/
    └── prod/
        ├── kustomization.yaml  # Production customizations
        └── namespace-quota.yaml # Resource quotas and limits
```

### Prerequisites

1. **Kubernetes cluster** (v1.20+)
2. **kubectl** configured to access cluster
3. **Docker images** pushed to container registry
4. **Ingress controller** (e.g., NGINX)
5. **cert-manager** (optional, for SSL certificates)

### Deployment Configuration

**Namespace:** `treasurer`

**Resources:**

1. **PostgreSQL StatefulSet**
   - Single replica for database
   - Persistent volume for data
   - Health checks for readiness

2. **Backend Deployment (API)**
   - 2 replicas (production: 3)
   - Horizontal Pod Autoscaler (2-5 replicas)
   - Rolling update strategy
   - Health checks (liveness and readiness)
   - Security context (non-root, read-only filesystem)
   - Resource requests/limits

3. **Frontend Deployment (Client)**
   - 2 replicas (production: 3)
   - Horizontal Pod Autoscaler (2-5 replicas)
   - Rolling update strategy
   - Health checks (liveness and readiness)
   - Security context (non-root, read-only filesystem)
   - Resource requests/limits

4. **Services**
   - ClusterIP services for internal communication
   - Headless service for PostgreSQL StatefulSet

5. **Ingress**
   - TLS termination with cert-manager
   - CORS configuration
   - Rate limiting
   - HTTPS redirect

6. **Network Policies**
   - Restrict pod-to-pod communication
   - Database only accessible from API pods

### Secrets Management

**Template:** `k8s/secrets.yaml`

```bash
# Create secrets from template (manual)
kubectl apply -f k8s/secrets.yaml

# Or use kubectl directly
kubectl create secret generic treasurer-secrets \
  --from-literal=JWT_SECRET='your-secret' \
  --from-literal=DB_PASSWORD='your-password' \
  -n treasurer
```

**Important:** Replace template values with actual secure values before deploying.

### ConfigMap

**File:** `k8s/configmap.yaml`

Contains non-sensitive configuration:
- Application title
- API URLs
- JWT expiration
- CORS origin
- Database name and user

### Deployment

**Using kubectl directly:**
```bash
# Deploy base configuration
kubectl apply -k k8s/

# Deploy production with overlays
kubectl apply -k k8s/overlays/prod/
```

**Using deployment script:**
```bash
# Deployment script (see next section)
./scripts/deploy-k8s.sh --environment prod --apply

# Dry run
./scripts/deploy-k8s.sh --environment prod --dry-run

# Delete
./scripts/deploy-k8s.sh --environment dev --delete
```

### Verifying Deployment

```bash
# Check namespace
kubectl get ns | grep treasurer

# Check all resources
kubectl get all -n treasurer

# Check pod status
kubectl get pods -n treasurer

# Check deployments
kubectl get deployments -n treasurer

# Check services
kubectl get services -n treasurer

# View pod logs
kubectl logs -n treasurer deployment/api --follow

# Describe pod for events
kubectl describe pod <pod-name> -n treasurer

# Port forward to access locally
kubectl port-forward -n treasurer svc/api 3001:3001
kubectl port-forward -n treasurer svc/client 3000:3000
```

### Horizontal Pod Autoscaling

Both API and Client deployments include HPA:
- Minimum replicas: 2
- Maximum replicas: 5
- CPU threshold: 70%
- Memory threshold: 80%

Monitor scaling:
```bash
kubectl get hpa -n treasurer --watch
```

## Deployment Scripts

### Docker Deployment Script

**File:** `./scripts/deploy-docker.sh`

**Usage:**
```bash
# Make script executable
chmod +x scripts/deploy-docker.sh

# Start development environment
./scripts/deploy-docker.sh --environment dev --detach

# Start production environment
./scripts/deploy-docker.sh --environment prod --build --detach

# View logs
./scripts/deploy-docker.sh --environment dev --logs

# Restart services
./scripts/deploy-docker.sh --environment dev --action restart

# Stop services
./scripts/deploy-docker.sh --environment dev --action down

# Help
./scripts/deploy-docker.sh --help
```

**Options:**
- `-e, --environment` - dev or prod (default: dev)
- `-a, --action` - up, down, restart, pull (default: up)
- `--build` - Build images before starting
- `-d, --detach` - Run in background
- `-l, --logs` - Show logs after starting
- `-h, --help` - Show help

### Kubernetes Deployment Script

**File:** `./scripts/deploy-k8s.sh`

**Usage:**
```bash
# Make script executable
chmod +x scripts/deploy-k8s.sh

# Deploy development environment
./scripts/deploy-k8s.sh --environment dev

# Deploy production environment
./scripts/deploy-k8s.sh --environment prod

# Dry run to see changes
./scripts/deploy-k8s.sh --environment prod --dry-run

# Delete resources
./scripts/deploy-k8s.sh --environment dev --delete

# Verbose output
./scripts/deploy-k8s.sh --environment prod --verbose

# Help
./scripts/deploy-k8s.sh --help
```

**Options:**
- `-e, --environment` - dev or prod (default: dev)
- `--apply` - Apply changes (default)
- `--delete` - Delete resources
- `--dry-run` - Show changes without applying
- `-v, --verbose` - Verbose output
- `-h, --help` - Show help

## Environment Setup

### Frontend Environment Variables

**File:** `.env` or `.env.production`

```bash
VITE_API_URL=http://localhost:3001/api  # Development
VITE_API_URL=https://api.example.com    # Production
```

### Backend Environment Variables

**File:** `.env`

```bash
# Server
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://treasurer:treasurer@localhost:5432/treasurer_db?schema=public

# JWT
JWT_SECRET=your-minimum-32-character-secret-for-jwt
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000
```

### GitHub Actions Secrets

For automated deployments, configure GitHub Secrets:

1. Go to repository Settings > Secrets and variables > Actions
2. Add required secrets:
   - `JWT_SECRET` - JWT secret for API
   - `DB_PASSWORD` - Database password
   - `DOCKER_REGISTRY_TOKEN` - GitHub token for container registry

## Troubleshooting

### Docker Issues

**Container won't start:**
```bash
# Check logs
docker compose logs api
docker compose logs client

# Rebuild images
docker compose build --no-cache

# Remove stopped containers
docker compose down -v
```

**Database connection failed:**
```bash
# Ensure database is healthy
docker compose ps | grep postgres

# Verify connection string
docker compose exec api env | grep DATABASE_URL
```

### Kubernetes Issues

**Pods not starting:**
```bash
# Check pod status
kubectl describe pod <pod-name> -n treasurer

# Check events
kubectl get events -n treasurer --sort-by='.lastTimestamp'

# View pod logs
kubectl logs <pod-name> -n treasurer
```

**Service not accessible:**
```bash
# Check service endpoints
kubectl get endpoints -n treasurer

# Test connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  wget -qO- http://api:3001/health
```

**Certificate issues:**
```bash
# Check certificate status
kubectl get certificate -n treasurer

# Describe certificate
kubectl describe certificate treasurer-tls -n treasurer
```

### GitHub Actions Issues

**Workflow failures:**
1. Check workflow run logs in GitHub Actions tab
2. Review error messages for specific failures
3. Common issues:
   - Dependency installation failures (clean cache)
   - Type checking errors (run locally with `pnpm type-check`)
   - ESLint warnings (run locally with `pnpm lint`)
   - Test failures (run locally with `pnpm test`)

**Debugging:**
```bash
# Run tests locally
cd treasurer && pnpm test
cd treasurer-api && pnpm test

# Type checking
pnpm type-check

# Linting
pnpm lint

# Build
pnpm build
```

## Best Practices

### Security

1. **Never commit secrets** - Use environment files with .gitignore
2. **Use strong passwords** - Generate with `openssl rand -base64 32`
3. **Rotate secrets regularly** - Especially JWT_SECRET and database passwords
4. **Use HTTPS** - Enable SSL/TLS in production
5. **Network policies** - Restrict pod communication in Kubernetes

### Performance

1. **Resource limits** - Set appropriate CPU and memory limits
2. **Health checks** - Configure liveness and readiness probes
3. **Caching** - Use browser caching for static assets
4. **Database indexing** - Ensure proper database indexes
5. **Load testing** - Test application under expected load

### Reliability

1. **Database backups** - Regular backup of PostgreSQL data
2. **Monitoring** - Set up observability and alerting
3. **Graceful shutdown** - Configure shutdown timeouts
4. **Retry logic** - Implement retry mechanisms for external calls
5. **Chaos engineering** - Test failure scenarios

### Development

1. **Git hooks** - Always run pre-commit hooks before pushing
2. **Type checking** - Run `pnpm type-check` before committing
3. **Testing** - Maintain test coverage above 80%
4. **Code review** - Require peer review before merging
5. **Documentation** - Keep deployment docs up to date

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [Kustomize Documentation](https://kustomize.io/)
