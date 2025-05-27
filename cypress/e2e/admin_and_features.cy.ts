/// <reference types="cypress" />

describe('Admin & Feature Access E2E', () => {
  const adminUser = {
    email: 'ken@nepacreativeagency.com',
    password: 'adminlog',
  }
  const premiumUser = {
    email: `premium_${Date.now()}@example.com`,
    password: 'PremiumPass123!'
  }

  it('Logs in as admin and accesses admin dashboard', () => {
    cy.visit('/')
    cy.contains('LOGIN').click()
    cy.get('input[type="email"]').type(adminUser.email)
    cy.get('input[type="password"]').type(adminUser.password)
    cy.contains('Sign in').click()
    cy.url().should('include', '/dashboard')
    cy.contains('Admin Dashboard').click()
    cy.url().should('include', '/admin')
    cy.contains('User Management')
  })

  it('Feature gating: free user cannot access premium features', () => {
    cy.visit('/')
    cy.contains('START YOUR JOURNEY').click()
    const email = `free_${Date.now()}@example.com`
    cy.get('input[type="text"]').type('Free User')
    cy.get('input[type="email"]').type(email)
    cy.get('input[type="password"]').type('FreePass123!')
    cy.contains('Create Account').click()
    cy.url().should('include', '/parq')
    cy.visit('/premium-feature')
    cy.contains('Upgrade to unlock this feature')
  })

  it('Premium user can access all features after upgrade', () => {
    cy.visit('/')
    cy.contains('START YOUR JOURNEY').click()
    cy.get('input[type="text"]').type('Premium User')
    cy.get('input[type="email"]').type(premiumUser.email)
    cy.get('input[type="password"]').type(premiumUser.password)
    cy.contains('Create Account').click()
    cy.url().should('include', '/parq')
    // Simulate upgrade (this step may need to be replaced with Stripe test mode or backend call)
    cy.request('POST', '/api/upgrade', { email: premiumUser.email, plan: 'premium' })
    cy.visit('/premium-feature')
    cy.contains('Premium Feature Content')
  })

  it('Core features: workout logging, meal planning, analytics, calorie tracking', () => {
    cy.visit('/')
    cy.contains('LOGIN').click()
    cy.get('input[type="email"]').type(adminUser.email)
    cy.get('input[type="password"]').type(adminUser.password)
    cy.contains('Sign in').click()
    cy.url().should('include', '/dashboard')
    cy.contains('Log Workout').click()
    cy.get('input[name="exercise"]').type('Bench Press')
    cy.get('input[name="sets"]').type('3')
    cy.get('input[name="reps"]').type('10')
    cy.get('input[name="weight"]').type('135')
    cy.contains('Save Workout').click()
    cy.contains('Workout saved')
    cy.contains('Meal Planning').click()
    cy.contains('Add Meal').click()
    cy.get('input[name="mealName"]').type('Chicken Salad')
    cy.get('input[name="calories"]').type('400')
    cy.contains('Save Meal').click()
    cy.contains('Meal saved')
    cy.contains('Analytics').click()
    cy.contains('Total Workouts')
    cy.contains('Calorie Tracking').click()
    cy.contains('Add Food').click()
    cy.get('input[name="foodName"]').type('Apple')
    cy.get('input[name="calories"]').type('95')
    cy.contains('Save Food').click()
    cy.contains('Food added')
  })
}) 