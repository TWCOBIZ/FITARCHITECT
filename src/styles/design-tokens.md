# FitArchitect Design Token System

This document outlines the comprehensive design token system implemented in FitArchitect for consistent UI/UX across the application.

## Color Tokens

### Brand Colors
- `brand-primary`: #2563eb (Blue-600) - Primary brand color
- `brand-secondary`: #7c3aed (Violet-600) - Secondary brand color  
- `brand-accent`: #06b6d4 (Cyan-500) - Accent color

### Surface Colors (Dark Theme Optimized)
- `surface-primary`: #000000 - Pure black background
- `surface-secondary`: #111827 - Elevated surfaces (cards, modals)
- `surface-tertiary`: #1f2937 - Interactive surfaces
- `surface-quaternary`: #374151 - Hover states
- `surface-border`: #4b5563 - Default borders
- `surface-border-light`: #6b7280 - Subtle borders

### Text Colors
- `text-primary`: #ffffff - Primary text on dark backgrounds
- `text-secondary`: #d1d5db - Secondary text
- `text-tertiary`: #9ca3af - Muted/disabled text
- `text-inverse`: #000000 - Text on light backgrounds

### Status Colors
- `status-success`: #10b981 - Success states
- `status-warning`: #f59e0b - Warning states
- `status-error`: #ef4444 - Error states
- `status-info`: #3b82f6 - Informational states

### Feature-Specific Colors
- `workout-primary`: #f97316 (Orange-500)
- `nutrition-primary`: #22c55e (Green-500)
- `profile-primary`: #8b5cf6 (Violet-500)

### Subscription Tiers
- `tier-free`: #6b7280 (Gray-500)
- `tier-basic`: #3b82f6 (Blue-500)
- `tier-premium`: #f59e0b (Amber-500)

## Component Classes

### Buttons
```css
.btn-primary     /* Primary action button */
.btn-secondary   /* Secondary action button */
.btn-ghost       /* Subtle/ghost button */
.btn-danger      /* Destructive action button */
.btn-success     /* Success action button */
```

### Cards
```css
.card           /* Basic card with border and shadow */
.card-hover     /* Card with hover effects */
.card-glow      /* Card with glow effect */
.workout-card   /* Workout-themed card */
.nutrition-card /* Nutrition-themed card */
.profile-card   /* Profile-themed card */
```

### Inputs
```css
.input-primary  /* Standard input field */
.input-error    /* Input field with error state */
```

### Layout
```css
.container-app  /* Main app container with responsive padding */
.page-header    /* Consistent page header styling */
.page-subtitle  /* Page subtitle styling */
```

### Navigation
```css
.nav-link       /* Navigation link styling */
.nav-link-active /* Active navigation link */
```

### Status Badges
```css
.badge-success  /* Success status badge */
.badge-warning  /* Warning status badge */
.badge-error    /* Error status badge */
.badge-info     /* Info status badge */
```

## Typography Scale

- `text-xs`: 0.75rem (12px)
- `text-sm`: 0.875rem (14px)
- `text-base`: 1rem (16px) - Default
- `text-lg`: 1.125rem (18px)
- `text-xl`: 1.25rem (20px)
- `text-2xl`: 1.5rem (24px)
- `text-3xl`: 1.875rem (30px)
- `text-4xl`: 2.25rem (36px)
- `text-5xl`: 3rem (48px)
- `text-6xl`: 3.75rem (60px)

## Spacing Scale

Standard Tailwind spacing plus custom values:
- `spacing-18`: 4.5rem (72px)
- `spacing-88`: 22rem (352px)
- `spacing-128`: 32rem (512px)

## Shadows

- `shadow-glow`: Blue glow effect
- `shadow-glow-lg`: Large blue glow effect
- `shadow-workout`: Orange glow for workout elements
- `shadow-nutrition`: Green glow for nutrition elements
- `shadow-profile`: Violet glow for profile elements

## Animations

- `animate-fade-in`: Fade in effect
- `animate-slide-up`: Slide up from bottom
- `animate-slide-down`: Slide down from top
- `animate-scale-in`: Scale in effect
- `animate-pulse-slow`: Slow pulse effect

## Usage Examples

### Creating a Feature Card
```jsx
<div className="workout-card">
  <h2 className="page-header">Workout Generator</h2>
  <p className="text-secondary mb-4">Create custom workouts</p>
  <button className="btn-primary">Generate Workout</button>
</div>
```

### Status Indicators
```jsx
<span className="badge-success">Active Trial</span>
<span className="badge-warning">Premium Required</span>
<span className="badge-error">Access Denied</span>
```

### Form Inputs
```jsx
<input 
  className="input-primary" 
  placeholder="Enter your email"
/>
<input 
  className="input-error" 
  placeholder="This field has an error"
/>
```

### Consistent Layout
```jsx
<div className="container-app">
  <h1 className="page-header">Dashboard</h1>
  <p className="page-subtitle">Welcome to your fitness journey</p>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div className="card">...</div>
    <div className="card">...</div>
    <div className="card">...</div>
  </div>
</div>
```

## Best Practices

1. **Consistency**: Always use design tokens instead of hardcoded values
2. **Feature Colors**: Use feature-specific colors for relevant sections
3. **Status Colors**: Use status colors consistently for feedback
4. **Mobile First**: All components are designed mobile-first
5. **Accessibility**: Focus states and contrast ratios are built-in
6. **Performance**: Utility classes are optimized for minimal bundle size

## Migration Guide

When updating existing components:

1. Replace hardcoded colors with design tokens
2. Use component classes instead of multiple utility classes
3. Ensure mobile responsiveness with the new breakpoint system
4. Add proper focus and hover states using the token system