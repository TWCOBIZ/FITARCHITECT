import { useState, useCallback } from 'react';

export function useOptimisticUpdate<T>(initialValue: T) {
  const [optimisticValue, setOptimisticValue] = useState<T>(initialValue);
  const [lastKnownGood, setLastKnownGood] = useState<T>(initialValue);

  const commit = useCallback((newValue: T) => {
    setLastKnownGood(newValue);
    setOptimisticValue(newValue);
  }, []);

  const rollback = useCallback(() => {
    setOptimisticValue(lastKnownGood);
  }, [lastKnownGood]);

  return { optimisticValue, setOptimisticValue, rollback, commit };
} 