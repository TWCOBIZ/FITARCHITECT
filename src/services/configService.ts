// Centralized configuration service for API keys and environment variables
interface ConfigValidation {
  required: boolean;
  format?: RegExp;
  minLength?: number;
  maxLength?: number;
  description: string;
}

interface ConfigItem {
  value: string | null;
  isValid: boolean;
  error?: string;
  source: 'env' | 'default' | 'fallback' | 'missing';
}

class ConfigurationService {
  private config = new Map<string, ConfigItem>();
  
  // Configuration definitions with validation rules
  private readonly configDefinitions: Record<string, ConfigValidation> = {
    // API Keys
    'VITE_EXERCISEDB_API_KEY': {
      required: false, // Optional - app works with fallbacks
      minLength: 20,
      description: 'ExerciseDB RapidAPI key for exercise GIFs'
    },
    'VITE_WGER_API_KEY': {
      required: false, // Optional - app works with public API
      minLength: 20,
      description: 'WGER API key for exercise database'
    },
    'OPENAI_API_KEY': {
      required: true, // Required for AI features
      format: /^sk-[a-zA-Z0-9\-_]+$/,
      minLength: 40,
      description: 'OpenAI API key for workout and meal generation'
    },
    'ANTHROPIC_API_KEY': {
      required: false,
      format: /^sk-ant-[a-zA-Z0-9\-_]+$/,
      minLength: 40,
      description: 'Anthropic API key for Claude AI features'
    },
    
    // Database & Authentication
    'DATABASE_URL': {
      required: true,
      format: /^postgresql:\/\/.*$/,
      description: 'PostgreSQL database connection string'
    },
    'JWT_SECRET': {
      required: true,
      minLength: 32,
      description: 'JWT token signing secret'
    },
    
    // Payment Processing
    'STRIPE_SECRET_KEY': {
      required: true,
      format: /^sk_(test_|live_)[a-zA-Z0-9]+$/,
      description: 'Stripe secret key for payment processing'
    },
    'VITE_STRIPE_PUBLISHABLE_KEY': {
      required: true,
      format: /^pk_(test_|live_)[a-zA-Z0-9]+$/,
      description: 'Stripe publishable key for frontend'
    },
    
    // External Services
    'CLOUDINARY_CLOUD_NAME': {
      required: false,
      minLength: 3,
      description: 'Cloudinary cloud name for image uploads'
    },
    'CLOUDINARY_API_KEY': {
      required: false,
      format: /^\d+$/,
      description: 'Cloudinary API key'
    },
    'CLOUDINARY_API_SECRET': {
      required: false,
      minLength: 20,
      description: 'Cloudinary API secret'
    },
    // TELEGRAM_BOT_TOKEN: Removed for security - handled by backend only
    
    // Application Settings
    'VITE_API_URL': {
      required: true,
      format: /^https?:\/\/.*$/,
      description: 'Backend API URL'
    },
    'PORT': {
      required: false,
      format: /^\d+$/,
      description: 'Server port number'
    },
    'VITE_OPENAI_MODEL': {
      required: false,
      description: 'OpenAI model to use (defaults to gpt-4-turbo-preview)'
    }
  };

  constructor() {
    this.loadConfiguration();
  }

  private loadConfiguration() {
    for (const [key, validation] of Object.entries(this.configDefinitions)) {
      const value = this.getEnvironmentVariable(key);
      const configItem = this.validateConfigItem(key, value, validation);
      this.config.set(key, configItem);
    }
  }

  private getEnvironmentVariable(key: string): string | null {
    // Check both import.meta.env (Vite) and process.env (Node.js)
    if (typeof window !== 'undefined' && import.meta && import.meta.env) {
      return import.meta.env[key] || null;
    }
    
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || null;
    }
    
