# FitArchitect PRD & Implementation Plan

## Overview
FitArchitect is a black and white themed AI-powered fitness assistant web application that helps users generate personalized workout plans, track calories, scan food products, plan meals, and receive daily motivational notifications via Telegram.

## Implementation Roadmap

### Iteration 1: Project Setup & Core Structure
1. Initialize a Vite React TypeScript project
2. Set up Tailwind CSS with black/white theme configuration
3. Configure React Router for navigation
4. Implement TanStack Query for data fetching
5. Create the basic layout (header, footer, navigation)
6. Import and integrate existing splash page and landing page from v0.dev
7. Set up authentication context

### Iteration 2: PAR-Q & Authentication Flow
1. Create PAR-Q intake form with comprehensive health screening questions
2. Implement form validation and submission logic
3. Build user registration and login pages
4. Set up JWT authentication system
5. Create user context to manage cleared/flagged status
6. Implement conditional feature routing based on isCleared status

### Iteration 3: Subscription Tiers & Payment
1. Create pricing page showcasing the three tiers
2. Set up Stripe integration for subscription handling
3. Implement subscription status checks for feature access
4. Build subscription management page

### Iteration 4: Workout Generation System
1. Create workout UI components (exercise cards, workout plans)
2. Implement WGER API integration to fetch exercise data
3. Set up OpenAI GPT integration for workout plan generation
4. Build workout display with 3-week progressive format
5. Implement user fitness profile form for customized workout plans

### Iteration 5: Nutrition Features
1. Implement calorie tracking UI and functionality
2. Create food database integration
3. Build meal planning interface with GPT recommendations
4. Develop camera-based barcode scanning for food products
5. Set up OpenFoodFacts API integration

### Iteration 6: Notifications & Final Features
1. Implement Telegram Bot API integration
2. Create notification preferences management
3. Add daily motivation message generation
4. Build profile management page
5. Add final polish and animations with GSAP

## Dashboard Setup
### Requirements
1. Implement analytics dashboard
2. Create a dashboard page component in src/pages/Dashboard.tsx that displays feature tiles based on user's subscription tier and PAR-Q status.
3. Create a feature configuration file in src/config/dashboardFeatures.ts that defines all features mentioned in the PRD with their access requirements:
    * Workout Generation (requires Basic tier and PAR-Q clearance)
    * Calorie Tracking (available for all tiers)
    * Meal Planning (available for all tiers)
    * Food Product Scanning (requires Premium tier)
    * Telegram Notifications (requires Basic tier)
    * Analytics Dashboard (requires Premium tier)
4. Create a FeatureCard component in src/components/dashboard/FeatureCard.tsx with the following properties:
    * Black and white theme as specified in the PRD
    * Shows locked/unlocked status
    * Displays reason for being locked if applicable
    * Acts as navigation to the feature when clicked
5. In the Dashboard component, implement logic to:
    * Check user's subscription tier (Free, Basic, or Premium)
    * Check user's PAR-Q clearance status
    * Show appropriate access messages for locked features
    * Use a responsive grid layout that works on all devices
6. Add visual indicators to clearly show:
    * Which features are available
    * Which features require upgrading to Basic tier
    * Which features require upgrading to Premium tier
    * Which features require PAR-Q clearance
