// Dashboard feature configuration for FitArchitect
// Each feature includes access requirements for subscription tier and PAR-Q status

export type DashboardFeature = {
  key: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  requiresSubscription?: 'basic' | 'premium';
  requiresParq?: boolean;
  allowGuest?: boolean;
};

export const dashboardFeatures: DashboardFeature[] = [
  {
    key: 'workout',
    title: 'Workout Generation',
    description: 'AI-powered personalized workout plans',
    icon: '💪',
    path: '/workouts',
    requiresSubscription: 'basic',
    requiresParq: true,
    allowGuest: false,
  },
  {
    key: 'nutrition',
    title: 'Calorie Tracking',
    description: 'Track your meals and nutrition goals',
    icon: '🥗',
    path: '/nutrition',
    allowGuest: true,
  },
  {
    key: 'meal',
    title: 'Meal Planning',
    description: 'Plan your meals for the week',
    icon: '🍽️',
    path: '/meal-planning',
    allowGuest: false,
  },
  {
    key: 'recipes',
    title: 'Recipe Collection',
    description: 'Create and manage your personal recipes',
    icon: '👨‍🍳',
    path: '/recipes',
    allowGuest: false,
  },
  {
    key: 'foodscan',
    title: 'Food Product Scanning',
    description: 'Scan barcodes for instant nutrition info',
    icon: '📷',
    path: '/food-scan',
    requiresSubscription: 'premium',
    allowGuest: false,
  },
  {
    key: 'telegram',
    title: 'Telegram Notifications',
    description: 'Get reminders and updates via Telegram',
    icon: '📲',
    path: '/settings/notifications',
    requiresSubscription: 'premium',
    allowGuest: false,
  },
  {
    key: 'analytics',
    title: 'Analytics Dashboard',
    description: 'Track your fitness and nutrition progress',
    icon: '📊',
    path: '/analytics',
    allowGuest: true,
  },
  {
    key: 'profile',
    title: 'Profile',
    description: 'Manage your account and preferences',
    icon: '👤',
    path: '/profile',
    allowGuest: false,
  },
]; 