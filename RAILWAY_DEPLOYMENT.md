# Railway Deployment Guide

## Required Environment Variables

Configure these environment variables in your Railway dashboard:

### Core Database Configuration
```bash
# PostgreSQL database connection string (REQUIRED)
DATABASE_URL=postgresql://user:password@host:port/database_name

# JWT secret for authentication (REQUIRED)
JWT_SECRET=your-secure-jwt-secret-here

# Application port (automatically set by Railway)
PORT=${{RAILWAY_PORT}}

# Node environment (automatically set)
NODE_ENV=production
```

### External API Keys
```bash
# OpenAI API key for AI-powered workout and meal plans (REQUIRED)
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# WGER API key for exercise database (REQUIRED)
WGER_API_KEY=your-wger-api-key-here

# Stripe payment processing (REQUIRED for subscriptions)
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key-here

# Stripe webhook endpoint secret
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret-here

# Stripe plan IDs
STRIPE_BASIC_PLAN_ID=price_your-basic-plan-id
STRIPE_PREMIUM_PLAN_ID=price_your-premium-plan-id
```

### Telegram Integration (OPTIONAL)
```bash
# Telegram bot token for notifications
TELEGRAM_BOT_TOKEN=your-telegram-bot-token-here

# Development channel ID for notifications
TELEGRAM_DEV_CHANNEL_ID=your-telegram-channel-id-here
```

### Email Service (OPTIONAL)
```bash
# Resend API key for email notifications
RESEND_API_KEY=re_your-resend-api-key-here
```

## Setting Up Railway Environment Variables

1. Go to your Railway project dashboard
2. Click on your backend service
3. Go to the **Variables** tab
4. Add each required environment variable listed above
5. Deploy your changes

## Database Setup

1. **Create PostgreSQL Database in Railway:**
   - Add PostgreSQL service to your Railway project
   - Note the connection string provided
   - Use this as your `DATABASE_URL`

2. **Initialize Database Schema:**
   ```bash
   # The build process will automatically run:
   npx prisma generate
   npx prisma db push
   ```

## Troubleshooting Common Issues

### 1. Prisma Client Error
```
PrismaClientConstructorValidationError: Invalid value undefined for datasource "db"
```
**Solution:** Ensure `DATABASE_URL` is set in Railway dashboard.

### 2. Database Connection Failed
**Check:**
- DATABASE_URL format is correct: `postgresql://user:pass@host:port/dbname`
- PostgreSQL service is running in Railway
- Network connectivity between services

### 3. Build Failures
**Check:**
- All required environment variables are set
- Prisma generate runs successfully during build
- TypeScript compilation completes without errors

## Health Check Endpoints

Once deployed, verify your deployment:

- **Health Check:** `https://your-app.up.railway.app/health`
- **API Status:** `https://your-app.up.railway.app/api/health`

## Deployment Process

1. Push changes to your connected Git repository
2. Railway automatically builds using `railway.json` configuration
3. Build process runs:
   - `npm install` (dependencies)
   - `npx prisma generate` (database client)
   - `npm run build` (TypeScript compilation)
4. Deploy with `npm run start`
5. Health checks verify successful deployment

## Security Notes

- Never commit API keys or secrets to Git
- Use Railway's encrypted environment variables
- Regularly rotate sensitive credentials
- Monitor usage of external APIs for cost management

## Monitoring

Railway provides built-in monitoring for:
- Application logs
- Resource usage (CPU, memory)
- Request metrics
- Error tracking

Access logs in Railway dashboard under the **Deployments** tab.