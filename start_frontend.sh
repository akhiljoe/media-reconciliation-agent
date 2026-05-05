#!/bin/bash

# Start React Frontend
# Usage: ./start_frontend.sh

echo "🎨 Starting Media Billing Reconcilliation Frontend..."
echo ""

# Navigate to React app
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

# Start Vite dev server
echo "🌐 Starting React app on http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
