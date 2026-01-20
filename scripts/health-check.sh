#!/bin/bash

# PayPal Verification App - Health Check Script
# This script verifies that the application is running correctly

set -e

# Configuration
HEALTH_URL="${HEALTH_URL:-http://localhost:8080/api/health}"
TIMEOUT="${TIMEOUT:-30}"
RETRIES="${RETRIES:-3}"

echo "🏥 Checking PayPal Verification App health..."

# Function to check health
check_health() {
    local attempt=$1
    echo "Attempt $attempt/$RETRIES..."

    if curl -f --max-time "$TIMEOUT" -s "$HEALTH_URL" > /dev/null 2>&1; then
        echo "✅ Health check passed!"
        return 0
    else
        echo "❌ Health check failed (attempt $attempt/$RETRIES)"
        return 1
    fi
}

# Try health checks with retries
for i in $(seq 1 "$RETRIES"); do
    if check_health "$i"; then
        echo "🎉 Application is healthy and ready!"
        exit 0
    fi

    if [ "$i" -lt "$RETRIES" ]; then
        echo "⏳ Waiting 5 seconds before retry..."
        sleep 5
    fi
done

echo "💥 Health check failed after $RETRIES attempts"
echo "🔍 Please check the application logs for errors"
exit 1