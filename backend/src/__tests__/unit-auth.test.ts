// Set environment before importing anything
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-characters-long'
process.env.DATABASE_URL = 'test://localhost'
process.env.OPENAI_API_KEY = 'test-key'

// Mock external dependencies before any imports
const mockJWT = {
  sign: jest.fn().mockReturnValue('test_jwt_token'),
  verify: jest.fn().mockReturnValue({ userId: 'test_user_id', email: 'test@example.com' })
}

jest.doMock('jsonwebtoken', () => mockJWT)

describe('Auth Utils Unit Tests', () => {
  // Import inside describe so mocks are set up
  let generateToken: any
  let hasValidSubscription: any

  beforeAll(async () => {
    const authModule = await import('../auth')
    generateToken = authModule.generateToken
    hasValidSubscription = authModule.hasValidSubscription
  })

  describe('generateToken', () => {
    it('should generate a token for valid user data', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com'
      }
      
      const token = generateToken(userData)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token).toBe('test_jwt_token')
      expect(mockJWT.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          email: 'test@example.com'
        }),
        expect.any(String),
        expect.any(Object)
      )
    })
  })

  describe('hasValidSubscription', () => {
    it('should return true for premium tier with active subscription', () => {
      const userProfile = {
        tier: 'premium',
        subscriptionStatus: 'active'
      } as any
      
      const result = hasValidSubscription(userProfile, 'premium')
      expect(result).toBe(true)
    })

    it('should return false for inactive subscription', () => {
      const userProfile = {
        tier: 'premium',
        subscriptionStatus: 'inactive'
      } as any
      
      const result = hasValidSubscription(userProfile, 'premium')
      expect(result).toBe(false)
    })

    it('should return true for basic tier accessing basic features', () => {
      const userProfile = {
        tier: 'basic',
        subscriptionStatus: 'active'
      } as any
      
      const result = hasValidSubscription(userProfile, 'basic')
      expect(result).toBe(true)
    })

    it('should return false for basic tier accessing premium features', () => {
      const userProfile = {
        tier: 'basic',
        subscriptionStatus: 'active'
      } as any
      
      const result = hasValidSubscription(userProfile, 'premium')
      expect(result).toBe(false)
    })

    it('should return false for null user', () => {
      const result = hasValidSubscription(null, 'basic')
      expect(result).toBe(false)
    })
  })
})