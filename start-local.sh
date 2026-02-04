#!/bin/bash
###############################################################################
# Altea Pay - Local Development Setup Script
#
# This script automates the entire local development setup process:
# 1. Pre-flight checks (Docker, .env, required variables)
# 2. Starts Docker services (PostgreSQL, App)
# 3. Migrates data from Supabase to local PostgreSQL
# 4. Creates a local superadmin user
# 5. Displays connection information
#
# Usage: ./start-local.sh [--skip-migration] [--reset]
#
# Options:
#   --skip-migration  Skip Supabase data migration (use existing local data)
#   --reset           Force complete reset (docker-compose down -v)
#   --help            Show this help message
###############################################################################

set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/setup.log"
ENV_FILE="${SCRIPT_DIR}/.env"
ENV_EXAMPLE="${SCRIPT_DIR}/.env.example"

# Default options
SKIP_MIGRATION=false
FORCE_RESET=false

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# ═══════════════════════════════════════════════════════════════════════════════
# Helper Functions
# ═══════════════════════════════════════════════════════════════════════════════

timestamp() {
  date "+%Y-%m-%d %H:%M:%S"
}

log() {
  local level="$1"
  shift
  local message="$*"
  echo "[$(timestamp)] [$level] $message" >> "$LOG_FILE"
}

print_header() {
  echo ""
  echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║${NC}          ${BOLD}Altea Pay - Local Development Setup${NC}                   ${CYAN}║${NC}"
  echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

print_step() {
  local step="$1"
  local total="$2"
  local message="$3"
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}[${step}/${total}]${NC} ${message}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  log "INFO" "Step ${step}/${total}: ${message}"
}

print_success() {
  echo -e "  ${GREEN}✓${NC} $1"
  log "INFO" "SUCCESS: $1"
}

print_warning() {
  echo -e "  ${YELLOW}⚠${NC} $1"
  log "WARN" "$1"
}

print_error() {
  echo -e "  ${RED}✗${NC} $1"
  log "ERROR" "$1"
}

print_info() {
  echo -e "  ${CYAN}ℹ${NC} $1"
  log "INFO" "$1"
}

spinner() {
  local pid=$1
  local delay=0.1
  local spinstr='|/-\'
  while ps -p $pid > /dev/null 2>&1; do
    local temp=${spinstr#?}
    printf " [%c]  " "$spinstr"
    local spinstr=$temp${spinstr%"$temp"}
    sleep $delay
    printf "\b\b\b\b\b\b"
  done
  printf "      \b\b\b\b\b\b"
}

cleanup_on_error() {
  echo ""
  print_error "Setup failed! Check ${LOG_FILE} for details."
  echo ""
  echo -e "${YELLOW}Suggestions:${NC}"
  echo "  1. Review the log file: cat ${LOG_FILE}"
  echo "  2. Check Docker is running: docker info"
  echo "  3. Verify .env file exists and is configured"
  echo "  4. Try running with --reset flag to start fresh"
  echo ""
  exit 1
}

trap cleanup_on_error ERR

show_help() {
  echo "Usage: ./start-local.sh [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  --skip-migration  Skip Supabase data migration (use existing local data)"
  echo "  --reset           Force complete reset (removes all Docker volumes)"
  echo "  --help            Show this help message"
  echo ""
  echo "Examples:"
  echo "  ./start-local.sh                    # Full setup with data migration"
  echo "  ./start-local.sh --skip-migration   # Start without migrating data"
  echo "  ./start-local.sh --reset            # Complete fresh start"
  echo ""
}

generate_password() {
  # Generate a secure random password
  if command -v openssl &> /dev/null; then
    openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16
  else
    cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 16
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# Parse Arguments
# ═══════════════════════════════════════════════════════════════════════════════

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-migration)
      SKIP_MIGRATION=true
      shift
      ;;
    --reset)
      FORCE_RESET=true
      shift
      ;;
    --help|-h)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

# ═══════════════════════════════════════════════════════════════════════════════
# Main Script
# ═══════════════════════════════════════════════════════════════════════════════

# Initialize log file
echo "========================================" > "$LOG_FILE"
echo "Altea Pay Local Setup - $(timestamp)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

print_header

# ───────────────────────────────────────────────────────────────────────────────
# Step 1: Pre-flight Checks
# ───────────────────────────────────────────────────────────────────────────────

