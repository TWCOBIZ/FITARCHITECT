/// <reference types="cypress" />

describe('Profile Flow E2E', () => {
  const testUser = {
    name: 'Test User',
    email: `testuser_${Date.now()}@example.com`,
    password: 'TestPass123!'
  }

  it('Registers a new user and creates a profile', () => {
    cy.visit('/')
    cy.contains('START YOUR JOURNEY').click()
    cy.url().should('include', '/register')
    cy.get('input[type="text"]').type(testUser.name)
    cy.get('input[type="email"]').type(testUser.email)
    cy.get('input[type="password"]').type(testUser.password)
    cy.contains('Create Account').click()
    // Should redirect to PAR-Q or profile setup
    cy.url().should('include', '/parq')
  })

  it('Logs in and updates profile', () => {
    cy.visit('/')
    cy.contains('LOGIN').click()
    cy.url().should('include', '/login')
    cy.get('input[type="email"]').type(testUser.email)
    cy.get('input[type="password"]').type(testUser.password)
    cy.contains('Sign in').click()
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
    cy.contains('CONTINUE AS GUEST').click()
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
    cy.contains('LOGIN').click()
    cy.url().should('include', '/login')
    cy.contains('Sign in').click()
    cy.contains('Email is required')
    cy.contains('Password is required')
  })

  it('Persists profile data after refresh', () => {
    cy.visit('/')
    cy.contains('LOGIN').click()
    cy.get('input[type="email"]').type(testUser.email)
    cy.get('input[type="password"]').type(testUser.password)
    cy.contains('Sign in').click()
    cy.contains('Profile').click()
    cy.url().should('include', '/profile')
    cy.reload()
    cy.url().should('include', '/profile')
    cy.contains('Updated Name')
  })

  it('Handles backend errors gracefully', () => {
    // Simulate by trying to register with an existing email
    cy.visit('/')
    cy.contains('START YOUR JOURNEY').click()
    cy.get('input[type="text"]').type('Another User')
    cy.get('input[type="email"]').type(testUser.email)
    cy.get('input[type="password"]').type('AnotherPass123!')
    cy.contains('Create Account').click()
    cy.contains('Email already registered')
  })
}) 