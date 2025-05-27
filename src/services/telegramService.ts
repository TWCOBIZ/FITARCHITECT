import { API_CONFIG } from '../config/api'
import ErrorReportingService from './errorReportingService'

interface TelegramConfig {
  chatId: string
}

interface TelegramError {
  code: number
  description: string
  message: string
}

class TelegramService {
  private static instance: TelegramService
  private config: TelegramConfig | null = null
  private baseUrl: string

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
    this.baseUrl = `https://api.telegram.org/bot${API_CONFIG.TELEGRAM_BOT_TOKEN}`
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

    try {
      // Check if it's a Telegram API error response
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        (error as any).response?.data?.description
      ) {
        const code = (error as any).response.status
        const description = (error as any).response.data.description
        const message = TelegramService.ERROR_MESSAGES[code] || description

        return {
          code,
          description,
          message
        }
      }

      // Check if it's a network error
      if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as any).message === 'string' &&
        (error as any).message.includes('Failed to fetch')
      ) {
        return {
          code: 0,
          description: 'Network error',
          message: 'Unable to connect to Telegram. Please check your internet connection.'
        }
      }

      return defaultError
    } catch {
      return defaultError
    }
  }

  private async handleError(error: unknown, action: string): Promise<TelegramError> {
    const telegramError = this.handleTelegramError(error)
    
    // Report error to development team
    await ErrorReportingService.getInstance().reportError(
      telegramError,
      'TelegramService',
      action,
      {
        chatId: this.config?.chatId,
        baseUrl: this.baseUrl
      }
    )

    return telegramError
  }

  public async sendMessage(message: string): Promise<{ success: boolean; error?: TelegramError }> {
    if (!this.config?.chatId) {
      const error = {
        code: 0,
        description: 'Chat ID not configured',
        message: 'Please configure your Telegram Chat ID in the settings.'
      }
      await ErrorReportingService.getInstance().reportError(
        error,
        'TelegramService',
        'sendMessage',
        { message }
      )
      return { success: false, error }
    }

    if (!API_CONFIG.TELEGRAM_BOT_TOKEN) {
      const error = {
        code: 0,
        description: 'Bot token not configured',
        message: 'Telegram bot token is not configured. Please contact support.'
      }
      await ErrorReportingService.getInstance().reportError(
        error,
        'TelegramService',
        'sendMessage',
        { message }
      )
      return { success: false, error }
    }

    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.config.chatId,
          text: message,
          parse_mode: 'HTML'
        })
      })

      if (!response.ok) {
        type TelegramApiError = { description: string }
        const errorData: TelegramApiError = await response.json()
        throw {
          response: {
            status: response.status,
            data: errorData
          }
        }
      }

      return { success: true }
    } catch (error) {
      const telegramError = await this.handleError(error, 'sendMessage')
      return {
        success: false,
        error: telegramError
      }
    }
  }

  public async validateChatId(chatId: string): Promise<{ success: boolean; error?: TelegramError }> {
    if (!API_CONFIG.TELEGRAM_BOT_TOKEN) {
      const error = {
        code: 0,
        description: 'Bot token not configured',
        message: 'Telegram bot token is not configured. Please contact support.'
      }
      await ErrorReportingService.getInstance().reportError(
        error,
        'TelegramService',
        'validateChatId',
        { chatId }
      )
      return { success: false, error }
    }

    try {
      const response = await fetch(`${this.baseUrl}/getChat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw {
          response: {
            status: response.status,
            data: errorData
          }
        }
      }

      return { success: true }
    } catch (error) {
      const telegramError = await this.handleError(error, 'validateChatId')
      return {
        success: false,
        error: telegramError
      }
    }
  }

  async sendWorkoutReminder(workout: string, time: string): Promise<boolean> {
    const message = `
🏋️‍♂️ <b>Workout Reminder</b>
Time: ${time}
Workout: ${workout}

Don't forget to stay hydrated and warm up properly! 💪
    `
    return this.sendMessage(message)
  }

  async sendNutritionTip(tip: string): Promise<boolean> {
    const message = `
🥗 <b>Nutrition Tip</b>
${tip}

Stay on track with your fitness goals! 🌟
    `
    return this.sendMessage(message)
  }

  async sendMotivationMessage(message: string): Promise<boolean> {
    const formattedMessage = `
✨ <b>Daily Motivation</b>
${message}

Keep pushing forward! 💫
    `
    return this.sendMessage(formattedMessage)
  }

  async sendProgressUpdate(progress: {
    weight?: number
    measurements?: Record<string, number>
    achievements?: string[]
  }): Promise<boolean> {
    let message = `
📊 <b>Progress Update</b>\n`

    if (progress.weight) {
      message += `\nWeight: ${progress.weight}lbs`
    }

    if (progress.measurements) {
      message += '\n\nMeasurements:'
      Object.entries(progress.measurements).forEach(([key, value]) => {
        message += `\n${key}: ${value}inches`
      })
    }

    if (progress.achievements?.length) {
      message += '\n\nAchievements:'
      progress.achievements.forEach(achievement => {
        message += `\n🏆 ${achievement}`
      })
    }

    return this.sendMessage(message)
  }
}

export { TelegramService }
export const telegramService = TelegramService.getInstance() 