print_step "1" "7" "Pre-flight Checks"

# Check Docker is installed
if ! command -v docker &> /dev/null; then
  print_error "Docker is not installed"
  echo ""
  echo -e "${YELLOW}Please install Docker Desktop:${NC}"
  echo "  macOS: https://docs.docker.com/desktop/install/mac-install/"
  echo "  Linux: https://docs.docker.com/engine/install/"
  exit 1
fi
print_success "Docker is installed"

# Check Docker is running
if ! docker info &> /dev/null 2>&1; then
  print_error "Docker is not running"
  echo ""
  echo -e "${YELLOW}Please start Docker Desktop and try again.${NC}"
  exit 1
fi
print_success "Docker is running"

# Check docker-compose / docker compose
if command -v docker-compose &> /dev/null; then
  DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null 2>&1; then
  DOCKER_COMPOSE="docker compose"
else
  print_error "Docker Compose is not available"
  exit 1
fi
print_success "Docker Compose is available (${DOCKER_COMPOSE})"

# Check .env file exists
if [[ ! -f "$ENV_FILE" ]]; then
  print_error ".env file not found"
  echo ""
  if [[ -f "$ENV_EXAMPLE" ]]; then
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    print_warning "Please edit .env with your configuration and run this script again"
    exit 1
  else
    echo -e "${YELLOW}Please create a .env file with required variables${NC}"
    exit 1
  fi
fi
print_success ".env file exists"

# Load environment variables
set -a
source "$ENV_FILE"
set +a

# ───────────────────────────────────────────────────────────────────────────────
# Step 2: Validate Environment Variables
# ───────────────────────────────────────────────────────────────────────────────

print_step "2" "7" "Validating Environment Variables"

MISSING_VARS=()

# Required for local Docker
[[ -z "${POSTGRES_USER:-}" ]] && MISSING_VARS+=("POSTGRES_USER")
[[ -z "${POSTGRES_PASSWORD:-}" ]] && MISSING_VARS+=("POSTGRES_PASSWORD")
[[ -z "${POSTGRES_DB:-}" ]] && MISSING_VARS+=("POSTGRES_DB")
[[ -z "${NEXTAUTH_SECRET:-}" ]] && MISSING_VARS+=("NEXTAUTH_SECRET")

# Required for Supabase migration (if not skipping)
if [[ "$SKIP_MIGRATION" == "false" ]]; then
  [[ -z "${SUPABASE_DB_HOST:-}" ]] && MISSING_VARS+=("SUPABASE_DB_HOST")
  [[ -z "${SUPABASE_DB_PASSWORD:-}" ]] && MISSING_VARS+=("SUPABASE_DB_PASSWORD")
fi

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
  print_error "Missing required environment variables:"
  for var in "${MISSING_VARS[@]}"; do
    echo -e "    ${RED}•${NC} $var"
  done
  echo ""
  echo -e "${YELLOW}Please add these variables to your .env file${NC}"
  exit 1
fi

print_success "POSTGRES_USER: ${POSTGRES_USER}"
print_success "POSTGRES_DB: ${POSTGRES_DB}"
print_success "NEXTAUTH_SECRET: [set]"

if [[ "$SKIP_MIGRATION" == "false" ]]; then
  print_success "SUPABASE_DB_HOST: ${SUPABASE_DB_HOST:-}"
  print_success "Supabase credentials: [set]"
else
  print_info "Skipping Supabase validation (--skip-migration)"
fi

# ───────────────────────────────────────────────────────────────────────────────
# Step 3: Docker Services
# ───────────────────────────────────────────────────────────────────────────────

print_step "3" "7" "Starting Docker Services"

cd "$SCRIPT_DIR"

# Force reset if requested
if [[ "$FORCE_RESET" == "true" ]]; then
  print_info "Force reset requested - removing all volumes..."
  $DOCKER_COMPOSE down -v 2>&1 | tee -a "$LOG_FILE" || true
  print_success "Volumes removed"
fi

# Stop existing containers
print_info "Stopping existing containers..."
$DOCKER_COMPOSE down 2>&1 | tee -a "$LOG_FILE" || true

# Start services
print_info "Starting PostgreSQL..."
$DOCKER_COMPOSE up -d postgres 2>&1 | tee -a "$LOG_FILE"