7. Add a subscription upgrade prompt section for users on Free or Basic tiers
8. Add a PAR-Q assessment prompt for users who haven't completed it yet
9. Implement the black and white theme using Tailwind CSS as per the PRD requirements:
    * Background: Pure black (#000000)
    * Text & Primary UI: White (#FFFFFF)
    * Links & Secondary elements: Gray (#888888)
10. Create an empty state view for when users first sign up

## Admin Dashboard Setup
### Overview
Create an admin dashboard for FitArchitect that allows the app owner to manage users, monitor subscriptions, and oversee platform activity.

### Requirements
1. Create an admin authentication route and guard in the router configuration that only allows users with admin privileges to access the admin dashboard.
2. Create an admin dashboard layout with the following sections:
    * Admin sidebar navigation
    * Admin header with app metrics
    * Main content area for displaying admin panels
3. Create a user management panel that includes:
    * User search and filtering functionality
    * Table of all users showing:
        * User ID, name, and email
        * PAR-Q clearance status with ability to manually clear/flag users
        * Current subscription tier with ability to modify
        * Account creation date
        * Last login timestamp
    * Ability to view complete user profiles
    * Functions to suspend or delete user accounts when necessary
4. Create a subscription management panel that displays:
    * Overview of current subscribers by tier (Free, Basic, Premium)
    * Subscription revenue metrics and charts
    * Recent subscription changes (upgrades, downgrades, cancellations)
    * Ability to manually adjust user subscription tiers
5. Create a PAR-Q monitoring panel that shows:
    * Users awaiting manual review (those who answered "yes" to health questions)
    * Interface to review PAR-Q submissions and approve/reject users
    * Statistics on approval/rejection rates
6. Create a platform usage analytics panel showing:
    * Feature utilization metrics across subscription tiers
    * Most/least used features
    * Average session duration
    * User retention metrics
    * Charts showing daily/weekly/monthly active users
7. Create a notification management system to:
    * Send announcements to all users or specific tiers
    * Configure Telegram notification templates
    * Test notification delivery
8. Implement a system health monitor showing:
    * API integration status (OpenAI, WGER, OpenFoodFacts, Telegram, Stripe)
    * Error logs and rate limit warnings
    * Database and server performance metrics
9. Create a content management section for:
    * Uploading new exercise demonstrations
    * Managing motivational message templates
    * Editing workout templates
10. Implement an admin settings panel to:
    * Configure subscription tier pricing and features
    * Adjust PAR-Q flagging rules
    * Set default system parameters
11. Follow the black and white theme as specified in the PRD but add visual indicators using accent colors for important admin metrics and alerts.
12. Add export functionality for user data, subscription metrics, and usage statistics in CSV format for further analysis.

## Technical Specifications

### Frontend
* Framework: React.js with TypeScript
* Styling: Tailwind CSS with custom black and white theme
* Animations: GSAP for transitions
* Data Fetching: TanStack Query (React Query v5)
* Routing: React Router v6
* Component Library: ShadCN UI components

### Backend Integration
* Authentication: JWT-based auth
* APIs to integrate:
    * OpenAI GPT-4 API
    * WGER Exercise Database API
    * Open Food Facts API
    * Telegram Bot API
    * Stripe Payment API

### Theme & UI Guidelines
* Background: Pure black (#000000)
* Text & Primary UI: White (#FFFFFF)
* Links & Secondary elements: Gray (#888888)
* Mobile-first, responsive design

## Detailed Feature Specifications

### 1. PAR-Q Intake Form
* Purpose: Health risk assessment
* Questions to include:
    * Heart condition history
    * Chest pain during activity
    * Recent chest pain at rest
    * Balance/consciousness loss history
    * Bone/joint problems
    * Current prescription medications
    * Other health reasons limiting physical activity
    * Pregnancy status (if applicable)
* Outcome logic: Flag users with any "yes" answers as potentially requiring medical clearance
* Access control: Store isCleared flag in user profile

### 2. Workout Generation System
* Available only for PAR-Q cleared users
* Input parameters:
    * Fitness goals (dropdown: strength, endurance, weight loss, muscle gain)
    * Available equipment (multi-select)
    * Workout days per week (dropdown: 2-6)
    * Session duration (dropdown: 15-90 minutes)
    * Experience level (beginner, intermediate, advanced)
* Output: 3-week progressive workout plan including:
    * Day-by-day exercise breakdown
    * Sets, reps and rest periods
    * Visual demonstration of exercises (from WGER API)
    * Progressive overload schedule

### 3. Food Product Scanning (Premium Tier)
* Mobile camera integration
* Barcode scanning with GPT-4 Vision API
* Fetch nutritional data from Open Food Facts
* Save scanned items to food diary
* Display comprehensive nutritional breakdown

### 4. Calorie & Meal Tracking
* Daily calorie goal calculator based on:
    * Age, gender, weight, height
    * Activity level
    * Goals (weight loss, maintenance, gain)
* Food diary with search functionality
* Macro tracking (proteins, carbs, fats)
* Visual progress charts
* Weekly summary reports

### 5. Meal Planning
* AI-generated meal plans based on:
    * Calorie goals
    * Dietary preferences
    * Allergies/restrictions
* Customizable weekly planner
* Automatic shopping list generation
* Recipe suggestions

### 6. Telegram Notifications
* Account linking process
* Daily reminders for:
    * Upcoming workouts
    * Calorie tracking
    * Motivation messages
* Customizable notification preferences

## Subscription Tiers
1. Free Tier:
    * Meal planning and calorie tracking only
    * No workout generation
2. Basic Tier ($20/month):
    * Full workout generation
    * Complete meal planning
    * Telegram integration
    * Calorie tracking
3. Premium Tier ($40/month):
    * All Basic features
    * Food product scanning
    * Advanced analytics
    * Priority support

## Implementation Tasks
For Each Component, Build in This Order:
1. Create basic UI structure (HTML/JSX)
2. Apply Tailwind styling with black/white theme
3. Implement state management and form handling
4. Connect to relevant APIs
5. Add validation and error handling
6. Implement feature access based on subscription
7. Add animations and polish

## Testing Strategy
1. Component-level unit tests
2. Integration tests for API interactions
3. User flow testing for main features
4. Subscription tier access testing
5. Mobile responsiveness testing
