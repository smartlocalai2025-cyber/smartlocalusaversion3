#!/bin/bash
# Quick deployment script for Morrow.AI backend to Google Cloud Run
# Usage: ./deploy-backend.sh [project-id]

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Morrow.AI Backend Deployment Script${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"

# Configuration
PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-morrow-ai-server}"
MEMORY="${MEMORY:-1Gi}"
CPU="${CPU:-1}"
TIMEOUT="${TIMEOUT:-60s}"

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: No project ID specified${NC}"
    echo "Usage: $0 [project-id]"
    echo "Or set it with: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${YELLOW}Configuration:${NC}"
echo "  Project ID:   $PROJECT_ID"
echo "  Region:       $REGION"
echo "  Service Name: $SERVICE_NAME"
echo "  Memory:       $MEMORY"
echo "  CPU:          $CPU"
echo "  Timeout:      $TIMEOUT"
echo ""

# Navigate to backend directory
cd "$(dirname "$0")/ai-server"

# Step 1: Build and push using Cloud Build
echo -e "${GREEN}Step 1/3: Building Docker image with Cloud Build...${NC}"
gcloud builds submit \
  --tag "gcr.io/${PROJECT_ID}/${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --timeout=10m

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Step 2: Deploy to Cloud Run
echo -e "${GREEN}Step 2/3: Deploying to Cloud Run...${NC}"
gcloud run deploy "${SERVICE_NAME}" \
  --image "gcr.io/${PROJECT_ID}/${SERVICE_NAME}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --memory "${MEMORY}" \
  --cpu "${CPU}" \
  --timeout "${TIMEOUT}" \
  --max-instances 10 \
  --set-env-vars="NODE_ENV=production" \
  --project "${PROJECT_ID}"

if [ $? -ne 0 ]; then
    echo -e "${RED}Deployment failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Deployment successful${NC}"
echo ""

# Step 3: Get service URL and verify
echo -e "${GREEN}Step 3/3: Verifying deployment...${NC}"
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --format='value(status.url)' \
  --project "${PROJECT_ID}")

echo "Service URL: ${SERVICE_URL}"
echo ""

# Test health endpoint
echo "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "${SERVICE_URL}/api/health" || echo "ERROR")

if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}✗ Health check failed${NC}"
    echo "Response: $HEALTH_RESPONSE"
    exit 1
fi

echo ""

# Test stats endpoint for knowledge count
echo "Testing stats endpoint (knowledge count)..."
STATS_RESPONSE=$(curl -s "${SERVICE_URL}/api/stats" || echo "ERROR")

if echo "$STATS_RESPONSE" | grep -q "knowledgeCount"; then
    KNOWLEDGE_COUNT=$(echo "$STATS_RESPONSE" | grep -o '"knowledgeCount":[0-9]*' | cut -d: -f2)
    if [ "$KNOWLEDGE_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓ Knowledge files loaded: ${KNOWLEDGE_COUNT}${NC}"
    else
        echo -e "${YELLOW}⚠ Warning: Knowledge count is 0${NC}"
    fi
else
    echo -e "${RED}✗ Could not retrieve knowledge count${NC}"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Deployment Complete! 🎉${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo "Service URL: ${SERVICE_URL}"
echo ""
echo "Next steps:"
echo "1. Update firebase.json to point to this service (if needed)"
echo "2. Deploy frontend: firebase deploy --only hosting"
echo "3. Test at: https://your-domain.web.app"
echo ""
echo "API Endpoints:"
echo "  Health:   ${SERVICE_URL}/api/health"
echo "  Stats:    ${SERVICE_URL}/api/stats"
echo "  Features: ${SERVICE_URL}/api/features"
echo ""
echo "Logs:"
echo "  gcloud run logs read ${SERVICE_NAME} --region ${REGION} --project ${PROJECT_ID}"
echo ""
