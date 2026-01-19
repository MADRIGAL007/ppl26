#!/bin/bash

set -e

echo "🔒 Starting Docker Security Scan..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log with color
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    error "Docker is not running or not accessible"
    exit 1
fi

# Build the image
log "Building Docker image..."
docker build -t paypal-verifier-security-scan .

# Run security scans
log "Running security scans..."

# 1. Check for vulnerabilities using Trivy (if available)
if command -v trivy >/dev/null 2>&1; then
    log "Running Trivy vulnerability scan..."
    trivy image --exit-code 1 --severity HIGH,CRITICAL paypal-verifier-security-scan || {
        error "High or critical vulnerabilities found in container image"
        exit 1
    }
else
    warn "Trivy not found. Install Trivy for comprehensive vulnerability scanning: https://aquasecurity.github.io/trivy/"
fi

# 2. Check for secrets in the image
log "Checking for exposed secrets..."
SECRETS_FOUND=$(docker run --rm paypal-verifier-security-scan find /app -type f \( -name "*.key" -o -name "*.pem" -o -name "*.p12" -o -name "*secret*" -o -name "*.env" \) 2>/dev/null | wc -l)
if [ "$SECRETS_FOUND" -gt 0 ]; then
    error "Potential secrets found in container image"
    docker run --rm paypal-verifier-security-scan find /app -type f \( -name "*.key" -o -name "*.pem" -o -name "*.p12" -o -name "*secret*" -o -name "*.env" \)
    exit 1
fi

# 3. Check file permissions
log "Checking file permissions..."
docker run --rm --entrypoint sh paypal-verifier-security-scan -c "
    echo 'Checking for world-writable files...'
    find /app -type f -perm /o+w 2>/dev/null | head -10

    echo 'Checking for SUID/SGID files...'
    find /app -type f \( -perm /4000 -o -perm /2000 \) 2>/dev/null | head -10

    echo 'Checking ownership...'
    ls -la /app/
"

# 4. Check running as non-root
log "Checking if application runs as non-root user..."
docker run --rm --entrypoint id paypal-verifier-security-scan || {
    error "Failed to check user permissions"
}

# 5. Test basic functionality
log "Testing basic application functionality..."
docker run -d --name security-test -p 8081:8080 paypal-verifier-security-scan

# Wait for app to start
sleep 5

# Test health endpoint
if curl -f http://localhost:8081/api/health >/dev/null 2>&1; then
    log "Health check passed"
else
    error "Health check failed"
    docker logs security-test
    docker stop security-test
    docker rm security-test
    exit 1
fi

# Clean up
docker stop security-test
docker rm security-test

# 6. Check image size
log "Checking image size..."
IMAGE_SIZE=$(docker images paypal-verifier-security-scan --format "table {{.Size}}" | tail -n 1)
log "Image size: $IMAGE_SIZE"

# 7. Check for unnecessary packages
log "Checking for unnecessary packages in final image..."
docker run --rm --entrypoint sh paypal-verifier-security-scan -c "
    echo 'Checking installed packages...'
    dpkg -l | grep -v '^ii' | head -10

    echo 'Checking for common development tools...'
    which gcc make python3 || echo 'No development tools found (good)'
"

log "✅ Docker security scan completed successfully!"
echo ""
echo "Security Recommendations:"
echo "1. Regularly update base images"
echo "2. Use multi-stage builds to reduce attack surface"
echo "3. Scan images regularly with vulnerability scanners"
echo "4. Run containers as non-root users"
echo "5. Use minimal base images"
echo "6. Implement proper secrets management"