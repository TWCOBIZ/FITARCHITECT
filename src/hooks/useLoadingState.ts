import { useState, useCallback } from 'react'

interface LoadingState {
  [key: string]: boolean
}

interface LoadingStateHook {
  isLoading: (key?: string) => boolean
  setLoading: (key: string, loading: boolean) => void
  startLoading: (key: string) => void
  stopLoading: (key: string) => void
  withLoading: <T>(key: string, operation: () => Promise<T>) => Promise<T>
  isAnyLoading: () => boolean
  getLoadingStates: () => LoadingState
}

export const useLoadingState = (): LoadingStateHook => {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({})

  const isLoading = useCallback((key = 'default') => {
    return loadingStates[key] || false
  }, [loadingStates])

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading
    }))
  }, [])

  const startLoading = useCallback((key: string) => {
    setLoading(key, true)
  }, [setLoading])

  const stopLoading = useCallback((key: string) => {
    setLoading(key, false)
  }, [setLoading])

  const withLoading = useCallback(async <T>(
    key: string, 
    operation: () => Promise<T>
  ): Promise<T> => {
    try {
      startLoading(key)
      const result = await operation()
      return result
    } finally {
      stopLoading(key)
    }
  }, [startLoading, stopLoading])

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(loading => loading)
  }, [loadingStates])

  const getLoadingStates = useCallback(() => {
    return { ...loadingStates }
  }, [loadingStates])

  return {
    isLoading,
    setLoading,
    startLoading,
    stopLoading,
    withLoading,
    isAnyLoading,
    getLoadingStates
  }
}