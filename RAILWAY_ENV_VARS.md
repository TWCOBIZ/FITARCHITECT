# Railway Environment Variables Configuration

## CRITICAL: Your Railway deployment is failing because these environment variables are NOT SET!

The deployment logs show that DATABASE_URL and other critical variables are missing from Railway.

## Required Environment Variables (MUST HAVE)

These variables MUST be set in Railway for the application to start:

### 1. DATABASE_URL (CRITICAL - App won't start without this!)
- **Description**: PostgreSQL database connection string
- **Format**: `postgresql://user:password@host:port/database`
- **Example**: `postgresql://postgres:mypassword@db.railway.internal:5432/railway`
- **How to get it**: 
  1. In Railway, create a PostgreSQL database service
  2. Click on the database service
  3. Go to "Connect" tab
  4. Copy the DATABASE_URL

### 2. JWT_SECRET (CRITICAL - Auth won't work without this!)
- **Description**: Secret key for JWT token signing
- **Format**: Random string (at least 32 characters)
- **Example**: `your-super-secret-jwt-key-change-this-in-production`
- **How to generate**: Use a password generator or run: `openssl rand -base64 32`

## Important Environment Variables (Highly Recommended)

### 3. OPENAI_API_KEY
- **Description**: OpenAI API key for AI-powered workout and meal generation
- **Format**: `sk-proj-...`
- **Get it from**: https://platform.openai.com/api-keys
- **Impact if missing**: Workout and meal plan generation will fail

### 4. STRIPE_SECRET_KEY
- **Description**: Stripe secret key for payment processing
- **Format**: `sk_live_...` or `sk_test_...`
- **Get it from**: https://dashboard.stripe.com/apikeys
- **Impact if missing**: Payment processing will fail

### 5. WGER_API_KEY
- **Description**: WGER API key for exercise database
- **Format**: API key string
- **Get it from**: https://wger.de/en/software/api
- **Impact if missing**: Exercise database features may be limited

## Optional Environment Variables

### 6. TELEGRAM_BOT_TOKEN
- **Description**: Telegram bot token for notifications
- **Format**: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
- **Get it from**: @BotFather on Telegram

### 7. STRIPE_WEBHOOK_SECRET
- **Description**: Stripe webhook endpoint secret
- **Format**: `whsec_...`
- **Get it from**: Stripe Dashboard > Webhooks

### 8. STRIPE_BASIC_PLAN_ID
- **Description**: Stripe price ID for basic plan
- **Format**: `price_...`

### 9. STRIPE_PREMIUM_PLAN_ID
- **Description**: Stripe price ID for premium plan
- **Format**: `price_...`

## Automatically Set by Railway

These are set automatically by Railway - DO NOT override:

- `PORT` - Railway provides this
- `NODE_ENV` - Set to "production" by Railway

## How to Add Environment Variables in Railway

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Select your project**
3. **Click on your service** (the one that's failing health checks)
4. **Go to "Variables" tab**
5. **Add each variable**:
   - Click "New Variable"
   - Enter the variable name (e.g., DATABASE_URL)
   - Enter the value
   - Railway will automatically redeploy when you save

## Quick Copy-Paste Template

Copy this to Railway's Variables tab and fill in the values:

```
DATABASE_URL=postgresql://[get-from-railway-postgres]
JWT_SECRET=[generate-random-32-char-string]
OPENAI_API_KEY=sk-proj-[your-openai-key]
STRIPE_SECRET_KEY=sk_live_[your-stripe-key]
WGER_API_KEY=[your-wger-key-if-you-have-one]
```

## Verification

After setting the variables, your deployment logs should show:
```
✅ All required environment variables are set
🚀 Server running on port [PORT]
✅ Database connection verified
```

If you still see errors about missing DATABASE_URL, make sure:
1. The variable is saved in Railway
2. The service has redeployed after adding the variable
3. The DATABASE_URL format is correct

## Common Issues

### "DATABASE_URL environment variable is required but not set"
- **Solution**: You haven't added DATABASE_URL to Railway variables. Follow the steps above.

### "Failed to connect to database"
- **Solution**: DATABASE_URL is set but incorrect. Check the connection string format.

### "JWT_SECRET is not defined"
- **Solution**: Add JWT_SECRET to Railway variables with a secure random string.

## Support

If you continue to have issues after setting these variables:
1. Check the deployment logs for specific error messages
2. Ensure all required variables are set
3. Try redeploying the service manually in Railway