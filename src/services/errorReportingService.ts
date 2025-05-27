interface ErrorReport {
  timestamp: string
  error: {
    code: number
    description: string
    message: string
  }
  context: {
    component: string
    action: string
    userId?: string
    userAgent: string
    url: string
  }
  additionalInfo?: Record<string, unknown>
}

class ErrorReportingService {
  private static instance: ErrorReportingService
  private readonly ERROR_REPORTING_ENDPOINT = '/api/report-error'
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAY = 1000 // 1 second

  private constructor() {}

  public static getInstance(): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService()
    }
    return ErrorReportingService.instance
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retries: number = this.MAX_RETRIES
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY))
        return this.retryWithBackoff(operation, retries - 1)
      }
      throw error
    }
  }

  private getContext(component: string, action: string): ErrorReport['context'] {
    return {
      component,
      action,
      userAgent: navigator.userAgent,
      url: window.location.href,
      // Add userId if available from your auth system
      userId: localStorage.getItem('userId') || undefined
    }
  }

  public async reportError(
    error: ErrorReport['error'],
    component: string,
    action: string,
    additionalInfo?: Record<string, unknown>
  ): Promise<boolean> {
    const report: ErrorReport = {
      timestamp: new Date().toISOString(),
      error,
      context: this.getContext(component, action),
      additionalInfo
    }

    try {
      const response = await this.retryWithBackoff(async () => {
        const res = await fetch(this.ERROR_REPORTING_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(report)
        })

        if (!res.ok) {
          throw new Error(`Error reporting failed: ${res.statusText}`)
        }

        return res
      })

      return response.ok
    } catch (error) {
      console.error('Failed to report error:', error)
      // Store error locally for retry later
      this.storeErrorForRetry(report)
      return false
    }
  }

  private storeErrorForRetry(report: ErrorReport) {
    try {
      const storedErrors: ErrorReport[] = JSON.parse(localStorage.getItem('pendingErrorReports') || '[]')
      storedErrors.push(report)
      localStorage.setItem('pendingErrorReports', JSON.stringify(storedErrors))
    } catch (error) {
      console.error('Failed to store error for retry:', error)
    }
  }

  public async retryPendingReports(): Promise<void> {
    try {
      const storedErrors: ErrorReport[] = JSON.parse(localStorage.getItem('pendingErrorReports') || '[]')
      if (storedErrors.length === 0) return

      const successfulReports = []
      const failedReports = []

      for (const report of storedErrors) {
        try {
          const response = await fetch(this.ERROR_REPORTING_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(report)
          })

          if (response.ok) {
            successfulReports.push(report)
          } else {
            failedReports.push(report)
          }
        } catch (error) {
          failedReports.push(report)
        }
      }

      // Update stored errors with only the failed ones
      localStorage.setItem('pendingErrorReports', JSON.stringify(failedReports))
    } catch (error) {
      console.error('Failed to retry pending error reports:', error)
    }
  }
}

export { ErrorReportingService }
export const errorReportingService = ErrorReportingService.getInstance() 