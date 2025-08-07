// Retry utility with exponential backoff
export interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryableErrors?: (error: any) => boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: (error) => {
    // Retry on rate limits, timeouts, and server errors
    if (error.response) {
      const status = error.response.status
      return status === 429 || status >= 500
    }
    // Retry on network errors
    return error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' ||
           error.code === 'ECONNREFUSED'
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: any
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Check if error is retryable
      if (!opts.retryableErrors(error)) {
        throw error
      }
      
      // Don't retry after the last attempt
      if (attempt === opts.maxRetries) {
        break
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelay
      )
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.3 * delay
      const totalDelay = delay + jitter
      
      console.log(`Retry attempt ${attempt + 1}/${opts.maxRetries} after ${Math.round(totalDelay)}ms`)
      
      // Handle rate limit headers if present
      if ((error as any).response?.headers?.['retry-after']) {
        const retryAfter = parseInt((error as any).response.headers['retry-after']) * 1000
        await sleep(Math.max(retryAfter, totalDelay))
      } else {
        await sleep(totalDelay)
      }
    }
  }
  
  throw lastError
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Rate limiter implementation
export class RateLimiter {
  private tokens: number
  private lastRefill: number
  private readonly maxTokens: number
  private readonly refillRate: number
  
  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens
    this.refillRate = refillRate
    this.tokens = maxTokens
    this.lastRefill = Date.now()
  }
  
  async acquire(): Promise<void> {
    await this.refill()
    
    if (this.tokens < 1) {
      const waitTime = (1 - this.tokens) * (1000 / this.refillRate)
      await sleep(waitTime)
      await this.refill()
    }
    
    this.tokens -= 1
  }
  
  private async refill(): Promise<void> {
    const now = Date.now()
    const timePassed = (now - this.lastRefill) / 1000
    const tokensToAdd = timePassed * this.refillRate
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd)
    this.lastRefill = now
  }
}