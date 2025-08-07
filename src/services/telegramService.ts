import { api } from './api'
// import { ErrorReportingService } from './errorReportingService'

interface TelegramConfig {
  chatId: string
}

interface TelegramError {
  code: number
  description: string
  message: string
}

/**
 * Secure Telegram Service
 * All Telegram operations are handled through backend API endpoints
 * Bot token is never exposed to the frontend
 */
class TelegramService {
  private static instance: TelegramService
  private config: TelegramConfig | null = null

  // Telegram API error codes and their user-friendly messages
  private static readonly ERROR_MESSAGES: Record<number, string> = {
    400: 'Bad Request: The request was malformed or contained invalid parameters',
    401: 'Unauthorized: The bot token is invalid or has been revoked',
    403: 'Forbidden: The bot is blocked by the user or doesn\'t have permission to send messages',
    404: 'Not Found: The chat ID is invalid or the user has not started a chat with the bot',
    429: 'Too Many Requests: Rate limit exceeded. Please try again in a few minutes',
    500: 'Internal Server Error: Telegram servers are experiencing issues',
    502: 'Bad Gateway: Telegram servers are temporarily unavailable',
    503: 'Service Unavailable: Telegram service is temporarily down',
    504: 'Gateway Timeout: Request timed out. Please try again'
  }

  private constructor() {
    // No direct API calls - everything goes through backend
  }

  public static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService()
    }
    return TelegramService.instance
  }

  public setConfig(config: TelegramConfig) {
    this.config = config
  }

  private handleTelegramError(error: unknown): TelegramError {
    // Default error message
    const defaultError: TelegramError = {
      code: 0,
      description: 'Unknown error occurred',
      message: 'An unexpected error occurred. Please try again later.'
    }

    if (error instanceof Error) {
      const axiosError = error as any
      if (axiosError.response?.data?.error) {
        const errorData = axiosError.response.data.error
        const code = errorData.code || axiosError.response.status || 0
        
        return {
          code,
          description: errorData.description || TelegramService.ERROR_MESSAGES[code] || 'Unknown error',
          message: TelegramService.ERROR_MESSAGES[code] || errorData.message || defaultError.message
        }
      }
    }

    return defaultError
  }

  /**
   * Send a notification to the user via Telegram
   */
  public async sendNotification(message: string): Promise<{ success: boolean; error?: TelegramError }> {
    try {
      const response = await api.post('/api/telegram/notify', { message })
      return { success: true }
    } catch (error) {
      const telegramError = this.handleTelegramError(error)
      
      // Log to error reporting service
      console.error('TelegramService error:', telegramError)

      return { success: false, error: telegramError }
    }
  }

  /**
   * Connect user's Telegram account
   */
  public async connectUserAccount(chatId: string): Promise<{ success: boolean; error?: TelegramError }> {
    try {
      const response = await api.post('/api/telegram/connect', { chatId })
      this.config = { chatId }
      return { success: true }
    } catch (error) {
      const telegramError = this.handleTelegramError(error)
      
      console.error('TelegramService connection error:', telegramError)

      return { success: false, error: telegramError }
    }
  }

  /**
   * Disconnect user's Telegram account
   */
  public async disconnectUserAccount(): Promise<{ success: boolean; error?: TelegramError }> {
    try {
      const response = await api.post('/api/telegram/disconnect')
      this.config = null
      return { success: true }
    } catch (error) {
      const telegramError = this.handleTelegramError(error)
      
      console.error('TelegramService disconnection error:', telegramError)

      return { success: false, error: telegramError }
    }
  }

  /**
   * Get connection status
   */
  public async getConnectionStatus(): Promise<{ connected: boolean; chatId?: string; error?: TelegramError }> {
    try {
      const response = await api.get('/api/telegram/status')
      const { connected, chatId } = response.data
      
      if (connected && chatId) {
        this.config = { chatId }
      }
      
      return { connected, chatId }
    } catch (error) {
      const telegramError = this.handleTelegramError(error)
      return { connected: false, error: telegramError }
    }
  }

  /**
   * Send a daily reminder
   */
  public async sendDailyReminder(type: 'workout' | 'meal' | 'water'): Promise<{ success: boolean; error?: TelegramError }> {
    try {
      const response = await api.post('/api/telegram/reminder', { type })
      return { success: true }
    } catch (error) {
      const telegramError = this.handleTelegramError(error)
      
      console.error('TelegramService reminder error:', telegramError)

      return { success: false, error: telegramError }
    }
  }

  /**
   * Test connection by sending a test message
   */
  public async testConnection(): Promise<{ success: boolean; error?: TelegramError }> {
    return this.sendNotification('🎉 Your Telegram is successfully connected to FitArchitect!')
  }

  /**
   * Report an error to the development channel
   */
  public async reportError(error: { type: string; message: string; metadata?: any }): Promise<void> {
    try {
      await api.post('/api/telegram/error', error)
    } catch (err) {
      // Silently fail error reporting to avoid infinite loops
      console.error('Failed to report error to Telegram:', err)
    }
  }

  async sendMessage(message: string): Promise<{ success: boolean; error?: any }> {
    return this.sendNotification(message)
  }

  async validateChatId(chatId: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Simple validation - just check if it's a valid format
      const isValid = /^-?\d+$/.test(chatId)
      if (!isValid) {
        return { valid: false, error: 'Invalid chat ID format' }
      }
      
      // Test send a message to validate the chat ID
      const testResult = await this.sendNotification('Test message for validation')
      return { valid: testResult.success, error: testResult.error?.description }
    } catch (error) {
      return { valid: false, error: 'Failed to validate chat ID' }
    }
  }
}

export default TelegramService