#!/bin/bash
# Quick deployment status checker

echo "🔍 Checking Deployment Status..."
echo ""

# Check if deployment script is running
if pgrep -f "deploy-all.sh" > /dev/null; then
    echo "✅ Deployment script is running"
else
    echo "❌ Deployment script is not running"
fi

echo ""
echo "📊 Cloud Build Status:"
echo "Latest builds:"
gcloud builds list --limit=3 --format="table(id,status,createTime)" 2>/dev/null || echo "Unable to fetch builds"

echo ""
echo "🚀 Cloud Run Services:"
gcloud run services list --region=us-central1 --format="table(SERVICE,REGION,URL,LAST_DEPLOYED_BY)" 2>/dev/null || echo "Unable to fetch services"

echo ""
echo "🔗 Quick Links:"
echo "  Cloud Build Console: https://console.cloud.google.com/cloud-build/builds"
echo "  Cloud Run Console: https://console.cloud.google.com/run"
echo "  Firebase Console: https://console.firebase.google.com/project/smartlocalai-b092a"
echo ""
