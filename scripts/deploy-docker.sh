#!/bin/bash
# Docker Compose deployment script for Treasurer application
# Supports both development and production environments

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
  echo -e "${GREEN}✓${NC} $1"
}

error() {
  echo -e "${RED}✗${NC} $1"
  exit 1
}

warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# Default values
ENVIRONMENT="prod"
ACTION="up"
BUILD=false
DETACH=false
LOGS=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --environment|-e)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --action|-a)
      ACTION="$2"
      shift 2
      ;;
    --build)
      BUILD=true
      shift
      ;;
    --detach|-d)
      DETACH=true
      shift
      ;;
    --logs|-l)
      LOGS=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -e, --environment ENV   Environment to deploy (dev, prod) [default: dev]"
      echo "  -a, --action ACTION     Action to perform (up, down, restart, pull) [default: up]"
      echo "  --build                 Build images before starting"
      echo "  -d, --detach            Run in background"
      echo "  -l, --logs              Show logs after starting"
      echo "  -h, --help              Show this help message"
      exit 0
      ;;
    *)
      error "Unknown option: $1"
      ;;
  esac
done

# Validate environment
if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
  error "Invalid environment: $ENVIRONMENT. Must be 'dev' or 'prod'"
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

log "Docker deployment script for Treasurer"
log "Environment: $ENVIRONMENT"
log "Action: $ACTION"

# Check Docker is available
if ! command -v docker &> /dev/null; then
  error "Docker is not installed. Please install Docker to proceed."
fi

if ! command -v docker-compose &> /dev/null; then
  error "Docker Compose is not installed. Please install Docker Compose to proceed."
fi

# Select compose file
if [[ "$ENVIRONMENT" == "prod" ]]; then
  COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"
  warning "Deploying to PRODUCTION environment"
else
  COMPOSE_FILE="$PROJECT_ROOT/docker-compose.dev.yml"
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  error "Compose file not found: $COMPOSE_FILE"
fi

log "Using compose file: $COMPOSE_FILE"

# Build images if requested
if [[ "$BUILD" == "true" ]]; then
  log "Building Docker images..."
  docker-compose -f "$COMPOSE_FILE" build || error "Failed to build images"
  success "Images built successfully"
fi

# Execute action
case $ACTION in
  up)
    log "Starting services..."
    DOCKER_COMPOSE_ARGS=("-f" "$COMPOSE_FILE")

    if [[ "$BUILD" == "true" ]]; then
      DOCKER_COMPOSE_ARGS+=("--build")
    fi

    if [[ "$DETACH" == "true" ]]; then
      DOCKER_COMPOSE_ARGS+=("-d")
    fi

    docker-compose "${DOCKER_COMPOSE_ARGS[@]}" up || error "Failed to start services"

    success "Services started"

    if [[ "$DETACH" == "true" ]]; then
      log "Services running in background"
      sleep 2
      docker-compose -f "$COMPOSE_FILE" ps
    fi
    ;;

  down)
    log "Stopping services..."
    docker-compose -f "$COMPOSE_FILE" down || error "Failed to stop services"
    success "Services stopped"
    ;;

  restart)
    log "Restarting services..."
    docker-compose -f "$COMPOSE_FILE" restart || error "Failed to restart services"
    success "Services restarted"
    ;;

  pull)
    log "Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" pull || error "Failed to pull images"
    success "Images pulled"
    ;;

  *)
    error "Unknown action: $ACTION. Valid actions: up, down, restart, pull"
    ;;
esac

# Show logs if requested
if [[ "$LOGS" == "true" ]] && [[ "$ACTION" == "up" ]] && [[ "$DETACH" == "false" ]]; then
  log "Use Ctrl+C to stop viewing logs"
  docker-compose -f "$COMPOSE_FILE" logs -f
fi

success "Deployment completed!"
