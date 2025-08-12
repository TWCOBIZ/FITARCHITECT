#!/bin/bash

# Setup runtime configuration for production deployment
# This script runs during Railway build to inject environment variables

echo "Setting up runtime configuration..."

if [ -f "dist/runtime-config.js" ]; then
  # Replace placeholder with actual environment variable
  if [ -n "$VITE_API_URL" ]; then
    sed -i.bak "s|VITE_API_URL_PLACEHOLDER|${VITE_API_URL}|g" dist/runtime-config.js
    echo "✅ Runtime config updated with API URL: ${VITE_API_URL}"
  else
    echo "⚠️  VITE_API_URL environment variable not set, using default"
    sed -i.bak "s|VITE_API_URL_PLACEHOLDER|http://localhost:3001|g" dist/runtime-config.js
  fi
  # Remove backup file
  rm -f dist/runtime-config.js.bak
else
  echo "❌ dist/runtime-config.js not found. Make sure the build completed successfully."
  exit 1
fi

echo "Runtime configuration setup complete."