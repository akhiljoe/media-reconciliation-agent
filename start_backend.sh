#!/bin/bash

# Start Flask Backend API Server
# Usage: ./start_backend.sh

echo "🚀 Starting Media Billing Reconcilliation Backend..."
echo ""

# Navigate to backend directory
cd MediaBillingReconcilliationBackend

# Check if virtual environment exists
if [ ! -d "../venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Please run: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "Creating template .env file..."
    cp .env.example .env
    echo "✅ Created .env template. Please update with your API keys."
    exit 1
fi

# Activate virtual environment
source ../venv/bin/activate

# Start Flask server
echo "🌐 Starting Flask API on http://localhost:5000"
echo "📁 Uploads will be saved to: $(pwd)/uploads"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python app.py
