# Knowledge Files Fix - Deployment Guide

## Problem Resolved

The backend Docker image was missing critical directories, resulting in:
- ❌ Knowledge files showing as 0 in production
- ❌ Missing providers, routes, services, and tools directories
- ❌ Reduced functionality in brain mode and agent features

## Solution Applied

Updated `/ai-server/Dockerfile` to include all required directories:

```dockerfile
# Copy all required directories
COPY knowledge/ ./knowledge/
COPY providers/ ./providers/
COPY routes/ ./routes/
COPY services/ ./services/
COPY tools/ ./tools/
```

## Local Verification ✅

**Backend Status** (http://localhost:8080/api/stats):
```json
{
  "queueLength": 0,
  "systemLoad": 0.33,
  "totalTokens": 0,
  "costEstimate": 0,
  "avgLatency": 0,
  "totalRequests": 0,
  "provider": "Morrow.AI",
  "model": "controller-v1",
  "activeProvider": "openai",
  "knowledgeCount": 5  ✅
}
```

**Frontend Status** (http://localhost:3001 → Advanced AI Features):
- Health: Online ✅
- Provider: Morrow.AI
- Model: controller-v1
- **Knowledge files: 5** ✅
- Queue: 0
- Server Load: ~0.3
- Tokens: 0
- Cost Estimate: 0

## Production Deployment

### Option 1: Google Cloud Build + Cloud Run

```bash
# Set your project ID
export PROJECT_ID="your-firebase-project-id"
export REGION="us-central1"
export SERVICE_NAME="morrow-ai-server"

# Navigate to backend directory
cd /workspaces/smartlocalusaversion3/ai-server

# Build and push image using Google Cloud Build
gcloud builds submit \
  --tag gcr.io/${PROJECT_ID}/${SERVICE_NAME} \
  --project ${PROJECT_ID}

# Deploy to Cloud Run
gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${SERVICE_NAME} \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 60s \
  --set-env-vars="NODE_ENV=production" \
  --project ${PROJECT_ID}

# Get the service URL
gcloud run services describe ${SERVICE_NAME} \
  --region ${REGION} \
  --format='value(status.url)' \
  --project ${PROJECT_ID}
```

### Option 2: Docker Build + Cloud Run

```bash
# Set your project ID
export PROJECT_ID="your-firebase-project-id"
export REGION="us-central1"
export SERVICE_NAME="morrow-ai-server"

cd /workspaces/smartlocalusaversion3/ai-server

# Build the Docker image locally
docker build -t ${SERVICE_NAME}:latest .

# Tag for Google Container Registry
docker tag ${SERVICE_NAME}:latest gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest

# Configure Docker to use gcloud for authentication
gcloud auth configure-docker

# Push to GCR
docker push gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest

# Deploy to Cloud Run
gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 60s \
  --max-instances 10 \
  --set-env-vars="NODE_ENV=production" \
  --project ${PROJECT_ID}
```

### Option 3: Firebase App Hosting (if configured)

```bash
cd /workspaces/smartlocalusaversion3

# Deploy backend via Firebase
firebase deploy --only apphosting
```

## Post-Deployment Verification

### 1. Check Cloud Run Service Health

```bash
# Get your service URL
SERVICE_URL=$(gcloud run services describe morrow-ai-server \
  --region us-central1 \
  --format='value(status.url)' \
  --project ${PROJECT_ID})

# Test health endpoint
curl ${SERVICE_URL}/api/health

# Expected response:
# {"status":"ok","provider":"Morrow.AI","model":"controller-v1"}
```

### 2. Verify Knowledge Count

```bash
# Test stats endpoint
curl ${SERVICE_URL}/api/stats

# Look for: "knowledgeCount":5
```

### 3. Test Frontend Integration

1. Open your production URL: `https://smartlocalai-b092a.web.app` (or your custom domain)
2. Navigate to **Advanced AI Features** (⚡ Advanced)
3. Scroll to **Morrow.AI Status** section
4. Verify:
   - ✅ Health: Online
   - ✅ Knowledge files: 5 (not 0)
   - ✅ Provider: Morrow.AI
   - ✅ Model: controller-v1

## Troubleshooting

### Issue: Still showing 0 knowledge files

**Check 1**: Verify Docker image includes knowledge directory
```bash
# Pull the deployed image
docker pull gcr.io/${PROJECT_ID}/morrow-ai-server:latest

# Inspect the image
docker run --rm gcr.io/${PROJECT_ID}/morrow-ai-server:latest ls -la /app/knowledge/

# Expected output: 5-6 files (.keep, DESIGN-DOCUMENT.md, README.md, etc.)
```

**Check 2**: Check Cloud Run logs
```bash
gcloud run logs read morrow-ai-server \
  --region us-central1 \
  --limit 50 \
  --project ${PROJECT_ID}

# Look for: "Morrow.AI server listening on port 8080"
# Should NOT see errors about missing directories
```

**Check 3**: Verify environment variables
```bash
gcloud run services describe morrow-ai-server \
  --region us-central1 \
  --format='value(spec.template.spec.containers[0].env)' \
  --project ${PROJECT_ID}
```

### Issue: Firebase Hosting not routing to Cloud Run

Check `firebase.json` rewrites:
```json
"rewrites": [
  {
    "source": "/api/**",
    "run": {
      "serviceId": "morrow-ai-server",  // Must match Cloud Run service name
      "region": "us-central1"
    }
  }
]
```

Deploy hosting configuration:
```bash
firebase deploy --only hosting
```

## Environment Variables (Optional)

Add these to Cloud Run for enhanced functionality:

```bash
gcloud run services update morrow-ai-server \
  --region us-central1 \
  --set-env-vars="\
NODE_ENV=production,\
OPENAI_API_KEY=sk-your-key-here,\
MORROW_ADMIN_TOKEN=your-secure-token,\
MORROW_KNOWLEDGE_DIR=/app/knowledge" \
  --project ${PROJECT_ID}
```

## Success Criteria

After deployment, you should see:

- ✅ Backend health check returns 200 OK
- ✅ `/api/stats` returns `"knowledgeCount": 5`
- ✅ Frontend Advanced AI Features page shows "Knowledge files: 5"
- ✅ No errors in Cloud Run logs about missing directories
- ✅ Brain mode and AI features work correctly

## Rollback (if needed)

```bash
# List all revisions
gcloud run revisions list \
  --service morrow-ai-server \
  --region us-central1 \
  --project ${PROJECT_ID}

# Rollback to previous revision
gcloud run services update-traffic morrow-ai-server \
  --to-revisions=REVISION_NAME=100 \
  --region us-central1 \
  --project ${PROJECT_ID}
```

## Next Steps

1. **Deploy the fix** using one of the options above
2. **Verify** knowledge count shows 5 in production
3. **Test** AI features to ensure full functionality
4. **Monitor** Cloud Run metrics for any issues

---

**Local Testing Commands**:
```bash
# Start both servers
npm run dev:all

# Backend: http://localhost:8080
# Frontend: http://localhost:3001 (or 3000)
# Test stats: curl http://localhost:8080/api/stats
```

**Questions or Issues?**
Check the logs and verify the Dockerfile includes all required directories.
