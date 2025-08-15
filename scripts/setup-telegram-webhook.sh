#!/bin/bash

# Setup Telegram webhook for production
# This script should be run after deployment to configure the webhook

echo "Setting up Telegram webhook for production..."

# Production configuration
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-7519345955:AAE22XP27RTiUAheUDedwEyE6mqDpdZeby4}"
BACKEND_URL="https://fitarchitect-production.up.railway.app"
WEBHOOK_URL="${BACKEND_URL}/api/telegram/webhook"

# Set the webhook
echo "Configuring webhook: ${WEBHOOK_URL}"
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${WEBHOOK_URL}\"}"

echo ""
echo "Webhook setup complete!"
echo "To verify: curl https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"