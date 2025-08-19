#!/bin/bash

# Setup runtime configuration for production deployment
# This script runs during Railway build to inject environment variables

echo "Setting up runtime configuration..."
echo "Current environment variables:"
echo "  NODE_ENV: ${NODE_ENV:-'not set'}"
echo "  VITE_API_URL: ${VITE_API_URL:-'not set'}"
echo "  All VITE_ variables: $(env | grep VITE_ || echo 'none found')"

if [ -f "dist/runtime-config.js" ]; then
  echo "📄 Found dist/runtime-config.js"
  echo "📄 Current content:"
  cat dist/runtime-config.js
  
  # Determine the API URL to use
  API_URL=""
  
  # Check VITE_API_URL first since Railway should set this
  if [ -n "$VITE_API_URL" ]; then
    API_URL="$VITE_API_URL"
    echo "🔧 Using VITE_API_URL: ${API_URL}"
  elif [ -n "$NODE_ENV" ] && [ "$NODE_ENV" = "production" ]; then
    # Use Railway production backend URL when NODE_ENV is production
    API_URL="https://fitarchitect-production.up.railway.app"
    echo "🔧 Using production default: ${API_URL}"
  else
    echo "⚠️  No environment variables set, using production default"
    # Default to production URL instead of localhost
    API_URL="https://fitarchitect-production.up.railway.app"
  fi
  
  # Perform the replacement
  sed -i.bak "s|VITE_API_URL_PLACEHOLDER|${API_URL}|g" dist/runtime-config.js
  
  echo "✅ Runtime config updated with API URL: ${API_URL}"
  echo "📄 Updated content:"
  cat dist/runtime-config.js
  
  # Remove backup file
  rm -f dist/runtime-config.js.bak
else
  echo "❌ dist/runtime-config.js not found. Make sure the build completed successfully."
  exit 1
fi

echo "Runtime configuration setup complete."