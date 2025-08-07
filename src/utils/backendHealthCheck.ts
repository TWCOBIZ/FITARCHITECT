import axios from 'axios';

export interface BackendStatus {
  isReady: boolean;
  message?: string;
  services?: {
    database?: { status: string };
    openai?: { status: string };
  };
}

let backendReady = false;
let checkInProgress = false;
const listeners: ((status: BackendStatus) => void)[] = [];

// Create a separate axios instance for health checks to avoid circular dependency
const healthCheckAxios = axios.create({
  baseURL: import.meta.env.PROD ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : '',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const backendHealthCheck = {
  async checkHealth(): Promise<BackendStatus> {
    try {
      console.log('Checking backend health...');
      const response = await healthCheckAxios.get('/health');
      
      console.log('Health endpoint response:', response.data);
      
      const isHealthy = response.data.status === 'OK' || response.data.status === 'DEGRADED';
      backendReady = isHealthy;
      
      console.log('Backend health check result:', isHealthy ? 'Healthy' : 'Unhealthy', `(status: ${response.data.status})`);
      
      return {
        isReady: isHealthy,
        message: isHealthy ? 'Backend is ready' : 'Backend is not ready',
        services: response.data.services
      };
    } catch (error) {
      console.error('Backend health check failed:', error);
      backendReady = false;
      return {
        isReady: false,
        message: 'Backend is not available'
      };
    }
  },

  async waitForBackend(maxRetries = 10, retryDelay = 1000): Promise<BackendStatus> {
    if (checkInProgress) {
      // Wait for existing check to complete
      return new Promise((resolve) => {
        const listener = (status: BackendStatus) => {
          resolve(status);
          const index = listeners.indexOf(listener);
          if (index > -1) listeners.splice(index, 1);
        };
        listeners.push(listener);
      });
    }

    checkInProgress = true;
    
    for (let i = 0; i < maxRetries; i++) {
      const status = await this.checkHealth();
      
      if (status.isReady) {
        checkInProgress = false;
        listeners.forEach(listener => listener(status));
        listeners.length = 0;
        return status;
      }
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    const finalStatus = {
      isReady: false,
      message: 'Backend is not available after multiple retries'
    };
    
    checkInProgress = false;
    listeners.forEach(listener => listener(finalStatus));
    listeners.length = 0;
    
    return finalStatus;
  },

  isReady(): boolean {
    return backendReady;
  },

  async ensureReady(): Promise<void> {
    if (backendReady) return;
    
    const status = await this.waitForBackend();
    if (!status.isReady) {
      throw new Error(status.message || 'Backend is not available');
    }
  }
};

// Perform initial health check
if (typeof window !== 'undefined') {
  backendHealthCheck.checkHealth();
}