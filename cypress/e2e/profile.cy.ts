/// <reference types="cypress" />

describe('Profile Flow E2E', () => {
  const testUser = {
    name: 'Test User',
    email: `testuser_${Date.now()}@example.com`,
    password: 'TestPass123!'
  }

  it('Registers a new user and creates a profile', () => {
    cy.visit('/')
    // Wait for splash screen animations to complete (about 7 seconds total)
    cy.wait(8000)
    cy.get('[data-testid="splash-start-your-journey-button"]', { timeout: 10000 }).should('be.visible').click()
    cy.url().should('include', '/register')
    cy.get('[data-testid="register-name"]').type(testUser.name)
    cy.get('[data-testid="register-email"]').type(testUser.email)
    cy.get('[data-testid="register-password"]').type(testUser.password)
    cy.get('[data-testid="register-submit"]').click()
    // Should redirect to PAR-Q or profile setup
    cy.url().should('include', '/parq')
  })

  it('Logs in and updates profile', () => {
    cy.visit('/')
    cy.wait(8000)
    cy.get('[data-testid="splash-login-button"]', { timeout: 10000 }).should('be.visible').click()
    cy.url().should('include', '/login')
    cy.get('[data-testid="login-email"]').type(testUser.email)
    cy.get('[data-testid="login-password"]').type(testUser.password)
    cy.get('[data-testid="login-submit"]').click()
    cy.url().should('include', '/dashboard')
    cy.contains('Profile').click()
    cy.url().should('include', '/profile')
    cy.contains('Edit Profile').click()
    cy.get('input[type="text"]').first().clear().type('Updated Name')
    cy.contains('Save Changes').click()
    cy.contains('Your profile was updated successfully!')
  })

  it('Guest flow: continue as guest, create profile, upgrade', () => {
    const guestUpgrade = {
      name: 'Guest Upgraded',
      email: `guestup_${Date.now()}@example.com`,
      password: 'GuestPass123!'
    }
    cy.visit('/')
    cy.wait(8000)
    cy.get('[data-testid="splash-continue-as-guest-button"]', { timeout: 10000 }).should('be.visible').click()
    cy.url().should('include', '/dashboard')
    cy.contains('Profile').click()
    cy.url().should('include', '/profile')
    cy.contains('Upgrade Account').click()
    cy.get('input[type="text"]').type(guestUpgrade.name)
    cy.get('input[type="email"]').type(guestUpgrade.email)
    cy.get('input[type="password"]').type(guestUpgrade.password)
    cy.contains('Upgrade Account').click()
    cy.contains('Account upgraded!')
  })

  it('Shows validation errors for empty required fields', () => {
    cy.visit('/')
    cy.wait(8000)
    cy.get('[data-testid="splash-login-button"]', { timeout: 10000 }).should('be.visible').click()
    cy.url().should('include', '/login')
    cy.get('[data-testid="login-submit"]').click()
    cy.contains('Email is required')
    cy.contains('Password is required')
  })

  it('Persists profile data after refresh', () => {
    cy.visit('/')
    cy.wait(8000)
    cy.get('[data-testid="splash-login-button"]', { timeout: 10000 }).should('be.visible').click()
    cy.get('[data-testid="login-email"]').type(testUser.email)
    cy.get('[data-testid="login-password"]').type(testUser.password)
    cy.get('[data-testid="login-submit"]').click()
    cy.contains('Profile').click()
    cy.url().should('include', '/profile')
    cy.reload()
    cy.url().should('include', '/profile')
    cy.contains('Updated Name')
  })

  it('Handles backend errors gracefully', () => {
    // Simulate by trying to register with an existing email
    cy.visit('/')
    cy.wait(8000)
    cy.get('[data-testid="splash-start-your-journey-button"]', { timeout: 10000 }).should('be.visible').click()
    cy.get('[data-testid="register-name"]').type('Another User')
    cy.get('[data-testid="register-email"]').type(testUser.email)
    cy.get('[data-testid="register-password"]').type('AnotherPass123!')
    cy.get('[data-testid="register-submit"]').click()
    cy.contains('Email already registered')
  })
}) 