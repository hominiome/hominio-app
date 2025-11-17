#!/bin/bash

# Deploy script for hominio-wallet service to Fly.io
# NOTE: This script is for initial setup only. All deployments run via GitHub Actions.
# After initial setup, deployments are automated via GitHub Actions workflow.
# This script sets up the Fly.io app, configures domains, and deploys the service

set -e

APP_NAME="hominio-wallet"
REGION="fra"
DOMAIN="wallet.hominio.me"

echo "🚀 Deploying $APP_NAME to Fly.io..."

# Check if Fly CLI is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ Fly CLI is not installed. Please install it from https://fly.io/docs/flyctl/install/"
    exit 1
fi

# Check if user is logged in
if ! flyctl auth whoami &> /dev/null; then
    echo "❌ Not logged in to Fly.io. Please run: flyctl auth login"
    exit 1
fi

# Check if app exists, if not create it
if ! flyctl apps list | grep -q "$APP_NAME"; then
    echo "📦 Creating Fly.io app: $APP_NAME..."
    flyctl apps create "$APP_NAME" --org personal || {
        echo "❌ Failed to create app. You may need to specify --org or use a different app name."
        exit 1
    }
    
    # Set primary region
    flyctl regions set "$REGION" --app "$APP_NAME"
    
    # Allocate IP addresses
    echo "🌐 Allocating IP addresses..."
    flyctl ips allocate-v4 --app "$APP_NAME" || true
    flyctl ips allocate-v6 --app "$APP_NAME" || true
    
    echo "✅ App created successfully!"
else
    echo "✅ App $APP_NAME already exists"
fi

# Set up SSL certificate for custom domain
echo "🔒 Setting up SSL certificate for $DOMAIN..."
flyctl certs create "$DOMAIN" --app "$APP_NAME" || {
    echo "⚠️  Certificate may already exist or domain may not be configured in DNS yet"
    echo "   You can check certificate status with: flyctl certs check $DOMAIN --app $APP_NAME"
}

# Deploy the service
echo "🚀 Deploying service..."
cd services/wallet
flyctl deploy --remote-only --app "$APP_NAME"

# Check status
echo "📊 Checking deployment status..."
flyctl status --app "$APP_NAME"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Configure DNS records (see DNS_CONFIG.md)"
echo "2. Verify SSL certificate: flyctl certs check $DOMAIN --app $APP_NAME"
echo "3. View logs: flyctl logs --app $APP_NAME"
echo "4. Open app: flyctl open --app $APP_NAME"
echo ""
echo "🔗 App URL: https://$DOMAIN"
echo "🔗 Fly.io URL: https://$APP_NAME.fly.dev"

