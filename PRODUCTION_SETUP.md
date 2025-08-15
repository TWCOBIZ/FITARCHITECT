# FitArchitect Production Setup Guide

## Environment Variables Required

### Frontend Service (Set in Railway Dashboard)
- VITE_API_URL (backend URL)
- VITE_STRIPE_PUBLISHABLE_KEY (pk_live_ format)
- VITE_STRIPE_BASIC_PLAN_ID
- VITE_STRIPE_PREMIUM_PLAN_ID
- VITE_WGER_API_KEY
- VITE_EXERCISEDB_API_KEY
- VITE_OPENAI_MODEL
- VITE_TEST_USER_EMAILS

### Backend Service (Set in Railway Dashboard)
- DATABASE_URL (PostgreSQL connection)
- JWT_SECRET
- NODE_ENV=production
- OPENAI_API_KEY
- OPENAI_MODEL
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_BASIC_PRICE_ID
- STRIPE_PREMIUM_PRICE_ID
- TELEGRAM_BOT_TOKEN
- RESEND_API_KEY
- FROM_EMAIL
- FROM_NAME
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- CORS_ORIGIN
- FRONTEND_URL
- WGER_API_KEY
- ANTHROPIC_API_KEY

**Note**: All API keys and secrets should be set directly in Railway dashboard variables tab.

## Railway Configuration

### Build Settings
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`
- **Node Version**: 18

### Important URLs
- **Frontend**: https://fitarchitect-production-78ff.up.railway.app
- **Backend API**: https://fitarchitect-production.up.railway.app
- **Database**: PostgreSQL on Railway

## Post-Deployment Steps

### 1. Set up Telegram Webhook
After deployment, run:
```bash
chmod +x scripts/setup-telegram-webhook.sh
./scripts/setup-telegram-webhook.sh
```

### 2. Configure Stripe Webhooks
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://fitarchitect-production.up.railway.app/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook signing secret and update `STRIPE_WEBHOOK_SECRET` in Railway

### 3. Database Setup
```bash
cd backend
npx prisma generate
npx prisma db push
npm run db:seed
```

## Verification Checklist

- [ ] Frontend loads without errors
- [ ] API health check responds: `https://fitarchitect-production.up.railway.app/health`
- [ ] Authentication works (login/register)
- [ ] Stripe payment flow works
- [ ] Workout generation works
- [ ] Meal planning works
- [ ] Telegram notifications work
- [ ] File uploads work (avatars)
- [ ] Exercise GIFs load properly

## Troubleshooting

### Frontend can't connect to backend
- Check `VITE_API_URL` is set correctly in Railway
- Verify CORS settings match frontend URL
- Check runtime-config.js is being generated properly

### Stripe errors
- Ensure publishable key starts with `pk_live_`
- Verify webhook secret is configured
- Check Stripe webhook endpoint is accessible

### Telegram not working
- Run the webhook setup script
- Verify bot token is correct
- Check webhook info: `curl https://api.telegram.org/bot[TOKEN]/getWebhookInfo`

### Database issues
- Verify DATABASE_URL is correct
- Run migrations: `npx prisma migrate deploy`
- Check connection: `npx prisma db push`