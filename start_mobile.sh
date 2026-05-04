#!/bin/bash

# Start Media Billing Mobile App
# This script starts the Expo development server

echo "🚀 Starting Media Billing Mobile App..."
echo ""
echo "📱 Make sure your backend is running on http://localhost:5000"
echo ""

cd "$(dirname "$0")/MediaBillingMobileApp"

echo "Starting Expo development server..."
npm start
