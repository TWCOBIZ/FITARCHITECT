/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Design Token System for FitArchitect
      colors: {
        // Brand Colors
        brand: {
          primary: '#2563eb', // Blue-600
          secondary: '#7c3aed', // Violet-600
          accent: '#06b6d4', // Cyan-500
        },
        
        // Surface Colors (Dark Theme Optimized)
        surface: {
          'primary': '#000000', // Pure black background
          'secondary': '#111827', // Gray-900 - elevated surfaces
          'tertiary': '#1f2937', // Gray-800 - cards, modals
          'quaternary': '#374151', // Gray-700 - interactive surfaces
          'border': '#4b5563', // Gray-600 - borders
          'border-light': '#6b7280', // Gray-500 - subtle borders
        },
        
        // Text Colors
        text: {
          'primary': '#ffffff', // White - primary text
          'secondary': '#d1d5db', // Gray-300 - secondary text
          'tertiary': '#9ca3af', // Gray-400 - muted text
          'inverse': '#000000', // Black - text on light backgrounds
        },
        
        // Status Colors
        status: {
          'success': '#10b981', // Emerald-500
          'warning': '#f59e0b', // Amber-500
          'error': '#ef4444', // Red-500
          'info': '#3b82f6', // Blue-500
        },
        
        // Feature-Specific Colors
        workout: {
          'primary': '#f97316', // Orange-500
          'secondary': '#fed7aa', // Orange-200
          'background': '#431407', // Orange-900/20
        },
        nutrition: {
          'primary': '#22c55e', // Green-500
          'secondary': '#bbf7d0', // Green-200
          'background': '#052e16', // Green-900/20
        },
        profile: {
          'primary': '#8b5cf6', // Violet-500
          'secondary': '#ddd6fe', // Violet-200
          'background': '#2e1065', // Violet-900/20
        },
        
        // Subscription Tiers
        tier: {
          'free': '#6b7280', // Gray-500
          'basic': '#3b82f6', // Blue-500
          'premium': '#f59e0b', // Amber-500
        },
      },
      
      // Typography Scale
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
      
      // Spacing Scale (consistent spacing)
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      // Border Radius
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',
        'DEFAULT': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'full': '9999px',
      },
      
      // Box Shadows
      boxShadow: {
        'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-lg': '0 0 40px rgba(59, 130, 246, 0.4)',
        'workout': '0 0 20px rgba(249, 115, 22, 0.3)',
        'nutrition': '0 0 20px rgba(34, 197, 94, 0.3)',
        'profile': '0 0 20px rgba(139, 92, 246, 0.3)',
      },
      
      // Animation & Transitions
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      
      // Backdrop Blur
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'DEFAULT': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
    },
  },
  plugins: [
    // Custom component styles
    function({ addComponents, theme }) {
      addComponents({
        // Button Components
        '.btn-primary': {
          '@apply bg-brand-primary hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-opacity-50': {},
        },
        '.btn-secondary': {
          '@apply bg-surface-tertiary hover:bg-surface-quaternary text-text-primary border border-surface-border font-semibold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-surface-border': {},
        },
        '.btn-ghost': {
          '@apply bg-transparent hover:bg-surface-tertiary text-text-primary font-semibold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-surface-border': {},
        },
        '.btn-danger': {
          '@apply bg-status-error hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-status-error focus:ring-opacity-50': {},
        },
        '.btn-success': {
          '@apply bg-status-success hover:bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-status-success focus:ring-opacity-50': {},
        },
        
        // Card Components
        '.card': {
          '@apply bg-surface-secondary border border-surface-border rounded-xl p-6 shadow-lg': {},
        },
        '.card-hover': {
          '@apply bg-surface-secondary border border-surface-border rounded-xl p-6 shadow-lg hover:shadow-xl hover:border-surface-border-light transition-all duration-200': {},
        },
        '.card-glow': {
          '@apply bg-surface-secondary border border-surface-border rounded-xl p-6 shadow-glow': {},
        },
        
        // Input Components
        '.input-primary': {
          '@apply w-full px-3 py-2 bg-surface-tertiary border border-surface-border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-colors duration-200': {},
        },
        '.input-error': {
          '@apply w-full px-3 py-2 bg-surface-tertiary border border-status-error rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-status-error focus:border-transparent': {},
        },
        
        // Layout Components
        '.container-app': {
          '@apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8': {},
        },
        '.page-header': {
          '@apply text-3xl md:text-4xl font-bold text-text-primary mb-6': {},
        },
        '.page-subtitle': {
          '@apply text-lg text-text-secondary mb-8': {},
        },
        
        // Navigation Components
        '.nav-link': {
          '@apply text-text-secondary hover:text-brand-primary transition-colors duration-200 font-medium': {},
        },
        '.nav-link-active': {
          '@apply text-brand-primary font-semibold': {},
        },
        
        // Status Components
        '.badge-success': {
          '@apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-success/20 text-status-success border border-status-success/30': {},
        },
        '.badge-warning': {
          '@apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-warning/20 text-status-warning border border-status-warning/30': {},
        },
        '.badge-error': {
          '@apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-error/20 text-status-error border border-status-error/30': {},
        },
        '.badge-info': {
          '@apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-info/20 text-status-info border border-status-info/30': {},
        },
        
        // Feature Specific Components
        '.workout-card': {
          '@apply card hover:shadow-workout hover:border-workout-primary/30 transition-all duration-200': {},
        },
        '.nutrition-card': {
          '@apply card hover:shadow-nutrition hover:border-nutrition-primary/30 transition-all duration-200': {},
        },
        '.profile-card': {
          '@apply card hover:shadow-profile hover:border-profile-primary/30 transition-all duration-200': {},
        },
      })
    }
  ],
}; 