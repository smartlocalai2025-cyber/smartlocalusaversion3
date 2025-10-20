#!/bin/bash
# Test if the Docker container starts properly locally before deploying

echo "🔍 Testing Docker Container Locally..."
echo ""

# Build the image locally
echo "1. Building Docker image..."
cd /workspaces/smartlocalusaversion3/ai-server
docker build -t morrow-ai-test:latest . -q

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi

echo "✅ Build successful"
echo ""

# Run the container
echo "2. Starting container on port 9000..."
CONTAINER_ID=$(docker run -d -p 9000:8080 -e PORT=8080 morrow-ai-test:latest)

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Failed to start container!"
    exit 1
fi

echo "✅ Container started: $CONTAINER_ID"
echo ""

# Wait for startup
echo "3. Waiting for server to start (15 seconds)..."
sleep 15

# Check if container is still running
if ! docker ps | grep -q $CONTAINER_ID; then
    echo "❌ Container crashed! Checking logs:"
    docker logs $CONTAINER_ID
    docker rm -f $CONTAINER_ID 2>/dev/null
    exit 1
fi

# Test health endpoint
echo "4. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:9000/api/health -m 5)

if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo "✅ Health check passed!"
    echo "Response: $HEALTH_RESPONSE"
else
    echo "❌ Health check failed!"
    echo "Response: $HEALTH_RESPONSE"
    echo ""
    echo "Container logs:"
    docker logs $CONTAINER_ID | tail -20
    docker rm -f $CONTAINER_ID 2>/dev/null
    exit 1
fi

echo ""

# Test stats endpoint
echo "5. Testing stats endpoint..."
STATS_RESPONSE=$(curl -s http://localhost:9000/api/stats -m 5)

if echo "$STATS_RESPONSE" | grep -q "knowledgeCount"; then
    KNOWLEDGE_COUNT=$(echo "$STATS_RESPONSE" | grep -o '"knowledgeCount":[0-9]*' | cut -d: -f2)
    echo "✅ Stats endpoint works!"
    echo "Knowledge Count: $KNOWLEDGE_COUNT"
else
    echo "⚠️  Stats endpoint returned unexpected response"
    echo "Response: $STATS_RESPONSE"
fi

echo ""

# Cleanup
echo "6. Cleaning up..."
docker rm -f $CONTAINER_ID 2>/dev/null
docker rmi morrow-ai-test:latest 2>/dev/null

echo ""
echo "✅ All tests passed! Container is ready for Cloud Run deployment."
echo ""