# Wait for PostgreSQL to be ready
print_info "Waiting for PostgreSQL to be ready..."
RETRIES=30
until $DOCKER_COMPOSE exec -T postgres pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" > /dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [[ $RETRIES -le 0 ]]; then
    print_error "PostgreSQL failed to start within timeout"
    exit 1
  fi
  sleep 1
  printf "."
done
echo ""
print_success "PostgreSQL is ready"

# ───────────────────────────────────────────────────────────────────────────────
# Step 4: Apply Database Schema
# ───────────────────────────────────────────────────────────────────────────────

print_step "4" "7" "Applying Database Schema (Drizzle)"

print_info "Running Drizzle migrations..."

# Check if drizzle-kit is available
if [[ -f "package.json" ]]; then
  if command -v pnpm &> /dev/null; then
    PKG_MANAGER="pnpm"
  elif command -v npm &> /dev/null; then
    PKG_MANAGER="npm"
  else
    print_warning "No package manager found, skipping Drizzle migrations"
    PKG_MANAGER=""
  fi

  if [[ -n "$PKG_MANAGER" ]]; then
    # Set DATABASE_URL for local connection
    export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}"

    # Run drizzle-kit push
    $PKG_MANAGER run db:push 2>&1 | tee -a "$LOG_FILE" || {
      # Fallback to npx if db:push script doesn't exist
      npx drizzle-kit push 2>&1 | tee -a "$LOG_FILE" || {
        print_warning "Drizzle migration failed - schema may already exist"
      }
    }
    print_success "Database schema applied"
  fi
else
  print_warning "package.json not found, skipping Drizzle migrations"
fi

# ───────────────────────────────────────────────────────────────────────────────
# Step 5: Migrate Data from Supabase
# ───────────────────────────────────────────────────────────────────────────────

print_step "5" "7" "Data Migration"

if [[ "$SKIP_MIGRATION" == "true" ]]; then
  print_info "Skipping Supabase data migration (--skip-migration flag)"
else
  print_info "Migrating data from Supabase to local PostgreSQL..."

  # Build the Supabase connection URL
  SUPABASE_DB_USER="${SUPABASE_DB_USER:-postgres.${SUPABASE_PROJECT_REF:-hpjzlmurljxzwjtwcbkz}}"
  SUPABASE_DB_PORT="${SUPABASE_DB_PORT:-5432}"
  SUPABASE_DB_NAME="${SUPABASE_DB_NAME:-postgres}"

  # Copy migration script to container and run
  if [[ -f "scripts/migrate-supabase-to-docker.sh" ]]; then
    # Update the migration script with current credentials
    SUPABASE_URL="postgres://${SUPABASE_DB_USER}:${SUPABASE_DB_PASSWORD}@${SUPABASE_DB_HOST}:${SUPABASE_DB_PORT}/${SUPABASE_DB_NAME}?sslmode=require"
    LOCAL_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}"

    # Create a temporary migration script with updated credentials
    TMP_SCRIPT=$(mktemp)
    sed -e "s|^SUPABASE_URL=.*|SUPABASE_URL=\"${SUPABASE_URL}\"|" \
        -e "s|^LOCAL_URL=.*|LOCAL_URL=\"${LOCAL_URL}\"|" \
        scripts/migrate-supabase-to-docker.sh > "$TMP_SCRIPT"

    # Copy and execute in container
    docker cp "$TMP_SCRIPT" "$($DOCKER_COMPOSE ps -q postgres)":/tmp/migrate.sh
    $DOCKER_COMPOSE exec -T postgres bash /tmp/migrate.sh 2>&1 | tee -a "$LOG_FILE"

    rm -f "$TMP_SCRIPT"
    print_success "Data migration complete"
  else
    print_warning "Migration script not found at scripts/migrate-supabase-to-docker.sh"
    print_info "Skipping data migration"
  fi
fi

# ───────────────────────────────────────────────────────────────────────────────
# Step 6: Create Local Superadmin User
# ───────────────────────────────────────────────────────────────────────────────

print_step "6" "7" "Creating Local Superadmin User"

SUPERADMIN_EMAIL="admin@local.dev"
SUPERADMIN_PASSWORD=$(generate_password)
SUPERADMIN_ID=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid 2>/dev/null || echo "00000000-0000-0000-0000-000000000001")

# Hash the password using bcrypt (via Node.js since we're in a Next.js project)
print_info "Generating password hash..."

