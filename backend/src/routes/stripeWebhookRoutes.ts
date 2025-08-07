import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

const router = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15'
});

// Webhook endpoint - Note: This must NOT use regular body parser
router.post('/webhook',
  // Raw body is required for signature verification
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error('Stripe webhook secret not configured', {
        operation: 'stripe_webhook_config_error',
        component: 'stripe'
      });
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    let event: Stripe.Event;

    try {
      // Verify the webhook signature
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );
    } catch (err) {
      logger.error('Stripe webhook signature verification failed', {
        operation: 'stripe_webhook_signature_error',
        component: 'stripe',
        metadata: { error: err }
      });
      return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    logger.info('Stripe webhook received', {
      operation: 'stripe_webhook_received',
      component: 'stripe',
      metadata: {
        eventType: event.type,
        eventId: event.id
      }
    });

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'payment_method.attached':
          await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
          break;

        default:
          logger.info('Unhandled webhook event type', {
            operation: 'stripe_webhook_unhandled',
            component: 'stripe',
            metadata: { eventType: event.type }
          });
      }

      res.json({ received: true });
    } catch (error) {
      logger.error('Error processing webhook', {
        operation: 'stripe_webhook_processing_error',
        component: 'stripe',
        metadata: { eventType: event.type }
      }, error as Error);
      
      // Return 200 to acknowledge receipt even if processing failed
      // This prevents Stripe from retrying
      res.json({ received: true, error: 'Processing failed' });
    }
  }
);

