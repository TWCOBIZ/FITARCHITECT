// @ts-ignore
require('dotenv').config();

import express = require('express');
import { Request, Response, NextFunction } from 'express';
const cors = require('cors');
const Stripe = require('stripe');
import { PrismaClient, UserProfile } from '@prisma/client';
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const TelegramBot = require('node-telegram-bot-api');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const app = express();
const port = process.env.PORT || 3001;

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15'
});

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
let telegramBot: typeof TelegramBot | null = null;
if (TELEGRAM_BOT_TOKEN) {
  telegramBot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
} else {
  console.warn('TELEGRAM_BOT_TOKEN not set. Telegram notifications disabled.');
}

// Middleware
app.use(cors());
app.use(express.json());

// Utility: check if user is the test user who should always have full access
function isTestUser(user: any) {
  return user && (user.email === 'nepacreativeagency@icloud.com');
}

// Create a subscription
app.post('/api/create-subscription', async (req: Request, res: Response) => {
  try {
    const { paymentMethodId, planId, planName, userId } = req.body;

    // Create or get customer
    const customer = await stripe.customers.create({
      payment_method: paymentMethodId,
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create subscription in Stripe
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: planId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    // Store subscription in DB
    if (userId && planName) {
      await prisma.subscription.create({
        data: {
          userId,
          planId,
          plan: planName,
          status: 'active',
          startDate: new Date(),
        },
      });
    }

    res.json({
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as any).payment_intent.client_secret,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get subscription status
app.get('/api/subscription/:subscriptionId', async (req: Request, res: Response) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(req.params.subscriptionId)
    res.json(subscription)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Cancel subscription
app.post('/api/cancel-subscription/:subscriptionId', async (req: Request, res: Response) => {
  try {
    const subscription = await stripe.subscriptions.cancel(req.params.subscriptionId)
    res.json(subscription)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Get available plans
app.get('/api/plans', async (req: Request, res: Response) => {
  try {
    const plans = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
    })
    res.json(plans.data)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Admin login route
app.post('/api/admin/login', async (req: Request, res: Response) => {
  const { email, password } = req.body
  try {
    const user = await prisma.userProfile.findUnique({ where: { email } })
    if (!user || !user.isAdmin) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    // Use bcrypt for password comparison
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    const token = jwt.sign({ userId: user.id, isAdmin: true }, JWT_SECRET, { expiresIn: '1h' })
    res.json({ token })
  } catch (error) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Admin auth middleware
function adminAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; isAdmin: boolean };
    if (!payload.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    prisma.userProfile.findUnique({ where: { id: payload.userId } })
      .then(user => {
        if (!user || !user.isAdmin) return res.status(403).json({ error: 'Not an admin' });
        (req as any).admin = user;
        next();
      })
      .catch(() => res.status(500).json({ error: 'Failed to fetch admin' }));
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Get current admin info
app.get('/api/admin/me', adminAuth, async (req: Request, res: Response) => {
  if (!req.admin) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const user = await prisma.userProfile.findUnique({ where: { id: req.admin.id } })
    if (!user || !user.isAdmin) return res.status(404).json({ error: 'Not found' })
    res.json({ id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// Enhanced GET /api/admin/users with filtering/sorting
app.get('/api/admin/users', adminAuth, async (req: Request, res: Response) => {
  try {
    const { search = '', status = 'all', role = 'all', sort = 'createdAt-desc' } = req.query;
    let where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status !== 'all') {
      where.active = status === 'active';
    }
    if (role !== 'all') {
      where.isAdmin = role === 'admin';
    }
    let orderBy: any = {};
    if (sort === 'name-asc') orderBy = { name: 'asc' };
    else if (sort === 'name-desc') orderBy = { name: 'desc' };
    else if (sort === 'createdAt-asc') orderBy = { createdAt: 'asc' };
    else orderBy = { createdAt: 'desc' };
    const users = await prisma.userProfile.findMany({ where, orderBy });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PATCH /api/admin/users/:id for profile updates
app.patch('/api/admin/users/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    const user = await prisma.userProfile.update({ where: { id }, data: { name, email } });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// POST /api/admin/users/:id/activate
app.post('/api/admin/users/:id/activate', adminAuth, async (req: Request, res: Response) => {
  // The 'active' field does not exist in the UserProfile model. Endpoint not implemented.
  return res.status(501).json({ error: 'Not implemented: UserProfile has no active field.' });
});

// POST /api/admin/users/:id/deactivate
app.post('/api/admin/users/:id/deactivate', adminAuth, async (req: Request, res: Response) => {
  // The 'active' field does not exist in the UserProfile model. Endpoint not implemented.
  return res.status(501).json({ error: 'Not implemented: UserProfile has no active field.' });
});

// POST /api/admin/users/:id/reset-password
app.post('/api/admin/users/:id/reset-password', adminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const hashed = await bcrypt.hash(newPassword, 10);
    const user = await prisma.userProfile.update({ where: { id }, data: { password: hashed } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// POST /api/admin/users/:id/role (promote/demote)
app.post('/api/admin/users/:id/role', adminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isAdmin } = req.body;
    const user = await prisma.userProfile.update({ where: { id }, data: { isAdmin } });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Get all subscriptions (mock)
app.get('/api/admin/subscriptions', adminAuth, async (req: Request, res: Response) => {
  try {
    // TODO: Replace with real subscription data
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// Get analytics (mock)
app.get('/api/admin/analytics', adminAuth, async (req: Request, res: Response) => {
  try {
    const totalUsers = await prisma.userProfile.count();
    const data = {
      totalUsers,
      activeUsers: 0, // TODO: Implement real active user logic
      newSignups: 0,  // TODO: Implement real signup logic
      churnRate: 0,   // TODO: Implement real churn logic
      subscriptionBreakdown: { free: totalUsers, basic: 0, premium: 0 },
    };
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get PAR-Q flagged users (parqCompleted === false)
app.get('/api/admin/parq', adminAuth, async (req: Request, res: Response) => {
  try {
    const flagged = await prisma.userProfile.findMany({ where: { parqCompleted: false } });
    res.json(flagged);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch PAR-Q users' });
  }
});

// User registration endpoint
app.post('/api/register', async (req: Request, res: Response) => {
  const { email, password, name, height, weight, age, gender, fitnessGoals, activityLevel, dietaryPreferences } = req.body;
  if (!email || !password || !name || height == null || weight == null || age == null || !gender || !fitnessGoals || !activityLevel || !dietaryPreferences) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const existing = await prisma.userProfile.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.userProfile.create({
      data: {
        email,
        password: hashed,
        name,
        height: parseFloat(height),
        weight: parseFloat(weight),
        age: parseInt(age),
        gender,
        fitnessGoals,
        activityLevel,
        dietaryPreferences,
        parqCompleted: false,
      },
    });
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User login endpoint
app.post('/api/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const user = await prisma.userProfile.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// JWT auth middleware for user endpoints
function userAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    prisma.userProfile.findUnique({ where: { id: payload.userId } })
      .then(user => {
        if (!user) return res.status(401).json({ error: 'User not found' });
        (req as any).user = user;
        next();
      })
      .catch(() => res.status(500).json({ error: 'Failed to fetch user' }));
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// User dashboard endpoint
app.get('/api/dashboard', userAuth, async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const user = await prisma.userProfile.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        parqCompleted: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Log a completed workout
app.post('/api/workout-log', userAuth, async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { planId, workoutId, exercises, notes } = req.body;
  try {
    const log = await prisma.workoutLog.create({
      data: { userId, planId, workoutId, exercises, notes }
    });
    res.json(log);
  } catch (error) {
    console.error('Failed to log workout:', error);
    res.status(500).json({ error: 'Failed to log workout' });
  }
});

// Get workout history for user
app.get('/api/workout-log', userAuth, async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const logs = await prisma.workoutLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    console.error('Failed to fetch workout history:', error);
    res.status(500).json({ error: 'Failed to fetch workout history' });
  }
});

// Delete a nutrition log
// app.delete('/api/nutrition-log/:id', userAuth, async (req: Request, res: Response) => {
//   const userId = req.user.userId;
//   const { id } = req.params;
//   try {
//     const log = await prisma.nutritionLog.findUnique({ where: { id } });
//     if (!log || log.userId !== userId) return res.status(404).json({ error: 'Log not found' });
//     await prisma.nutritionLog.delete({ where: { id } });
//     res.json({ success: true });
//   } catch {
//     res.status(500).json({ error: 'Failed to delete log' });
//   }
// });

// Edit a nutrition log
// app.put('/api/nutrition-log/:id', userAuth, async (req: Request, res: Response) => {
//   const userId = req.user.userId;
//   const { id } = req.params;
//   const { foods, calories, macros, notes } = req.body;
//   try {
//     const log = await prisma.nutritionLog.findUnique({ where: { id } });
//     if (!log || log.userId !== userId) return res.status(404).json({ error: 'Log not found' });
//     const updated = await prisma.nutritionLog.update({
//       where: { id },
//       data: { foods, calories, macros, notes },
//     });
//     res.json(updated);
//   } catch {
//     res.status(500).json({ error: 'Failed to update log' });
//   }
// });

// Content management endpoints
// app.get('/api/admin/content', adminAuth, async (req: Request, res: Response) => {
//   try {
//     const items = await prisma.contentItem.findMany();
//     res.json(items);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to fetch content' });
//   }
// });

// app.post('/api/admin/content', adminAuth, async (req: Request, res: Response) => {
//   const { title, type, body } = req.body;
//   try {
//     const item = await prisma.contentItem.create({ data: { title, type, body } });
//     res.json(item);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to create content' });
//   }
// });

// app.put('/api/admin/content/:id', adminAuth, async (req: Request, res: Response) => {
//   const { id } = req.params;
//   const { title, type, body } = req.body;
//   try {
//     const item = await prisma.contentItem.update({ where: { id: Number(id) }, data: { title, type, body } });
//     res.json(item);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to update content' });
//   }
// });

// app.delete('/api/admin/content/:id', adminAuth, async (req: Request, res: Response) => {
//   const { id } = req.params;
//   try {
//     await prisma.contentItem.delete({ where: { id: Number(id) } });
//     res.json({ success: true });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to delete content' });
//   }
// });

// Telegram notification endpoint
app.post('/api/telegram/notify', async (req: Request, res: Response) => {
  if (!telegramBot) return res.status(500).json({ error: 'Telegram bot not configured' })
  const { userId, message } = req.body
  if (!userId || !message) return res.status(400).json({ error: 'Missing userId or message' })
  try {
    const user = await prisma.userProfile.findUnique({ where: { id: userId } })
    if (!user || !user.telegramChatId) return res.status(404).json({ error: 'User or Telegram chat ID not found' })
    await telegramBot.sendMessage(user.telegramChatId, message)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to send Telegram message' })
  }
})

// Error reporting endpoint for Telegram (dev channel)
app.post('/api/telegram/error', async (req: Request, res: Response) => {
  if (!telegramBot) return res.status(500).json({ error: 'Telegram bot not configured' })
  const { message } = req.body
  const chatId = process.env.NEXT_PUBLIC_TELEGRAM_DEV_CHANNEL_ID
  if (!chatId || !message) return res.status(400).json({ error: 'Missing chatId or message' })
  try {
    await telegramBot.sendMessage(chatId, message)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to send Telegram error message' })
  }
})

// Guest registration endpoint
app.post('/api/guest-register', async (req: Request, res: Response) => {
  try {
    const guestEmail = `guest-${Date.now()}@fitarchitect.com`;
    const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);
    const user = await prisma.userProfile.create({
      data: {
        email: guestEmail,
        name: 'Guest User',
        type: 'guest',
        height: 170,
        weight: 70,
        age: 30,
        gender: 'other',
        fitnessGoals: [],
        activityLevel: 'moderate',
        dietaryPreferences: [],
        password: randomPassword,
        parqCompleted: false,
      },
    });
    const token = jwt.sign({ userId: user.id, email: user.email, type: 'guest' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, type: user.type } });
  } catch (error) {
    res.status(500).json({ error: 'Guest registration failed' });
  }
});

// Upgrade guest to registered user endpoint
app.post('/api/upgrade-guest', userAuth, async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const existing = await prisma.userProfile.findUnique({ where: { email } });
    if (existing && existing.id !== userId) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.userProfile.update({
      where: { id: userId },
      data: {
        email,
        password: hashed,
        name,
        type: 'registered',
      },
    });
    const token = jwt.sign({ userId: user.id, email: user.email, type: 'registered' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, type: user.type } });
  } catch (error) {
    res.status(500).json({ error: 'Upgrade failed' });
  }
});

// Enhanced GET /api/admin/subscriptions with filtering/sorting
app.get('/api/admin/subscriptions', adminAuth, async (req: Request, res: Response) => {
  try {
    // TODO: Add filtering/sorting logic
    const subs = await prisma.subscription.findMany({
      include: { user: true, planRef: true },
    });
    res.json(subs.map(sub => ({
      id: sub.id,
      userEmail: sub.user?.email,
      plan: sub.plan, // string
      planName: sub.planRef?.name, // Plan relation (optional)
      status: sub.status,
      startDate: sub.startDate,
      endDate: sub.endDate,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get subscription details
app.get('/api/admin/subscriptions/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { id: req.params.id },
      include: { user: true, planRef: true, payments: true },
    });
    if (!sub) return res.status(404).json({ error: 'Not found' });
    res.json({
      id: sub.id,
      userEmail: sub.user?.email,
      plan: sub.plan, // string
      planName: sub.planRef?.name, // Plan relation (optional)
      status: sub.status,
      startDate: sub.startDate,
      endDate: sub.endDate,
      paymentHistory: sub.payments?.map((p: any) => ({
        id: p.id,
        amount: p.amount,
        date: p.date,
        status: p.status,
      })) || [],
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel subscription
app.post('/api/admin/subscriptions/:id/cancel', adminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Optionally cancel in Stripe as well
    const sub = await prisma.subscription.update({ where: { id }, data: { status: 'cancelled', endDate: new Date() } });
    res.json(sub);
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Refund subscription (stub, real logic would depend on Stripe integration)
app.post('/api/admin/subscriptions/:id/refund', adminAuth, async (req: Request, res: Response) => {
  try {
    // TODO: Integrate with Stripe for real refunds
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refund subscription' });
  }
});

// Change plan
app.post('/api/admin/subscriptions/:id/change-plan', adminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { planId, plan } = req.body;
    const sub = await prisma.subscription.update({ where: { id }, data: { planId, plan } });
    res.json(sub);
  } catch (error) {
    res.status(500).json({ error: 'Failed to change plan' });
  }
});

// Plans management
app.get('/api/admin/plans', adminAuth, async (req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany();
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});
app.post('/api/admin/plans', adminAuth, async (req: Request, res: Response) => {
  try {
    const { name, price } = req.body;
    const plan = await prisma.plan.create({ data: { name, price } });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create plan' });
  }
});
app.patch('/api/admin/plans/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, price } = req.body;
    const plan = await prisma.plan.update({ where: { id }, data: { name, price } });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update plan' });
  }
});
app.delete('/api/admin/plans/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.plan.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

// Analytics endpoint
app.get('/api/admin/subscriptions/analytics', adminAuth, async (req: Request, res: Response) => {
  try {
    const [revenue, active, cancelled, total] = await Promise.all([
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.subscription.count({ where: { status: 'cancelled' } }),
      prisma.subscription.count(),
    ]);
    const churn = total ? (cancelled / total) * 100 : 0;
    res.json({ revenue: revenue._sum.amount || 0, active, cancelled, churn: Math.round(churn * 100) / 100 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET all PAR-Q submissions (admin)
app.get('/api/admin/parq-responses', adminAuth, async (req, res) => {
  try {
    const responses = await prisma.parqResponse.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(responses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch PAR-Q responses' });
  }
});
// GET a specific user's PAR-Q answers (admin)
app.get('/api/admin/parq-responses/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const response = await prisma.parqResponse.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch PAR-Q response' });
  }
});
// Flag a response/question for follow-up (admin)
app.post('/api/admin/parq-responses/:userId/flag', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { flaggedQuestions } = req.body;
    const response = await prisma.parqResponse.updateMany({
      where: { userId },
      data: { flagged: true, flaggedQuestions },
    });
    // TODO: Trigger notification to admins
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to flag PAR-Q response' });
  }
});
// Add a follow-up note (admin)
app.post('/api/admin/parq-responses/:userId/note', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { note } = req.body;
    const response = await prisma.parqResponse.updateMany({
      where: { userId },
      data: { notes: { push: note } },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add note' });
  }
});
// Generate PAR-Q report (admin)
app.get('/api/admin/parq-report', adminAuth, async (req, res) => {
  try {
    // Example: count flagged, total, trends
    const total = await prisma.parqResponse.count();
    const flagged = await prisma.parqResponse.count({ where: { flagged: true } });
    // TODO: Add more analytics
    res.json({ total, flagged, flaggedRate: total ? (flagged / total) * 100 : 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});
// User: update their PAR-Q answers
app.patch('/api/parq-response', userAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { answers } = req.body;
    const response = await prisma.parqResponse.create({ data: { userId, answers, flagged: false, flaggedQuestions: [], notes: [] } });
    // Update the user profile with the latest answers
    await prisma.userProfile.update({ where: { id: userId }, data: { parqAnswers: answers } });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update PAR-Q' });
  }
});
// User: get their PAR-Q answers
app.get('/api/parq-response', userAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const response = await prisma.parqResponse.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch PAR-Q' });
  }
});

// --- System Management Endpoints ---
let systemSettings = { maintenance: false, notifEmail: '' };
let flaggedContent: any[] = [];
let errorLogs: any[] = [];
let notifications: any[] = [];
let auditLogs: any[] = [];

app.get('/api/admin/settings', adminAuth, (req, res) => {
  res.json(systemSettings);
});
app.patch('/api/admin/settings', adminAuth, (req, res) => {
  const { maintenance, notifEmail } = req.body;
  if (typeof maintenance === 'boolean') systemSettings.maintenance = maintenance;
  if (typeof notifEmail === 'string') systemSettings.notifEmail = notifEmail;
  auditLogs.push({ time: new Date().toISOString(), admin: req.admin.email, action: 'Updated settings' });
  res.json(systemSettings);
});
app.get('/api/admin/flagged-content', adminAuth, (req, res) => {
  res.json(flaggedContent);
});
app.post('/api/admin/content/:id/approve', adminAuth, (req, res) => {
  auditLogs.push({ time: new Date().toISOString(), admin: req.admin.email, action: `Approved content ${req.params.id}` });
  res.json({ success: true });
});
app.post('/api/admin/content/:id/reject', adminAuth, (req, res) => {
  auditLogs.push({ time: new Date().toISOString(), admin: req.admin.email, action: `Rejected content ${req.params.id}` });
  res.json({ success: true });
});
app.post('/api/admin/backup', adminAuth, (req, res) => {
  auditLogs.push({ time: new Date().toISOString(), admin: req.admin.email, action: 'Triggered backup' });
  res.json({ success: true });
});
app.post('/api/admin/restore', adminAuth, (req, res) => {
  auditLogs.push({ time: new Date().toISOString(), admin: req.admin.email, action: 'Triggered restore' });
  res.json({ success: true });
});
app.get('/api/admin/errors', adminAuth, (req, res) => {
  res.json(errorLogs);
});
app.get('/api/admin/notifications', adminAuth, (req, res) => {
  res.json(notifications);
});
app.post('/api/admin/notifications', adminAuth, (req, res) => {
  const { message } = req.body;
  notifications.push({ time: new Date().toISOString(), admin: req.admin.email, message });
  auditLogs.push({ time: new Date().toISOString(), admin: req.admin.email, action: 'Sent notification' });
  res.json({ success: true });
});
app.get('/api/admin/audit-logs', adminAuth, (req, res) => {
  res.json(auditLogs);
});

// --- 2FA for Admins ---
// POST /api/admin/2fa/setup, /verify, /disable
// --- User Impersonation ---
// POST /api/admin/impersonate
// --- Stripe Webhook Event Log ---
// GET /api/admin/stripe-webhooks, POST /api/admin/stripe-webhooks/retry
// --- Advanced Notifications ---
// POST /api/admin/notify-parq-flagged, POST /api/admin/followup-reminder
// --- Analytics Enhancements ---
// GET /api/admin/analytics?range=, GET /api/admin/analytics/pdf, POST /api/admin/analytics/schedule
// --- System Management Advanced ---
// Websocket/polling for error logs, POST /api/admin/restore/upload (file upload), GET /api/admin/audit-logs/export
// ... implement logic for each ...

// 2FA Setup
app.post('/api/admin/2fa/setup', adminAuth, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ name: `FitArchitect Admin 2FA` });
    res.json({ otpauth_url: secret.otpauth_url, base32: secret.base32 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate 2FA secret' });
  }
});

// CRUD for workout plans
app.get('/api/workout-plans', userAuth, async (req: Request, res: Response) => {
  try {
    const plans = await prisma.workoutPlan.findMany({ where: { userId: req.user.id } });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workout plans' });
  }
});

app.get('/api/workout-plans/:id', userAuth, async (req: Request, res: Response) => {
  try {
    const plan = await prisma.workoutPlan.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workout plan' });
  }
});

app.post('/api/workout-plans', userAuth, async (req: Request, res: Response) => {
  try {
    const { name, description, duration, workouts, targetMuscleGroups, difficulty, isDefault, completed } = req.body;
    const plan = await prisma.workoutPlan.create({
      data: {
        userId: req.user.id,
        name,
        description,
        duration,
        workouts,
        targetMuscleGroups,
        difficulty,
        isDefault: !!isDefault,
        completed: !!completed,
      },
    });
    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create workout plan' });
  }
});

app.patch('/api/workout-plans/:id', userAuth, async (req: Request, res: Response) => {
  try {
    const plan = await prisma.workoutPlan.update({
      where: { id: req.params.id, userId: req.user.id },
      data: req.body,
    });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update workout plan' });
  }
});

app.delete('/api/workout-plans/:id', userAuth, async (req: Request, res: Response) => {
  try {
    await prisma.workoutPlan.delete({ where: { id: req.params.id, userId: req.user.id } });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete workout plan' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});