    return null;
  }

  private validateConfigItem(key: string, value: string | null, validation: ConfigValidation): ConfigItem {
    if (!value) {
      return {
        value: null,
        isValid: !validation.required,
        error: validation.required ? `Required environment variable ${key} is missing` : undefined,
        source: 'missing'
      };
    }

    // Length validation
    if (validation.minLength && value.length < validation.minLength) {
      return {
        value,
        isValid: false,
        error: `${key} must be at least ${validation.minLength} characters long`,
        source: 'env'
      };
    }

    if (validation.maxLength && value.length > validation.maxLength) {
      return {
        value,
        isValid: false,
        error: `${key} must be no more than ${validation.maxLength} characters long`,
        source: 'env'
      };
    }

    // Format validation
    if (validation.format && !validation.format.test(value)) {
      return {
        value,
        isValid: false,
        error: `${key} format is invalid`,
        source: 'env'
      };
    }

    return {
      value,
      isValid: true,
      source: 'env'
    };
  }

  // Get configuration value with fallback handling
  get(key: string, fallback?: string): string | null {
    const configItem = this.config.get(key);
    
    if (!configItem) {
      console.warn(`Unknown configuration key: ${key}`);
      return fallback || null;
    }

    if (configItem.isValid && configItem.value) {
      return configItem.value;
    }

    if (fallback) {
      console.log(`Using fallback value for ${key}`);
      return fallback;
    }

    return null;
  }

  // Get configuration value with type conversion
  getNumber(key: string, fallback?: number): number | null {
    const value = this.get(key);
    if (!value) return fallback || null;
    
    const num = parseInt(value, 10);
    return isNaN(num) ? fallback || null : num;
  }

  getBoolean(key: string, fallback?: boolean): boolean {
    const value = this.get(key);
    if (!value) return fallback || false;
    
    return value.toLowerCase() === 'true' || value === '1';
  }

  // Check if a configuration key is available and valid
  isAvailable(key: string): boolean {
    const configItem = this.config.get(key);
    return configItem ? configItem.isValid && !!configItem.value : false;
  }

  // Get validation status for all configurations
  getValidationReport(): {
    valid: Record<string, ConfigItem>;
    invalid: Record<string, ConfigItem>;
    missing: Record<string, ConfigItem>;
    summary: {
      totalKeys: number;
      validKeys: number;
      invalidKeys: number;
      missingRequiredKeys: number;
    };
  } {
    const valid: Record<string, ConfigItem> = {};
    const invalid: Record<string, ConfigItem> = {};
    const missing: Record<string, ConfigItem> = {};

    for (const [key, configItem] of this.config.entries()) {
      if (configItem.source === 'missing') {
        missing[key] = configItem;
      } else if (configItem.isValid) {
        valid[key] = configItem;
      } else {
        invalid[key] = configItem;
      }
    }

    const missingRequiredKeys = Object.keys(missing).filter(key => 
      this.configDefinitions[key]?.required
    ).length;

    return {
      valid,
      invalid,
      missing,
      summary: {
        totalKeys: this.config.size,
        validKeys: Object.keys(valid).length,
        invalidKeys: Object.keys(invalid).length,
        missingRequiredKeys
      }
    };
  }

  // Get service availability status
  getServiceStatus(): {
    openai: { available: boolean; reason?: string };
    exercisedb: { available: boolean; reason?: string };
    wger: { available: boolean; reason?: string };
    stripe: { available: boolean; reason?: string };
    cloudinary: { available: boolean; reason?: string };
    telegram: { available: boolean; reason?: string };
    database: { available: boolean; reason?: string };
  } {
    return {
      openai: this.getServiceAvailability('OPENAI_API_KEY', 'OpenAI API key required for AI features'),
      exercisedb: this.getServiceAvailability('VITE_EXERCISEDB_API_KEY', 'ExerciseDB API key missing - using fallback GIFs'),
      wger: this.getServiceAvailability('VITE_WGER_API_KEY', 'WGER API key missing - using public API'),
      stripe: this.getMultiKeyServiceAvailability(['STRIPE_SECRET_KEY', 'VITE_STRIPE_PUBLISHABLE_KEY'], 'Stripe keys required for payments'),
      cloudinary: this.getMultiKeyServiceAvailability(['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'], 'Cloudinary config missing - avatar uploads disabled'),
      telegram: this.getServiceAvailability('TELEGRAM_BOT_TOKEN', 'Telegram bot token missing - notifications disabled'),
      database: this.getServiceAvailability('DATABASE_URL', 'Database URL required')
    };
  }

  private getServiceAvailability(key: string, errorMessage: string): { available: boolean; reason?: string } {
    const available = this.isAvailable(key);
    return {
      available,
      reason: available ? undefined : errorMessage
    };
  }

  private getMultiKeyServiceAvailability(keys: string[], errorMessage: string): { available: boolean; reason?: string } {
    const available = keys.every(key => this.isAvailable(key));
    return {
      available,
      reason: available ? undefined : errorMessage
    };
  }

  // Reload configuration (useful for development)
  reload() {
    this.config.clear();
    this.loadConfiguration();
    console.log('Configuration reloaded');
  }

  // Get configuration descriptions for documentation
  getConfigDocumentation(): Record<string, { description: string; required: boolean; example?: string }> {
    const docs: Record<string, { description: string; required: boolean; example?: string }> = {};
    
    for (const [key, validation] of Object.entries(this.configDefinitions)) {
      docs[key] = {
        description: validation.description,
        required: validation.required,
        example: this.getExampleValue(key)
      };
    }
    
    return docs;
  }

  private getExampleValue(key: string): string | undefined {
    const examples: Record<string, string> = {
      'VITE_EXERCISEDB_API_KEY': 'your_rapidapi_key_here',
      'OPENAI_API_KEY': 'sk-proj-your_openai_key_here',
      'DATABASE_URL': 'postgresql://user:password@localhost:5432/dbname',
      'JWT_SECRET': 'your_long_random_secret_string_here',
      'STRIPE_SECRET_KEY': 'sk_test_your_stripe_secret_key',
      'VITE_STRIPE_PUBLISHABLE_KEY': 'pk_test_your_stripe_publishable_key',
      'VITE_API_URL': 'http://localhost:3001',
      'PORT': '3001'
    };
    
    return examples[key];
  }
}

