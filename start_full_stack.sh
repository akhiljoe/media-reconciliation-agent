#!/bin/bash

# Quick Start Script for Media Billing Invoice Extraction System
# This script starts both backend and frontend servers

echo "🚀 Starting Media Billing Invoice Extraction System..."
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    PY="python"
else
    PY="python3"
fi

# Check for Python
# if ! command -v python3 &> /dev/null; then
if ! command -v $PY &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

export PYTHONIOENCODING=utf-8

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

# Check for .env file
if [ ! -f "$SCRIPT_DIR/MediaBillingReconcilliationBackend/.env" ]; then
    echo "⚠️  No .env file found in backend directory"
    echo "Creating .env file. Please add your OPENAI_API_KEY..."
    echo "OPENAI_API_KEY=sk-your-key-here" > "$SCRIPT_DIR/MediaBillingReconcilliationBackend/.env"
    echo "📝 Created .env file at: MediaBillingReconcilliationBackend/.env"
    echo "Please edit it and add your OpenAI API key, then run this script again."
    exit 1
fi

# Check if OPENAI_API_KEY is set
if grep -q "sk-your-key-here" "$SCRIPT_DIR/MediaBillingReconcilliationBackend/.env"; then
    echo "⚠️  Please update OPENAI_API_KEY in MediaBillingReconcilliationBackend/.env"
    exit 1
fi

echo "✅ Environment checks passed"
echo ""

# Start backend in background
echo "🔧 Starting Flask Backend..."
cd "$SCRIPT_DIR/MediaBillingReconcilliationBackend"

# Install backend dependencies if needed
if [ ! -d "../venv" ]; then
    echo "📦 Creating virtual environment..."
    $PY -m venv ../venv
fi

# source venv/bin/activate
if [ -d "../venv/Scripts" ]; then
    source ../venv/Scripts/activate
else
    source ../venv/bin/activate
fi

echo "📦 Installing backend dependencies..."
# pip install -q flask flask-cors pandas openpyxl pdfplumber python-dotenv crewai crewai-tools
python -m pip install -q flask flask-cors pandas openpyxl pdfplumber python-dotenv crewai crewai-tools

echo "🌐 Starting Flask server on http://localhost:5000"
# python app.py > backend.log 2>&1 &
$PY app.py > backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 3

# Start frontend in background
echo ""
echo "🎨 Starting React Frontend..."
cd "$SCRIPT_DIR/MediaBillingReconcilliation"

# Install frontend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo "🌐 Starting Vite dev server on http://localhost:5173"
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ System Started Successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Invoice Extraction UI: http://localhost:5173"
echo "🔌 Flask API Backend:     http://localhost:5000"
echo ""
echo "📊 Services:"
echo "   - Backend PID:  $BACKEND_PID"
echo "   - Frontend PID: $FRONTEND_PID"
echo ""
echo "📝 Logs:"
echo "   - Backend:  MediaBillingReconcilliationBackend/backend.log"
echo "   - Frontend: MediaBillingReconcilliation/frontend.log"
echo ""
echo "🛑 To stop servers:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Save PIDs to file for easy shutdown
echo "$BACKEND_PID $FRONTEND_PID" > "$SCRIPT_DIR/.pids"

# Wait for user interrupt
echo ""
echo "Press Ctrl+C to stop all servers..."
echo ""

# Trap Ctrl+C
trap "echo ''; echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm -f '$SCRIPT_DIR/.pids'; echo '✅ Servers stopped'; exit 0" INT

# Keep script running
wait
