# FitArchitect - Deployment PRD

## Overview
FitArchitect is a black and white themed AI-powered fitness assistant web application that helps users generate personalized workout plans, track calories, scan food products, plan meals, and receive daily motivational notifications via Telegram.

## Technical Stack
- **Frontend**: React.js with TypeScript
- **Styling**: Tailwind CSS with custom black and white theme
- **Data Fetching**: TanStack Query (React Query v5)
- **Routing**: React Router v6
- **Component Library**: ShadCN UI components
- **Authentication**: JWT-based auth
- **APIs**: OpenAI GPT-4, WGER Exercise Database, Open Food Facts, Telegram Bot, Stripe Payment

## Theme Guidelines
- **Background**: Pure black (#000000)
- **Text & Primary UI**: White (#FFFFFF)
- **Links & Secondary elements**: Gray (#888888)
- **Mobile-first, responsive design**

## Implementation Priority

### Phase 1: Ensure Core Functionality
Before building new features, ensure all existing implementations work end-to-end:
- Verify user authentication flow (register → login → session management)
- Test user profile system (create → edit → persist → access across app)
- Validate subscription tier checking and feature access control
- Confirm PAR-Q assessment workflow and status persistence
- Test existing API integrations and error handling

### Phase 2: Complete Missing Features
Build out any missing functionality according to specifications below.

### Phase 3: Polish & Enhancement
Add GSAP animations and final polish after core functionality is solid.

## Core Features

### Authentication System
- User registration and login pages
- JWT authentication with user context
- Password reset functionality
- Protected route guards
- User session management

### User Profile System
- Basic profile form (name, email, age, gender, height, weight)
- Fitness profile (goals, equipment, workout frequency, session duration, experience level)
- Nutrition profile (calorie goals, activity level, dietary preferences, allergies)
- Profile persistence and editing capability
- User context accessible throughout entire app

### PAR-Q Health Assessment
- Health screening form with 8 standard questions:
  - Heart condition history
  - Chest pain during activity
  - Recent chest pain at rest
  - Balance/consciousness loss history
  - Bone/joint problems
  - Current prescription medications
  - Other health reasons limiting physical activity
  - Pregnancy status (if applicable)
- Flag users with any "yes" answers for manual review
- Store `isCleared` boolean in user profile
- PAR-Q completion required for workout generation access

### Subscription Tiers & Payment
- **Free Tier**: Meal planning, calorie tracking, and 7-day free trial of AI workout generation (after PAR-Q completion)
- **Basic Tier ($20/month)**: Unlimited workout generation, complete meal planning, calorie tracking
- **Premium Tier ($40/month)**: All Basic features + food product scanning + Telegram integration
- Stripe integration for subscription handling
- Subscription status checks for feature access
- Upgrade/downgrade subscription management
- Pricing page showcasing all three tiers

### Dashboard
- Feature tiles based on user's subscription tier and PAR-Q status
- Feature configuration file defining access requirements:
  - Workout Generation (requires Basic tier and PAR-Q clearance)
  - Calorie Tracking (available for all tiers)
  - Meal Planning (available for all tiers)
  - Food Product Scanning (requires Premium tier)
  - Telegram Notifications (requires Premium tier)
  - Advanced Analytics (available for all tiers)
- Visual indicators for locked/unlocked features
- Subscription upgrade prompts for Free/Basic users
- PAR-Q assessment prompt for uncleared users
- Responsive grid layout

### Workout Generation System (Free: 7-day trial, Basic+ Unlimited + PAR-Q Cleared)
- Fitness profile input form
- WGER API integration for exercise data
- OpenAI GPT integration for personalized workout plans
- 3-week progressive workout format
- Exercise demonstrations and instructions
- Sets, reps, and rest period specifications
- Progressive overload scheduling
- Free tier users: 7-day trial period (unlimited during trial, then requires Basic+ subscription)
- Paid tier users: Unlimited generations

### Calorie & Meal Tracking (All Tiers)
- Daily calorie goal calculator based on user metrics
- Food diary with search functionality
- Macro tracking (proteins, carbs, fats)
- Manual food entry system
- Daily intake progress display
- Weekly summary reports

### Meal Planning (All Tiers)
- AI-generated meal plans using OpenAI
- Calorie goal integration
- Dietary preferences and allergies consideration
- Weekly meal planner interface
- Recipe suggestions
- Shopping list generation

### Food Product Scanning (Premium Tier)
- Mobile camera integration for barcode scanning
- OpenFoodFacts API integration
- Comprehensive nutritional data display
- Save scanned items to food diary
- Nutritional breakdown visualization

### Telegram Integration (Premium Tier)
- Telegram Bot API setup and configuration
- User account linking process
- Daily workout reminders
- Calorie tracking reminders
- Motivational message delivery
- Notification preferences management
- Custom notification scheduling

### Advanced Analytics (All Tiers)
- Progress tracking dashboard
- Weekly and monthly progress reports
- Goal achievement metrics
- Feature utilization statistics
- Visual charts and progress graphs
- Trend analysis and insights

### Guest User Experience
- "Continue as Guest" option on splash/login screen
- Guest user state in authentication context
- Limited feature access (Meal Planning and Calorie Tracking only)
- localStorage for temporary data persistence
- Clear UI indicators for locked features
- Seamless conversion path to registered account
- Guest data migration upon account creation

## Feature Access Control Matrix

| Feature | Free | Basic | Premium | PAR-Q Required |
|---------|------|-------|---------|----------------|
| Calorie Tracking | ✅ | ✅ | ✅ | ❌ |
| Meal Planning | ✅ | ✅ | ✅ | ❌ |
| Workout Generation | 7-day trial | Unlimited | Unlimited | ✅ |
| Telegram Notifications | ❌ | ❌ | ✅ | ❌ |
| Food Product Scanning | ❌ | ❌ | ✅ | ❌ |
| Advanced Analytics | ✅ | ✅ | ✅ | ❌ |

## Component Structure Requirements

### Authentication Components
- User registration/login forms
- Password reset flow
- Protected route components
- Session management

### Profile Components
- Basic profile form
- Fitness profile form
- Nutrition profile form
- Profile editing interface

### Feature Components
- PAR-Q assessment form
- Workout generation interface
- Calorie tracking dashboard
- Meal planning interface
- Food scanning component
- Analytics dashboard
- Telegram integration setup

## UI/UX Requirements
- Consistent black and white theme throughout
- Mobile-first responsive design
- Clear visual hierarchy
- Intuitive navigation
- Loading states for all async operations
- Error handling and user feedback
- Accessibility compliance
- Progressive enhancement

## Data Persistence
- User profiles and preferences
- PAR-Q assessment results
- Subscription status and history
- Workout plans and progress
- Food diary entries
- Meal plans and recipes
- Telegram integration settings
- Analytics data and metrics

## API Integration Requirements
- Secure API key management
- Error handling and retry logic
- Rate limiting compliance
- Data validation and sanitization
- Response caching where appropriate
- Fallback handling for API failures

## Polish & Final Features
- GSAP animations for smooth transitions
- Micro-interactions for better UX
- Loading animations and states
- Success/error message animations
- Page transitions
- Component enter/exit animations
