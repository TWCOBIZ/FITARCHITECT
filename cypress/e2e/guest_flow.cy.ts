/// <reference types="cypress" />

describe('Guest User Flow', () => {
  it('Splash screen → Continue as Guest → routes to /nutrition', () => {
    cy.visit('/')
    cy.contains('CONTINUE AS GUEST').click()
    cy.url().should('include', '/nutrition')
    cy.contains('Nutrition Tracker').should('be.visible')
  })

  it('Guest tries to access /dashboard → should redirect to /landing (no loop)', () => {
    // Simulate guest session
    cy.visit('/')
    cy.contains('CONTINUE AS GUEST').click()
    cy.url().should('include', '/nutrition')
    // Now try to visit dashboard directly
    cy.visit('/dashboard')
    cy.url().should('include', '/landing')
    cy.contains('Personalized Workouts').should('be.visible') // Landing page content
  })

  it('Nutrition page loads for guests', () => {
    cy.visit('/')
    cy.contains('CONTINUE AS GUEST').click()
    cy.url().should('include', '/nutrition')
    cy.contains('Nutrition Tracker').should('be.visible')
    // Should not see access denied or login prompts
    cy.contains(/login|sign in|access denied/i).should('not.exist')
  })

  it('Dashboard for guests shows only nutrition/meal planning tiles', () => {
    cy.visit('/')
    cy.contains('CONTINUE AS GUEST').click()
    // Try to visit dashboard, should redirect to /landing, but let's check dashboard UI if accessible
    cy.visit('/dashboard', { failOnStatusCode: false })
    // Should redirect to /landing, but if dashboard is accessible, check guest UI
    cy.url().then(url => {
      if (url.includes('/dashboard')) {
        cy.contains('Welcome, Guest!').should('be.visible')
        cy.contains('Calorie Tracking').should('be.visible')
        cy.contains('Meal Planning').should('be.visible')
        cy.contains('Workout Generation').should('not.exist')
        cy.contains('Telegram Notifications').should('not.exist')
      } else {
        cy.url().should('include', '/landing')
      }
    })
  })

  it('No redirect loops or access errors in the browser console', () => {
    cy.visit('/')
    cy.contains('CONTINUE AS GUEST').click()
    cy.url().should('include', '/nutrition')
    // Listen for console errors
    let errorFound = false
    cy.on('window:before:load', win => {
      cy.stub(win.console, 'error').callsFake((msg) => {
        errorFound = true
      })
    })
    // Try to visit dashboard
    cy.visit('/dashboard')
    cy.url().should('satisfy', url => url.includes('/dashboard') || url.includes('/landing'))
    cy.then(() => {
      expect(errorFound).to.be.false
    })
  })
}) 