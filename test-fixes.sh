#!/bin/bash

echo "🔧 Testing application after fixes..."

# Build the application
echo "📦 Building application..."
npm run build

# Check for any build errors
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Start the development server
    echo "🚀 Starting development server..."
    echo "Your app will be available at: http://localhost:5173"
    echo ""
    echo "❗ IMPORTANT: Remember to:"
    echo "1. Replace YOUR_MAPS_API_KEY_HERE in .env.local with your actual Google Maps API key"
    echo "2. Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
    echo ""
    npm run dev
else
    echo "❌ Build failed. Please check the errors above."
fi