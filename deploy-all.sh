#!/bin/bash
# Full deployment script for SmartLocal USA (Morrow.AI)
# Deploys both backend (Cloud Run) and frontend (Firebase Hosting)

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
cat << "EOF"
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║     SmartLocal USA (Morrow.AI) - Full Deployment              ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Configuration
PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-morrow-ai-server}"

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: No project ID found${NC}"
    echo "Usage: $0 [project-id]"
    exit 1
fi

echo -e "${YELLOW}Configuration:${NC}"
echo "  Project:      $PROJECT_ID"
echo "  Region:       $REGION"
echo "  Service:      $SERVICE_NAME"
echo ""

read -p "$(echo -e ${YELLOW}Continue with deployment? [y/N]: ${NC})" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""

# ============================================================================
# STEP 1: Build Frontend
# ============================================================================
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Step 1/4: Building Frontend (Vite)                           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Frontend build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Frontend build complete${NC}"
echo ""

# ============================================================================
# STEP 2: Build & Deploy Backend (Cloud Run)
# ============================================================================
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Step 2/4: Building & Deploying Backend (Cloud Run)          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

cd ai-server

echo "Building Docker image with Cloud Build..."
gcloud builds submit \
  --tag "gcr.io/${PROJECT_ID}/${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --timeout=10m

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Backend build failed!${NC}"
    exit 1
fi

echo ""
echo "Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "gcr.io/${PROJECT_ID}/${SERVICE_NAME}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 60s \
  --max-instances 10 \
  --set-env-vars="NODE_ENV=production" \
  --project "${PROJECT_ID}"

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Backend deployment failed!${NC}"
    exit 1
fi

# Get service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --format='value(status.url)' \
  --project "${PROJECT_ID}")

echo -e "${GREEN}✓ Backend deployed: ${SERVICE_URL}${NC}"
echo ""

cd ..

# ============================================================================
# STEP 3: Verify Backend
# ============================================================================
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Step 3/4: Verifying Backend Deployment                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "${SERVICE_URL}/api/health" -m 10 || echo "ERROR")

if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
    echo "Response: $HEALTH_RESPONSE"
    exit 1
fi

echo ""
echo "Testing stats endpoint (knowledge count)..."
STATS_RESPONSE=$(curl -s "${SERVICE_URL}/api/stats" -m 10 || echo "ERROR")

if echo "$STATS_RESPONSE" | grep -q "knowledgeCount"; then
    KNOWLEDGE_COUNT=$(echo "$STATS_RESPONSE" | grep -o '"knowledgeCount":[0-9]*' | cut -d: -f2)
    if [ "$KNOWLEDGE_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓ Knowledge files loaded: ${KNOWLEDGE_COUNT}${NC}"
    else
        echo -e "${YELLOW}⚠ Warning: Knowledge count is 0${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Could not retrieve knowledge count${NC}"
fi

echo ""

# ============================================================================
# STEP 4: Deploy Frontend (Firebase Hosting)
# ============================================================================
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Step 4/4: Deploying Frontend (Firebase Hosting)             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if firebase.json exists
if [ ! -f "firebase.json" ]; then
    echo -e "${RED}✗ firebase.json not found!${NC}"
    exit 1
fi

# Verify dist directory exists
if [ ! -d "dist" ]; then
    echo -e "${RED}✗ dist directory not found! Build may have failed.${NC}"
    exit 1
fi

echo "Deploying to Firebase Hosting..."
firebase deploy --only hosting --project "${PROJECT_ID}"

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Frontend deployment failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Frontend deployed to Firebase Hosting${NC}"
echo ""

# ============================================================================
# DEPLOYMENT COMPLETE
# ============================================================================
echo -e "${GREEN}"
cat << "EOF"
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║               🎉  DEPLOYMENT COMPLETE!  🎉                     ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                      DEPLOYMENT SUMMARY${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Backend (Cloud Run):${NC}"
echo "  Service URL:    ${SERVICE_URL}"
echo "  Region:         ${REGION}"
echo "  Service Name:   ${SERVICE_NAME}"
echo "  Knowledge Files: ${KNOWLEDGE_COUNT:-N/A}"
echo ""
echo -e "${GREEN}Frontend (Firebase Hosting):${NC}"
echo "  Site:           https://smartlocalai-b092a.web.app"
echo "  Custom Domain:  (if configured)"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Visit your site: https://smartlocalai-b092a.web.app"
echo "2. Navigate to 'Advanced AI Features' (⚡ Advanced)"
echo "3. Verify 'Knowledge files: ${KNOWLEDGE_COUNT:-5}' is showing"
echo "4. Test AI features and brain mode"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "  View backend logs:"
echo "    gcloud run logs read ${SERVICE_NAME} --region ${REGION} --limit 50"
echo ""
echo "  Check backend health:"
echo "    curl ${SERVICE_URL}/api/health"
echo ""
echo "  View Cloud Run metrics:"
echo "    gcloud run services describe ${SERVICE_NAME} --region ${REGION}"
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