/**
 * Handle successful checkout session
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  logger.info('Processing checkout session completed', {
    operation: 'stripe_checkout_completed',
    component: 'stripe',
    metadata: {
      sessionId: session.id,
      customerId: session.customer,
      subscriptionId: session.subscription
    }
  });

  if (!session.customer_email) {
    logger.error('No customer email in checkout session', {
      operation: 'stripe_checkout_no_email',
      component: 'stripe',
      metadata: { sessionId: session.id }
    });
    return;
  }

  // Find user by email
  const user = await prisma.userProfile.findUnique({
    where: { email: session.customer_email }
  });

  if (!user) {
    logger.error('User not found for checkout session', {
      operation: 'stripe_checkout_user_not_found',
      component: 'stripe',
      metadata: { 
        email: session.customer_email,
        sessionId: session.id 
      }
    });
    return;
  }

  // Update user with Stripe customer ID and subscription info
  const updateData: any = {
    stripeCustomerId: session.customer as string
  };

  // If this is a subscription checkout, update subscription info
  if (session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    
    updateData.stripeSubscriptionId = subscription.id;
    updateData.subscriptionStatus = subscription.status;
    updateData.subscriptionTier = getSubscriptionTier(subscription);
    updateData.subscriptionStartDate = new Date(subscription.current_period_start * 1000);
    updateData.subscriptionEndDate = new Date(subscription.current_period_end * 1000);
  }

  await prisma.userProfile.update({
    where: { id: user.id },
    data: updateData
  });

  // Create payment record
  await prisma.payment.create({
    data: {
      userId: user.id,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || 'usd',
      status: 'succeeded',
      stripePaymentIntentId: session.payment_intent as string,
      createdAt: new Date()
    }
  });

  logger.info('Checkout session processed successfully', {
    operation: 'stripe_checkout_processed',
    component: 'stripe',
    userId: user.id,
    metadata: {
      subscriptionId: session.subscription,
      amount: session.amount_total
    }
  });
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  logger.info('Processing subscription update', {
    operation: 'stripe_subscription_update',
    component: 'stripe',
    metadata: {
      subscriptionId: subscription.id,
      status: subscription.status,
      customerId: subscription.customer
    }
  });

  const user = await prisma.userProfile.findFirst({
    where: { stripeCustomerId: subscription.customer as string }
  });

  if (!user) {
    logger.error('User not found for subscription', {
      operation: 'stripe_subscription_user_not_found',
      component: 'stripe',
      metadata: {
        customerId: subscription.customer,
        subscriptionId: subscription.id
      }
    });
    return;
  }

  const tier = getSubscriptionTier(subscription);

  await prisma.userProfile.update({
    where: { id: user.id },
    data: {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionTier: tier,
      subscriptionStartDate: new Date(subscription.current_period_start * 1000),
      subscriptionEndDate: new Date(subscription.current_period_end * 1000),
      // Update trial end date if in trial
      trialEndDate: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined
    }
  });

  logger.info('Subscription updated successfully', {
    operation: 'stripe_subscription_updated',
    component: 'stripe',
    userId: user.id,
    metadata: {
      subscriptionId: subscription.id,
      status: subscription.status,
      tier
    }
  });
}

/**
 * Handle subscription deletion/cancellation
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  logger.info('Processing subscription deletion', {
    operation: 'stripe_subscription_delete',
    component: 'stripe',
    metadata: {
      subscriptionId: subscription.id,
      customerId: subscription.customer
    }
  });

  const user = await prisma.userProfile.findFirst({
    where: { stripeCustomerId: subscription.customer as string }
  });

  if (!user) {
    logger.error('User not found for subscription deletion', {
      operation: 'stripe_subscription_delete_user_not_found',
      component: 'stripe',
      metadata: {
        customerId: subscription.customer,
        subscriptionId: subscription.id
      }
    });
    return;
  }

  // Downgrade to free tier
  await prisma.userProfile.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: 'canceled',
      subscriptionTier: 'free',
      subscriptionEndDate: new Date()
    }
  });

  logger.info('Subscription canceled successfully', {
    operation: 'stripe_subscription_canceled',
    component: 'stripe',
    userId: user.id,
    metadata: { subscriptionId: subscription.id }
  });
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  logger.info('Processing successful invoice payment', {
    operation: 'stripe_invoice_success',
    component: 'stripe',
    metadata: {
      invoiceId: invoice.id,
      subscriptionId: invoice.subscription,
      amount: invoice.amount_paid
    }
  });

  if (!invoice.customer_email) return;

  const user = await prisma.userProfile.findUnique({
    where: { email: invoice.customer_email }
  });

  if (!user) return;

  // Create payment record
  await prisma.payment.create({
    data: {
      userId: user.id,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      status: 'succeeded',
      stripePaymentIntentId: invoice.payment_intent as string,
      createdAt: new Date()
    }
  });

  // Update subscription status if needed
  if (invoice.subscription) {
    await prisma.userProfile.update({
      where: { id: user.id },
      data: { subscriptionStatus: 'active' }
    });
  }
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  logger.warn('Processing failed invoice payment', {
    operation: 'stripe_invoice_failed',
    component: 'stripe',
    metadata: {
      invoiceId: invoice.id,
      subscriptionId: invoice.subscription,
      attemptCount: invoice.attempt_count
    }
  });

  if (!invoice.customer_email) return;

  const user = await prisma.userProfile.findUnique({
    where: { email: invoice.customer_email }
  });

  if (!user) return;

  // Update subscription status
  await prisma.userProfile.update({
    where: { id: user.id },
    data: { subscriptionStatus: 'past_due' }
  });

  // Log payment failure
  await prisma.payment.create({
    data: {
      userId: user.id,
      amount: invoice.amount_due / 100,
      currency: invoice.currency,
      status: 'failed',
      stripePaymentIntentId: invoice.payment_intent as string,
      createdAt: new Date()
    }
  });
}

/**
 * Handle payment method attachment
 */
async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  logger.info('Payment method attached', {
    operation: 'stripe_payment_method_attached',
    component: 'stripe',
    metadata: {
      paymentMethodId: paymentMethod.id,
      customerId: paymentMethod.customer,
      type: paymentMethod.type
    }
  });

  // Optionally update user's default payment method
  if (paymentMethod.customer) {
    const user = await prisma.userProfile.findFirst({
      where: { stripeCustomerId: paymentMethod.customer as string }
    });

    if (user) {
      await prisma.userProfile.update({
        where: { id: user.id },
        data: { hasPaymentMethod: true }
      });
    }
  }
}

/**
 * Determine subscription tier from Stripe subscription
 */
function getSubscriptionTier(subscription: Stripe.Subscription): 'free' | 'basic' | 'premium' {
  if (!subscription.items.data.length) return 'free';
  
  const priceId = subscription.items.data[0].price.id;
  
  // Map your Stripe price IDs to tiers
  if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
    return 'premium';
  } else if (priceId === process.env.STRIPE_BASIC_PRICE_ID) {
    return 'basic';
  }
  
  return 'free';
}

export default router;