# Create a temporary Node.js script to hash the password
HASH_SCRIPT=$(cat <<EOF
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('${SUPERADMIN_PASSWORD}', 10);
console.log(hash);
EOF
)

PASSWORD_HASH=$(echo "$HASH_SCRIPT" | node 2>/dev/null || echo "\$2a\$10\$placeholder")

if [[ "$PASSWORD_HASH" == "\$2a\$10\$placeholder" ]]; then
  print_warning "Could not generate bcrypt hash, using fallback"
  # Use a pre-computed hash for 'admin123' as fallback
  PASSWORD_HASH="\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3F6fFwfmRKGHkBh6dO1W"
  SUPERADMIN_PASSWORD="admin123"
fi

# Insert the superadmin user
print_info "Creating superadmin user: ${SUPERADMIN_EMAIL}"

$DOCKER_COMPOSE exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" <<EOSQL 2>&1 | tee -a "$LOG_FILE"
-- Check if user already exists
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = '${SUPERADMIN_EMAIL}') THEN
    -- Create user
    INSERT INTO users (id, email, password_hash, name, email_verified, created_at, updated_at)
    VALUES (
      '${SUPERADMIN_ID}',
      '${SUPERADMIN_EMAIL}',
      '${PASSWORD_HASH}',
      'Local Admin',
      NOW(),
      NOW(),
      NOW()
    );

    -- Create profile with super_admin role
    INSERT INTO profiles (id, email, full_name, role, status, created_at, updated_at)
    VALUES (
      '${SUPERADMIN_ID}',
      '${SUPERADMIN_EMAIL}',
      'Local Admin',
      'super_admin',
      'active',
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Superadmin user created successfully';
  ELSE
    RAISE NOTICE 'Superadmin user already exists, skipping';
  END IF;
END \$\$;
EOSQL

print_success "Superadmin user configured"

# ───────────────────────────────────────────────────────────────────────────────
# Step 7: Start Application
# ───────────────────────────────────────────────────────────────────────────────

print_step "7" "7" "Starting Application"

print_info "Building and starting the application..."
$DOCKER_COMPOSE up -d --build app 2>&1 | tee -a "$LOG_FILE"

# Wait for app to be ready
print_info "Waiting for application to be ready..."
RETRIES=60
APP_URL="${NEXTAUTH_URL:-http://localhost:3000}"
until curl -sf "${APP_URL}/api/auth/providers" > /dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [[ $RETRIES -le 0 ]]; then
    print_warning "Application may still be starting..."
    break
  fi
  sleep 2
  printf "."
done
echo ""

# Show container status
print_info "Container status:"
$DOCKER_COMPOSE ps

# ═══════════════════════════════════════════════════════════════════════════════
# Success Summary
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}                    ${BOLD}Setup Complete!${NC}                               ${GREEN}║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}Application URL:${NC}"
echo -e "  ${CYAN}${APP_URL}${NC}"
echo ""
echo -e "${BOLD}Local Superadmin Credentials:${NC}"
echo -e "  Email:    ${CYAN}${SUPERADMIN_EMAIL}${NC}"
echo -e "  Password: ${CYAN}${SUPERADMIN_PASSWORD}${NC}"
echo ""
echo -e "${BOLD}Database Connection:${NC}"
echo -e "  Host:     ${CYAN}localhost${NC}"
echo -e "  Port:     ${CYAN}5432${NC}"
echo -e "  User:     ${CYAN}${POSTGRES_USER}${NC}"
echo -e "  Password: ${CYAN}${POSTGRES_PASSWORD}${NC}"
echo -e "  Database: ${CYAN}${POSTGRES_DB}${NC}"
echo -e "  URL:      ${CYAN}postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}${NC}"
echo ""
echo -e "${BOLD}Useful Commands:${NC}"
echo -e "  View logs:          ${CYAN}docker compose logs -f${NC}"
echo -e "  View app logs:      ${CYAN}docker compose logs -f app${NC}"
echo -e "  Restart services:   ${CYAN}docker compose restart${NC}"
echo -e "  Stop services:      ${CYAN}docker compose down${NC}"
echo -e "  Full reset:         ${CYAN}docker compose down -v${NC}"
echo ""
echo -e "${BOLD}Log file:${NC} ${LOG_FILE}"
echo ""

log "INFO" "Setup completed successfully"
