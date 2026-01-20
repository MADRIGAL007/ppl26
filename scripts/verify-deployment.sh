#!/bin/bash

# PayPal Verification App - Deployment Verification Script
# This script verifies that all components are ready for deployment

set -e

echo "🔍 Verifying PayPal Verification App deployment readiness..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log with color
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_info() {
    echo -e "ℹ️  $1"
}

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    exit 1
fi
log_success "Node.js is available ($(node --version))"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    log_error "npm is not installed"
    exit 1
fi
log_success "npm is available ($(npm --version))"

# Check package.json exists
if [ ! -f "package.json" ]; then
    log_error "package.json not found"
    exit 1
fi
log_success "package.json found"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    log_warning "node_modules not found, installing dependencies..."
    npm ci --legacy-peer-deps
fi
log_success "Dependencies are installed"

# Check if TypeScript compilation works
log_info "Testing TypeScript compilation..."
if npm run build:server > /dev/null 2>&1; then
    log_success "Server TypeScript compilation successful"
else
    log_error "Server TypeScript compilation failed"
    exit 1
fi

# Check if Angular build works
log_info "Testing Angular build..."
if npm run build:ui > /dev/null 2>&1; then
    log_success "Angular build successful"
else
    log_error "Angular build failed"
    exit 1
fi

# Check if static assets are generated
if [ -d "static" ] && [ -f "static/index.html" ]; then
    log_success "Static assets generated"
else
    log_error "Static assets not found"
    exit 1
fi

# Check if server builds
if [ -d "dist-server" ] && [ -f "dist-server/index.js" ]; then
    log_success "Server build artifacts found"
else
    log_error "Server build artifacts not found"
    exit 1
fi

# Check environment variables (warn if not set)
if [ -z "$JWT_SECRET" ]; then
    log_warning "JWT_SECRET environment variable not set"
fi

if [ -z "$DATABASE_URL" ]; then
    log_info "DATABASE_URL not set - will use SQLite fallback"
fi

# Check Docker availability (optional)
if command -v docker &> /dev/null; then
    log_success "Docker is available ($(docker --version))"
else
    log_warning "Docker not found - deployment may require Docker"
fi

echo
log_success "🎉 All deployment checks passed!"
echo
echo "🚀 Ready for deployment with:"
echo "   - ✅ Node.js $(node --version)"
echo "   - ✅ Dependencies installed"
echo "   - ✅ TypeScript compilation working"
echo "   - ✅ Angular build successful"
echo "   - ✅ Static assets generated"
echo "   - ✅ Server build ready"
echo
echo "📋 Next steps:"
echo "   1. Set environment variables in .env file"
echo "   2. Run: docker build -t paypal-verifier ."
echo "   3. Run: docker run -p 8080:8080 paypal-verifier"
echo "   4. Visit: http://localhost:8080/api/health"