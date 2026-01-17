#!/bin/bash
# Kubernetes deployment script for Treasurer application
# Supports both base and production overlay deployments

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
ENVIRONMENT="dev"
ACTION="apply"
DRY_RUN=false
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --environment|-e)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --apply)
      ACTION="apply"
      shift
      ;;
    --delete)
      ACTION="delete"
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -e, --environment ENV   Environment to deploy to (dev, prod) [default: dev]"
      echo "  --apply                 Apply changes [default]"
      echo "  --delete                Delete resources"
      echo "  --dry-run               Show what would be applied without actually applying"
      echo "  -v, --verbose           Verbose output"
      echo "  -h, --help              Show this help message"
      exit 0
      ;;
    *)
      error "Unknown option: $1"
      ;;
  esac
done

# Validation
if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
  error "Invalid environment: $ENVIRONMENT. Must be 'dev' or 'prod'"
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
K8S_DIR="$PROJECT_ROOT/k8s"

log "Deploying Treasurer to Kubernetes"
log "Environment: $ENVIRONMENT"
log "Action: $ACTION"

# Check kubectl is available
if ! command -v kubectl &> /dev/null; then
  error "kubectl is not installed. Please install kubectl to proceed."
fi

# Check kubeconfig
if ! kubectl cluster-info &> /dev/null; then
  error "Unable to connect to Kubernetes cluster. Please check your kubeconfig."
fi

# Get current context
CONTEXT=$(kubectl config current-context)
log "Using Kubernetes context: $CONTEXT"

# Determine kustomization path
if [[ "$ENVIRONMENT" == "prod" ]]; then
  KUSTOMIZE_PATH="$K8S_DIR/overlays/prod"
  warning "Deploying to PRODUCTION environment"
else
  KUSTOMIZE_PATH="$K8S_DIR"
fi

if [[ ! -d "$KUSTOMIZE_PATH" ]]; then
  error "Kustomization directory not found: $KUSTOMIZE_PATH"
fi

# Build kustomization
log "Building Kustomization from: $KUSTOMIZE_PATH"
MANIFESTS=$(mktemp)
if ! kubectl kustomize "$KUSTOMIZE_PATH" > "$MANIFESTS"; then
  error "Failed to build Kustomization"
fi

if [[ "$VERBOSE" == "true" ]]; then
  log "Generated manifests:"
  cat "$MANIFESTS"
fi

# Apply or delete
if [[ "$ACTION" == "apply" ]]; then
  log "Preparing to apply resources..."

  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY RUN: Showing changes that would be applied"
    kubectl diff -f "$MANIFESTS" || true
  else
    log "Applying resources to cluster..."
    kubectl apply -f "$MANIFESTS"
    success "Resources applied successfully"

    # Wait for deployments
    log "Waiting for deployments to be ready..."
    kubectl rollout status deployment/api -n treasurer --timeout=5m || warning "API deployment status check failed"
    kubectl rollout status deployment/client -n treasurer --timeout=5m || warning "Client deployment status check failed"
    success "Deployments are ready"
  fi

elif [[ "$ACTION" == "delete" ]]; then
  if [[ "$ENVIRONMENT" == "prod" ]]; then
    error "Cannot delete production environment. Please do this manually or use --force flag."
  fi

  log "Deleting resources..."
  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY RUN: Would delete the following resources"
    kubectl delete -f "$MANIFESTS" --dry-run=client
  else
    kubectl delete -f "$MANIFESTS"
    success "Resources deleted successfully"
  fi
fi

# Cleanup
rm -f "$MANIFESTS"

# Show status
log "Deployment status:"
kubectl get all -n treasurer

success "Deployment completed!"
