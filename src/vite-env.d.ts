/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WGER_API_KEY: string
  readonly VITE_OPENAI_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  verifyDatabaseConnection()
    .then(success => {
      if (success) {
        console.log('Database verification completed successfully')
        process.exit(0)
      } else {
        console.error('Database verification failed')
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('Unexpected error during verification:', error)
      process.exit(1)
    })
} 