// Export singleton instance
export const configService = new ConfigurationService();

// Convenience functions for common use cases
export const getApiKey = (service: 'openai' | 'exercisedb' | 'wger' | 'stripe_secret' | 'stripe_public' | 'cloudinary_key' | 'telegram'): string | null => {
  const keyMap = {
    openai: 'OPENAI_API_KEY',
    exercisedb: 'VITE_EXERCISEDB_API_KEY',
    wger: 'VITE_WGER_API_KEY',
    stripe_secret: 'STRIPE_SECRET_KEY',
    stripe_public: 'VITE_STRIPE_PUBLISHABLE_KEY',
    cloudinary_key: 'CLOUDINARY_API_KEY',
    telegram: 'TELEGRAM_BOT_TOKEN'
  };
  
  return configService.get(keyMap[service]);
};

export const isServiceAvailable = (service: 'openai' | 'exercisedb' | 'wger' | 'stripe' | 'cloudinary' | 'telegram' | 'database'): boolean => {
  const status = configService.getServiceStatus();
  return status[service].available;
};

export const validateEnvironmentSetup = (): { isValid: boolean; errors: string[]; warnings: string[] } => {
  const report = configService.getValidationReport();
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for missing required keys
  for (const [key, item] of Object.entries(report.missing)) {
    if (configService['configDefinitions'][key]?.required) {
      errors.push(`Required: ${key} - ${configService['configDefinitions'][key].description}`);
    } else {
      warnings.push(`Optional: ${key} - ${configService['configDefinitions'][key].description}`);
    }
  }
  
  // Check for invalid keys
  for (const [key, item] of Object.entries(report.invalid)) {
    errors.push(`Invalid: ${key} - ${item.error}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};