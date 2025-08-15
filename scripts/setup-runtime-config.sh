#!/bin/bash

# Setup runtime configuration for production deployment
# This script runs during Railway build to inject environment variables

echo "Setting up runtime configuration..."

if [ -f "dist/runtime-config.js" ]; then
  # Replace placeholder with actual environment variable
  # Check VITE_API_URL first since Railway always sets this
  if [ -n "$VITE_API_URL" ]; then
    sed -i.bak "s|VITE_API_URL_PLACEHOLDER|${VITE_API_URL}|g" dist/runtime-config.js
    echo "✅ Runtime config updated with API URL: ${VITE_API_URL}"
  elif [ -n "$NODE_ENV" ] && [ "$NODE_ENV" = "production" ]; then
    # Use Railway production backend URL when NODE_ENV is production
    PRODUCTION_API_URL="https://fitarchitect-production.up.railway.app"
    sed -i.bak "s|VITE_API_URL_PLACEHOLDER|${PRODUCTION_API_URL}|g" dist/runtime-config.js
    echo "✅ Production config: API URL set to ${PRODUCTION_API_URL}"
  else
    echo "⚠️  VITE_API_URL environment variable not set, using production default"
    # Default to production URL instead of localhost
    sed -i.bak "s|VITE_API_URL_PLACEHOLDER|https://fitarchitect-production.up.railway.app|g" dist/runtime-config.js
  fi
  # Remove backup file
  rm -f dist/runtime-config.js.bak
else
  echo "❌ dist/runtime-config.js not found. Make sure the build completed successfully."
  exit 1
fi

echo "Runtime configuration setup complete."