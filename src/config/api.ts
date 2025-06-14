// API Configuration - Frontend uses import.meta.env for Vite
export const API_CONFIG = {
  TELEGRAM_BOT_TOKEN: '7519345955:AAE22XP27RTiUAheUDedwEyE6mqDpdZeby4',
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY || '',
  TELEGRAM_DEV_CHANNEL_ID: '7377619655:AAGrT-325zFAvVhOy1HhvXV82VO_r5uLIz4',
  WGER_API_KEY: import.meta.env.VITE_WGER_API_KEY || '1290b55371dff02ede27b4ac05beb44fe9cf5a4a',
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  // Add other API keys as needed
}

// Validate required API keys
export const validateApiKeys = () => {
  const missingKeys = []
  
  if (!API_CONFIG.TELEGRAM_BOT_TOKEN) {
    missingKeys.push('TELEGRAM_BOT_TOKEN')
  }
  
  if (!API_CONFIG.OPENAI_API_KEY) {
    missingKeys.push('OPENAI_API_KEY')
  }
  
  if (missingKeys.length > 0) {
    console.warn('Missing required API keys:', missingKeys.join(', '))
    return false
  }
  
  return true
} 