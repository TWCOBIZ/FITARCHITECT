// API Configuration
export const API_CONFIG = {
  TELEGRAM_BOT_TOKEN: process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '',
  OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
  TELEGRAM_DEV_CHANNEL_ID: process.env.NEXT_PUBLIC_TELEGRAM_DEV_CHANNEL_ID || '',
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