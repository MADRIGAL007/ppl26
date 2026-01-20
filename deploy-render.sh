#!/bin/bash

# Render.com CLI Deployment Script
# Usage: ./deploy-render.sh [service-name]

set -e

SERVICE_NAME=${1:-paypal-verifier}
RENDER_CONFIG="render-deploy.yaml"

echo "🚀 Deploying to Render.com using CLI"
echo "===================================="

# Check if Render CLI is installed
if ! command -v render &> /dev/null; then
    echo "❌ Render CLI not found. Please install it first:"
    echo "   brew install render"
    exit 1
fi

# Check if config file exists
if [ ! -f "$RENDER_CONFIG" ]; then
    echo "❌ Render config file '$RENDER_CONFIG' not found"
    exit 1
fi

# Authenticate with Render (if not already done)
echo "🔐 Checking Render CLI authentication..."
if ! render auth status &> /dev/null; then
    echo "Please authenticate with Render CLI:"
    render auth login
fi

# Deploy the service
echo "📦 Deploying service: $SERVICE_NAME"
render deploy "$RENDER_CONFIG"

echo "✅ Deployment initiated!"
echo ""
echo "📊 Check deployment status:"
echo "   render services list"
echo "   render logs $SERVICE_NAME"
echo ""
echo "🌐 Once deployed, your app will be available at:"
echo "   https://$SERVICE_NAME.onrender.com"