# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Full Development Environment
```bash
npm run dev:all          # Start frontend (Vite) + backend (ts-node) concurrently
npm run dev              # Frontend only (Vite dev server on port 5173)
npx ts-node backend/src/server.ts  # Backend only (Express server on port 3001)
```

### Build and Quality
```bash
npm run build           # TypeScript compilation + Vite build
npm run lint            # ESLint with TypeScript rules
```

### Testing
```bash
npm run test:backend    # Jest unit tests for backend
npm run test:e2e        # Cypress E2E tests  
npm run test:playwright # Playwright tests
```

### Database Operations
```bash
npx prisma generate     # Generate Prisma client after schema changes
npx prisma db push      # Push schema changes to database
npx prisma migrate dev  # Create and apply new migration
npx prisma studio       # Open Prisma Studio database browser
./scripts/setup-db.sh   # Initial database setup script
```

### Backend Only Commands
```bash
cd backend
npm run dev            # ts-node-dev with auto-restart
npm run build          # TypeScript compilation to dist/
npm run start          # Run compiled JavaScript from dist/
```

## Architecture Overview

### Project Structure
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + React Router
- **Backend**: Express.js + TypeScript + Prisma + PostgreSQL
- **Authentication**: JWT-based with unified middleware supporting users, admins, and guests
- **Deployment**: Separate frontend/backend services with API proxy in development

### Frontend-Backend Communication
- Development: Frontend (port 5173) proxies `/api/*` requests to backend (port 3001)
- Frontend API pages in `/src/pages/api/` handle some logic
- Backend API in `/backend/src/server.ts` handles core business logic
- Centralized Axios instance with interceptors in `/src/services/api.ts`

### State Management Architecture
Context providers are nested in this order in App.tsx:
1. **AppProvider** - Global app state
2. **AuthProvider** - User authentication and authorization  
3. **StripeProvider** - Payment processing
4. **WorkoutProvider** - Workout-related state
5. **OpenAIProvider** - AI integration
6. **NutritionProvider** - Food tracking state
7. **WgerProvider** - Exercise database integration

### Database Schema (Prisma)
Key models:
- **UserProfile**: Main user entity with auth, profile data, subscription info
- **ParqResponse**: Health assessment responses
- **Subscription/Plan/Payment**: Complete subscription management
- **WorkoutLog/WorkoutPlan**: Exercise tracking and custom plans
- **NutritionLog/MealPlan**: Food tracking and AI meal planning

### Authentication System
The unified auth middleware (`/backend/src/auth.ts`) supports:
- **Regular users**: JWT authentication with subscription tier checking
- **Admin users**: Elevated privileges with 2FA support
- **Guest users**: 7-day sessions with limited feature access
- **Feature access control**: Based on subscription tier and PAR-Q completion

### Subscription Tiers and Feature Access
```typescript
// Feature access matrix enforced throughout the app
const featureRules = {
  'workout-generation': { tier: 'basic', parq: true },
  'nutrition-tracking': { tier: 'free', parq: false },
  'meal-planning': { tier: 'free', parq: false },
  'barcode-scanning': { tier: 'premium', parq: false },
  'telegram-notifications': { tier: 'premium', parq: false },
  'analytics': { tier: 'free', parq: false }
}
```

## Key Development Patterns

### API Endpoint Organization
Backend routes in `/backend/src/server.ts`:
- Authentication: `/api/login`, `/api/register`, `/api/guest-register`
- User management: `/api/profile`, `/api/dashboard`, `/api/upgrade-guest`
- Features: `/api/workout-plans`, `/api/nutrition-log`, `/api/parq-response`
- Admin: `/api/admin/*` (users, analytics, subscriptions)
- Integrations: `/api/telegram/*`

### Component Organization
- `/src/components/auth/` - Authentication and registration forms
- `/src/components/admin/` - Admin panel components
- `/src/components/workout/` - Workout tracking and planning
- `/src/components/nutrition/` - Food tracking and meal planning
- `/src/contexts/` - React context providers for global state

### Environment Setup
Copy `.env.example` to `.env` and configure these required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Token signing key
- `STRIPE_SECRET_KEY` / `VITE_STRIPE_PUBLISHABLE_KEY` - Payment processing
- `OPENAI_API_KEY` - AI features (server-side only)
- `TELEGRAM_BOT_TOKEN` - Notifications
- `VITE_WGER_API_KEY` - Exercise database access
- `VITE_API_URL` - Backend API URL (http://localhost:3001 for development)

### Security Patterns
- Use the unified auth middleware for all protected routes
- Follow the feature access pattern for subscription-gated features  
- All passwords hashed with bcryptjs
- JWT tokens with 7-day expiration
- Admin routes require privilege checking
- CORS configured for cross-origin requests

## Common Development Tasks

### Adding New Protected API Endpoints
1. Add route in `/backend/src/server.ts`
2. Apply auth middleware: `app.get('/api/endpoint', authenticateToken, handler)`
3. Check user permissions in handler if needed
4. Update frontend API service in `/src/services/api.ts`

### Adding New Subscription-Gated Features
1. Update feature rules in dashboard configuration
2. Add tier checking in backend endpoint
3. Update AuthContext for frontend access control
4. Add UI indicators for locked features

### Database Schema Changes
1. Modify `/prisma/schema.prisma`
2. Run `npx prisma generate` to update client
3. Run `npx prisma migrate dev` to create migration
4. Update TypeScript types if needed

### Adding New React Components
1. Follow existing patterns in component organization
2. Use TypeScript interfaces from `/src/types/`
3. Leverage existing context providers for state
4. Follow Tailwind CSS black/white theme guidelines

## External Integrations

### APIs Used
- **OpenAI GPT-4**: Workout and meal plan generation
- **WGER Exercise Database**: Exercise data and instructions  
- **Open Food Facts**: Barcode scanning and nutrition data
- **Stripe**: Subscription payment processing
- **Telegram Bot API**: Daily notifications and reminders

### Testing Strategy  
- **Backend**: Jest unit tests in `/backend/src/__tests__/` (configured in `jest.config.cjs`)
- **E2E**: Cypress tests in `/cypress/e2e/` - includes profile flow and admin feature tests
- **Playwright**: Additional E2E tests in `/tests/` for landing and feature validation
- **Configuration**: Jest preset 'ts-jest' with Node.js test environment
- Run linting before commits to maintain code quality

## Troubleshooting

### Common Setup Issues
1. **Database connection**: Ensure PostgreSQL is running and DATABASE_URL is correct
2. **API proxy errors**: Check that backend server is running on port 3001
3. **Prisma client errors**: Run `npx prisma generate` after schema changes
4. **Authentication issues**: Verify JWT_SECRET is set and tokens haven't expired
5. **Subscription access**: Check user tier and PAR-Q completion status
6. **Environment variables**: Ensure all required vars from `.env.example` are set in `.env`

### Development Workflow
1. Start development with `npm run dev:all`
2. Make database changes via Prisma migrations
3. Test changes with appropriate test suite
4. Run `npm run lint` before committing
5. Use Prisma Studio to inspect database state when debugging

### Task Management Integration
This codebase includes Task Master AI integration via MCP server in `.cursor/mcp.json`. See `.cursor/rules/` for detailed development workflow guidelines including task breakdown, dependency management, and iterative implementation patterns.