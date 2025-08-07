// Backend configuration validation utility
interface ConfigValidation {
  required: boolean;
  format?: RegExp;
  minLength?: number;
  description: string;
}

interface ValidationResult {
  key: string;
  isValid: boolean;
  isPresent: boolean;
  error?: string;
  value?: string; // Masked for security
}

class BackendConfigValidator {
  private readonly configDefinitions: Record<string, ConfigValidation> = {
    // Critical for app functionality
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
    'OPENAI_API_KEY': {
      required: true,
      format: /^sk-[a-zA-Z0-9\-_]+$/,
      minLength: 40,
      description: 'OpenAI API key for AI features'
    },
    
    // Payment processing
    'STRIPE_SECRET_KEY': {
      required: true,
      format: /^sk_(test_|live_)[a-zA-Z0-9]+$/,
      description: 'Stripe secret key for payments'
    },
    'STRIPE_BASIC_PLAN_ID': {
      required: true,
      description: 'Stripe plan ID for basic subscription'
    },
    'STRIPE_PREMIUM_PLAN_ID': {
      required: true,
      description: 'Stripe plan ID for premium subscription'
    },
    
    // Optional services
    'WGER_API_KEY': {
      required: false,
      minLength: 20,
      description: 'WGER API key for exercise database'
    },
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
    'TELEGRAM_BOT_TOKEN': {
      required: false,
      format: /^\d+:[a-zA-Z0-9\-_]+$/,
      description: 'Telegram bot token for notifications'
    },
    'ANTHROPIC_API_KEY': {
      required: false,
      format: /^sk-ant-[a-zA-Z0-9\-_]+$/,
      description: 'Anthropic API key for Claude AI'
    },
    
    // Application settings
    'PORT': {
      required: false,
      format: /^\d+$/,
      description: 'Server port number'
    },
    'OPENAI_MODEL': {
      required: false,
      description: 'OpenAI model to use'
    },
    'NODE_ENV': {
      required: false,
      description: 'Node environment (development/production/test)'
    }
  };

  validateAll(): {
    isValid: boolean;
    results: ValidationResult[];
    summary: {
      total: number;
      valid: number;
      missing: number;
      invalid: number;
      criticalErrors: number;
    };
    serviceStatus: {
      database: boolean;
      openai: boolean;
      stripe: boolean;
      cloudinary: boolean;
      telegram: boolean;
      wger: boolean;
    };
  } {
    const results: ValidationResult[] = [];
    let criticalErrors = 0;

    for (const [key, validation] of Object.entries(this.configDefinitions)) {
      const result = this.validateSingle(key, validation);
      results.push(result);
      
      if (!result.isValid && validation.required) {
        criticalErrors++;
      }
    }

    const valid = results.filter(r => r.isValid).length;
    const missing = results.filter(r => !r.isPresent).length;
    const invalid = results.filter(r => r.isPresent && !r.isValid).length;

    return {
      isValid: criticalErrors === 0,
      results,
      summary: {
        total: results.length,
        valid,
        missing,
        invalid,
        criticalErrors
      },
      serviceStatus: {
        database: this.isServiceAvailable(['DATABASE_URL']),
        openai: this.isServiceAvailable(['OPENAI_API_KEY']),
        stripe: this.isServiceAvailable(['STRIPE_SECRET_KEY', 'STRIPE_BASIC_PLAN_ID', 'STRIPE_PREMIUM_PLAN_ID']),
        cloudinary: this.isServiceAvailable(['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']),
        telegram: this.isServiceAvailable(['TELEGRAM_BOT_TOKEN']),
        wger: this.isServiceAvailable(['WGER_API_KEY'])
      }
    };
  }

  private validateSingle(key: string, validation: ConfigValidation): ValidationResult {
    const value = process.env[key];
    const isPresent = !!value;

    if (!isPresent) {
      return {
        key,
        isValid: !validation.required,
        isPresent: false,
        error: validation.required ? 'Required environment variable is missing' : undefined
      };
    }

    // Length validation
    if (validation.minLength && value.length < validation.minLength) {
      return {
        key,
        isValid: false,
        isPresent: true,
        error: `Must be at least ${validation.minLength} characters long`,
        value: this.maskValue(key, value)
      };
    }

    // Format validation
    if (validation.format && !validation.format.test(value)) {
      return {
        key,
        isValid: false,
        isPresent: true,
        error: 'Format is invalid',
        value: this.maskValue(key, value)
      };
    }

    return {
      key,
      isValid: true,
      isPresent: true,
      value: this.maskValue(key, value)
    };
  }

  private maskValue(key: string, value: string): string {
    // Mask sensitive values for security
    const sensitiveKeys = ['API_KEY', 'SECRET', 'TOKEN', 'PASSWORD', 'URL'];
    const isSensitive = sensitiveKeys.some(sensitive => key.includes(sensitive));
    
    if (!isSensitive) {
      return value;
    }

    if (value.length <= 8) {
      return '*'.repeat(value.length);
    }

    // Show first 4 and last 4 characters
    return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4);
  }

  private isServiceAvailable(requiredKeys: string[]): boolean {
    return requiredKeys.every(key => !!process.env[key]);
  }

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
      'DATABASE_URL': 'postgresql://user:password@localhost:5432/dbname',
      'JWT_SECRET': 'your_long_random_secret_string_here',
      'OPENAI_API_KEY': 'sk-proj-your_openai_key_here',
      'STRIPE_SECRET_KEY': 'sk_test_your_stripe_secret_key',
      'STRIPE_BASIC_PLAN_ID': 'price_basic_plan_id',
      'STRIPE_PREMIUM_PLAN_ID': 'price_premium_plan_id',
      'CLOUDINARY_CLOUD_NAME': 'your_cloud_name',
      'CLOUDINARY_API_KEY': '123456789012345',
      'CLOUDINARY_API_SECRET': 'your_cloudinary_secret',
      'TELEGRAM_BOT_TOKEN': '123456789:your_bot_token',
      'WGER_API_KEY': 'your_wger_api_key',
      'PORT': '3001',
      'OPENAI_MODEL': 'gpt-4-turbo-preview',
      'NODE_ENV': 'development'
    };
    
    return examples[key];
  }
}

export const backendConfigValidator = new BackendConfigValidator();