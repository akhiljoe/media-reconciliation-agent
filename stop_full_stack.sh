#!/bin/bash

# Stop script for Media Billing Invoice Extraction System

echo "🛑 Stopping Media Billing Invoice Extraction System..."

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_FILE="$SCRIPT_DIR/.pids"

if [ -f "$PID_FILE" ]; then
    PIDS=$(cat "$PID_FILE")
    echo "📋 Found PIDs: $PIDS"
    
    for PID in $PIDS; do
        if ps -p $PID > /dev/null 2>&1; then
            echo "   Stopping process $PID..."
            kill $PID 2>/dev/null
        else
            echo "   Process $PID already stopped"
        fi
    done
    
    rm -f "$PID_FILE"
    echo "✅ All servers stopped"
else
    echo "⚠️  No PID file found. Searching for running processes..."
    
    # Find and kill Flask processes
    FLASK_PIDS=$(pgrep -f "python.*app.py")
    if [ ! -z "$FLASK_PIDS" ]; then
        echo "   Stopping Flask backends: $FLASK_PIDS"
        kill $FLASK_PIDS 2>/dev/null
    fi
    
    # Find and kill Vite processes
    VITE_PIDS=$(pgrep -f "vite")
    if [ ! -z "$VITE_PIDS" ]; then
        echo "   Stopping Vite frontends: $VITE_PIDS"
        kill $VITE_PIDS 2>/dev/null
    fi
    
    echo "✅ Cleanup complete"
fi

# Clean up log files (optional)
read -p "🗑️  Remove log files? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -f "$SCRIPT_DIR/backend/backend.log"
    rm -f "$SCRIPT_DIR/frontend/frontend.log"
    echo "✅ Log files removed"
fi
