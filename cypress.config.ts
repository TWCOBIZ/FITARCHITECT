import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      // implement node event listeners here
      
      // Task to check if backend is running
      on('task', {
        checkBackend() {
          return fetch('http://localhost:3001/api/health')
            .then(() => true)
            .catch(() => false);
        }
      });
    },
    env: {
      // Test environment variables
      BACKEND_URL: "http://localhost:3001"
    }
  },
});
