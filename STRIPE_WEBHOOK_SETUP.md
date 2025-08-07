# Stripe Webhook Setup Guide

## Overview
Stripe webhooks are **CRITICAL** for maintaining accurate subscription status. Without webhooks, subscription changes (cancellations, payment failures, etc.) won't be reflected in your database, creating security vulnerabilities.

## Required Webhook Events
Configure your Stripe webhook to listen for these events:

### Essential Events:
- `checkout.session.completed` - New subscription created
- `customer.subscription.created` - Subscription activated  
- `customer.subscription.updated` - Subscription modified
- `customer.subscription.deleted` - Subscription canceled
- `invoice.payment_succeeded` - Payment successful
- `invoice.payment_failed` - Payment failed
- `payment_method.attached` - Payment method added

## Setup Instructions

### 1. Create Webhook in Stripe Dashboard
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events listed above
5. Click "Add endpoint"

### 2. Get Webhook Secret
1. Click on your newly created webhook
2. Copy the "Signing secret" (starts with `whsec_`)
3. Add to your `.env` file:
   ```
   STRIPE_WEBHOOK_SECRET="whsec_your_actual_signing_secret_here"
   ```

### 3. Configure Price IDs
Add your Stripe price IDs to `.env`:
```env
STRIPE_BASIC_PRICE_ID="price_your_basic_plan_price_id"
STRIPE_PREMIUM_PRICE_ID="price_your_premium_plan_price_id"
```

### 4. Database Migration
Run the database migration to add new Stripe fields:
```bash
npx prisma db push
# or
npx prisma migrate dev --name add-stripe-webhook-fields
```

## Testing Webhooks

### Local Development
Use Stripe CLI to forward webhooks to localhost:

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Forward webhooks: 
   ```bash
   stripe listen --forward-to localhost:3001/api/stripe/webhook
   ```
4. Copy the webhook secret from CLI output
5. Test with: `stripe trigger checkout.session.completed`

### Production Testing
1. Use a tool like ngrok to expose localhost: `ngrok http 3001`
2. Set webhook URL to: `https://your-ngrok-url.ngrok.io/api/stripe/webhook`
3. Test with real Stripe test payments

## Security Features

### Signature Verification
The webhook endpoint automatically verifies Stripe signatures to prevent:
- Replay attacks
- Unauthorized webhook calls
- Data tampering

### Error Handling
- All webhook events are logged with structured logging
- Failed webhook processing is logged but returns 200 to prevent retries
- Database transactions ensure data consistency

### Rate Limiting
Webhooks bypass general rate limiting but include monitoring for:
- Excessive webhook calls
- Suspicious patterns
- Error rates

## Monitoring

### Logs to Monitor
- `stripe_webhook_received` - Webhook received
- `stripe_checkout_completed` - Successful checkout
- `stripe_subscription_update` - Subscription changes
- `stripe_subscription_canceled` - Cancellations
- `stripe_webhook_signature_error` - Security issues

### Key Metrics
- Webhook success rate (should be >99%)
- Subscription sync accuracy
- Payment processing time
- Error rates by event type

## Troubleshooting

### Common Issues
1. **Signature verification fails**: Check webhook secret is correct
2. **User not found**: Ensure emails match between Stripe and your database
3. **Database errors**: Check Prisma schema is up to date
4. **Timeouts**: Webhook processing should complete within 10 seconds

### Debug Steps
1. Check webhook logs in Stripe Dashboard
2. Check server logs for detailed error messages
3. Verify webhook secret in environment variables
4. Test with Stripe CLI webhook forwarding

## Production Deployment

### Required Environment Variables
```env
STRIPE_SECRET_KEY="sk_live_your_live_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_live_webhook_secret"
STRIPE_BASIC_PRICE_ID="price_live_basic_price_id"
STRIPE_PREMIUM_PRICE_ID="price_live_premium_price_id"
```

### Deployment Checklist
- [ ] Webhook endpoint is publicly accessible
- [ ] HTTPS is enabled (required by Stripe)
- [ ] Webhook secret is configured
- [ ] Price IDs are updated for production
- [ ] Database migration is complete
- [ ] Error monitoring is set up
- [ ] Test subscription flow end-to-end

## Security Best Practices

1. **Never expose webhook secrets** in client-side code
2. **Always verify signatures** before processing events
3. **Use HTTPS** for webhook endpoints (required by Stripe)
4. **Log all webhook events** for audit trails
5. **Implement idempotency** for duplicate event handling
6. **Monitor for unusual patterns** in webhook calls

## Support
If webhooks aren't working:
1. Check Stripe Dashboard for webhook delivery status
2. Verify endpoint returns 200 status codes
3. Check server logs for processing errors
4. Test with Stripe CLI in development

For production issues, check both Stripe logs and your application logs to identify the root cause.