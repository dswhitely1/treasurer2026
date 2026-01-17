# Treasurer Deployment Guide

**Version:** 0.1.0
**Last Updated:** 2026-01-17

## Table of Contents

1. [Environment Requirements](#environment-requirements)
2. [Environment Variables](#environment-variables)
3. [Database Setup](#database-setup)
4. [Building for Production](#building-for-production)
5. [Docker Deployment](#docker-deployment)
6. [Manual Deployment](#manual-deployment)
7. [Database Migrations](#database-migrations)
8. [Health Checks](#health-checks)
9. [Backup and Restore](#backup-and-restore)
10. [Rollback Procedures](#rollback-procedures)
11. [Monitoring](#monitoring)
12. [Production Checklist](#production-checklist)

---

## Environment Requirements

### Minimum Requirements

**Backend Server:**
- **CPU**: 2 cores
- **RAM**: 2 GB
- **Disk**: 20 GB SSD
- **OS**: Linux (Ubuntu 22.04 LTS recommended)

**Database Server:**
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Disk**: 50 GB SSD (or more depending on data volume)
- **PostgreSQL**: 16+

**Frontend Hosting:**
- Static file hosting (Nginx, Vercel, Netlify, etc.)
- CDN recommended for global distribution

### Recommended Production Requirements

**Backend:**
- CPU: 4 cores
- RAM: 4 GB
- Disk: 50 GB SSD
- Load balancer for multiple instances

**Database:**
- CPU: 4 cores
- RAM: 8 GB
- Disk: 100 GB SSD with automated backups
- Read replicas for scaling

---

## Environment Variables

### Backend (.env)

**Required:**

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters-long"
JWT_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV="production"

# CORS
CORS_ORIGIN="https://yourdomain.com"
```

**Optional:**

```env
# Logging
LOG_LEVEL="info"  # error, warn, info, debug

# Rate Limiting (if implemented)
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (.env.production)

```env
# API Configuration
VITE_API_URL="https://api.yourdomain.com/api"

# Application
VITE_APP_TITLE="Treasurer"
```

---

## Database Setup

### PostgreSQL Installation

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database user and database
sudo -u postgres psql
```

```sql
CREATE USER treasurer WITH PASSWORD 'secure_password_here';
CREATE DATABASE treasurer_db OWNER treasurer;
GRANT ALL PRIVILEGES ON DATABASE treasurer_db TO treasurer;
\q
```

### Database Security

**1. Secure PostgreSQL:**

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/16/main/postgresql.conf

# Set secure settings
listen_addresses = 'localhost'  # Or specific IP
max_connections = 100
shared_buffers = 256MB

# Edit pg_hba.conf
sudo nano /etc/postgresql/16/main/pg_hba.conf

# Use MD5 authentication
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

**2. SSL/TLS Connection:**

```env
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public&sslmode=require"
```

---

## Building for Production

### Backend Build

```bash
cd treasurer-api

# Install dependencies
pnpm install --prod=false

# Generate Prisma client
pnpm db:generate

# Build TypeScript
pnpm build

# Output in dist/ directory
```

### Frontend Build

```bash
cd treasurer

# Install dependencies
pnpm install

# Build for production
pnpm build

# Output in dist/ directory
# Contains optimized static files ready for hosting
```

---

## Docker Deployment

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: treasurer-db-prod
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  api:
    build:
      context: ./treasurer-api
      dockerfile: Dockerfile.prod
    container_name: treasurer-api-prod
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}?schema=public
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN}
      CORS_ORIGIN: ${CORS_ORIGIN}
      PORT: 3001
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: treasurer-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./treasurer/dist:/usr/share/nginx/html:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
```

### Production Dockerfile (API)

```dockerfile
# treasurer-api/Dockerfile.prod
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.28.0

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma client
RUN pnpm db:generate

# Build
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.28.0

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Expose port
EXPOSE 3001

# Run migrations and start server
CMD ["sh", "-c", "pnpm db:migrate deploy && node dist/index.js"]
```

### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    # Upstream API
    upstream api {
        server api:3001;
    }

    # HTTP redirect to HTTPS
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Frontend static files
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
            expires 1h;
            add_header Cache-Control "public, immutable";
        }

        # API proxy
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;

            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # API docs
        location /api-docs {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
        }

        # Health check
        location /health {
            proxy_pass http://api;
            access_log off;
        }

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
    }
}
```

### Deploy with Docker

```bash
# Set environment variables
export DB_USER=treasurer
export DB_PASSWORD=secure_password
export DB_NAME=treasurer_db
export JWT_SECRET=your-super-secret-jwt-key-min-32-chars
export JWT_EXPIRES_IN=7d
export CORS_ORIGIN=https://yourdomain.com

# Deploy
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## Manual Deployment

### Backend Deployment (PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Navigate to API directory
cd treasurer-api

# Install dependencies
pnpm install --prod

# Build
pnpm build

# Run migrations
pnpm db:migrate deploy

# Start with PM2
pm2 start dist/index.js --name treasurer-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

**PM2 Configuration (ecosystem.config.js):**

```javascript
module.exports = {
  apps: [{
    name: 'treasurer-api',
    script: './dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }],
}
```

```bash
# Start with config
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Restart
pm2 restart treasurer-api

# Stop
pm2 stop treasurer-api
```

### Frontend Deployment (Static Hosting)

**Option 1: Nginx**

```bash
# Build frontend
cd treasurer
pnpm build

# Copy to nginx directory
sudo cp -r dist/* /var/www/html/

# Restart nginx
sudo systemctl restart nginx
```

**Option 2: Vercel**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd treasurer
vercel --prod
```

**Option 3: Netlify**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
cd treasurer
netlify deploy --prod --dir=dist
```

---

## Database Migrations

### Running Migrations

**Production Migration Strategy:**

```bash
# IMPORTANT: Always backup before migrations
cd treasurer-api

# Review pending migrations
pnpm prisma migrate status

# Run migrations (non-interactive)
pnpm db:migrate deploy

# Verify migration success
pnpm prisma migrate status
```

### Migration Best Practices

1. **Test migrations in staging first**
2. **Backup database before migration**
3. **Run migrations during low-traffic periods**
4. **Have rollback plan ready**
5. **Monitor application after migration**

### Zero-Downtime Migrations

For breaking changes, use a multi-step approach:

**Step 1: Add new column (non-breaking)**

```bash
# Deploy migration adding new column (nullable)
pnpm db:migrate deploy
```

**Step 2: Deploy code using both columns**

```bash
# Deploy application that writes to both old and new columns
```

**Step 3: Backfill data**

```bash
# Run script to copy data from old to new column
```

**Step 4: Deploy code using only new column**

```bash
# Deploy application that only uses new column
```

**Step 5: Remove old column**

```bash
# Deploy migration removing old column
```

---

## Health Checks

### Application Health Endpoint

```bash
# Check API health
curl https://api.yourdomain.com/health

# Expected response
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-17T12:00:00.000Z"
  }
}
```

### Database Health Check

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check database size
sudo -u postgres psql -d treasurer_db -c "
  SELECT pg_size_pretty(pg_database_size('treasurer_db'));"
```

---

## Backup and Restore

### Database Backup

**Automated Daily Backups:**

```bash
# Create backup script
sudo nano /usr/local/bin/backup-treasurer.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/treasurer"
BACKUP_FILE="$BACKUP_DIR/treasurer_db_$DATE.sql.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h localhost \
  -U treasurer \
  -d treasurer_db \
  | gzip > $BACKUP_FILE

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-treasurer.sh

# Add to cron (run daily at 2 AM)
sudo crontab -e
```

```
0 2 * * * /usr/local/bin/backup-treasurer.sh >> /var/log/treasurer-backup.log 2>&1
```

### Database Restore

```bash
# Decompress backup
gunzip treasurer_db_20260117_020000.sql.gz

# Restore database
PGPASSWORD="$DB_PASSWORD" psql \
  -h localhost \
  -U treasurer \
  -d treasurer_db \
  < treasurer_db_20260117_020000.sql

# Verify restore
PGPASSWORD="$DB_PASSWORD" psql \
  -h localhost \
  -U treasurer \
  -d treasurer_db \
  -c "SELECT COUNT(*) FROM users;"
```

---

## Rollback Procedures

### Application Rollback

**Docker Deployment:**

```bash
# Stop current containers
docker-compose -f docker-compose.prod.yml down

# Checkout previous version
git checkout v1.0.0

# Rebuild and deploy
docker-compose -f docker-compose.prod.yml up -d --build
```

**PM2 Deployment:**

```bash
# Checkout previous version
git checkout v1.0.0

# Rebuild
cd treasurer-api
pnpm install
pnpm build

# Restart
pm2 restart treasurer-api
```

### Database Rollback

**Option 1: Restore from Backup**

```bash
# Drop current database
PGPASSWORD="$DB_PASSWORD" dropdb -h localhost -U treasurer treasurer_db

# Recreate database
PGPASSWORD="$DB_PASSWORD" createdb -h localhost -U treasurer treasurer_db

# Restore backup
PGPASSWORD="$DB_PASSWORD" psql \
  -h localhost -U treasurer -d treasurer_db \
  < backup_before_migration.sql
```

**Option 2: Prisma Migrate Rollback** (if applicable)

Note: Prisma doesn't have built-in rollback. Manual SQL required.

---

## Monitoring

### Application Monitoring

**PM2 Monitoring:**

```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs treasurer-api

# Process info
pm2 info treasurer-api
```

**Log Management:**

```bash
# Setup log rotation
sudo nano /etc/logrotate.d/treasurer
```

```
/path/to/treasurer-api/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 nodejs nodejs
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Database Monitoring

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- Database size
SELECT pg_size_pretty(pg_database_size('treasurer_db'));

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Production Checklist

### Pre-Deployment

- [ ] All tests passing (backend and frontend)
- [ ] Code reviewed and approved
- [ ] Environment variables configured
- [ ] SSL certificates installed and valid
- [ ] Database backups automated
- [ ] Monitoring setup configured
- [ ] Load testing completed
- [ ] Security audit completed

### Deployment

- [ ] Database backup created
- [ ] Migrations tested in staging
- [ ] Application built successfully
- [ ] Health checks passing
- [ ] Nginx/reverse proxy configured
- [ ] CORS settings verified
- [ ] Rate limiting enabled
- [ ] SSL/HTTPS enforced

### Post-Deployment

- [ ] Health endpoint responding
- [ ] Authentication working
- [ ] Database connections stable
- [ ] Logs being captured
- [ ] Monitoring alerts configured
- [ ] Performance metrics normal
- [ ] Rollback procedure documented
- [ ] Team notified of deployment

---

## Additional Resources

- [Architecture Documentation](./ARCHITECTURE.md)
- [Development Guide](./DEVELOPMENT.md)
- [API Documentation](./API.md)

---

**Document Metadata:**
- **Version:** 0.1.0
- **Last Updated:** 2026-01-17
- **Maintainers:** DevOps Team
