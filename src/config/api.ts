// API Configuration - Frontend uses import.meta.env for Vite
export const API_CONFIG = {
  // SECURITY: Never expose sensitive API keys in frontend code
  // TELEGRAM_BOT_TOKEN: Removed - use backend API endpoints instead
  // OPENAI_API_KEY: Removed - use backend API endpoints instead
  WGER_API_KEY: import.meta.env.VITE_WGER_API_KEY || '',
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  // Add other API keys as needed
}

// Validate required API keys
export const validateApiKeys = () => {
  const missingKeys = []
  
  // Only validate frontend-safe API keys
  if (!API_CONFIG.WGER_API_KEY) {
    missingKeys.push('WGER_API_KEY')
  }
  
  if (!API_CONFIG.API_URL) {
    missingKeys.push('API_URL')
  }
  
  if (missingKeys.length > 0) {
    console.warn('Missing required configuration:', missingKeys.join(', '))
    return false
  }
  
  return true
} 