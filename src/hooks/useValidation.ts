import { useState, useCallback } from 'react';
import { z, ZodTypeAny } from 'zod';

export function useValidation<T>(schema: ZodTypeAny, initialData: T) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(true);

  const validateField = useCallback((field: keyof T, value: any) => {
    try {
      schema.pick({ [field]: true }).parse({ [field]: value });
      setErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
      setIsValid(Object.keys(errors).length === 1 ? true : isValid);
      return true;
    } catch (e: any) {
      setErrors(prev => ({ ...prev, [field]: e.errors?.[0]?.message || 'Invalid value' }));
      setIsValid(false);
      return false;
    }
  }, [schema, errors, isValid]);

  const validateAll = useCallback((data: T) => {
    const result = schema.safeParse(data);
    if (result.success) {
      setErrors({});
      setIsValid(true);
      return true;
    } else {
      const errs: Record<string, string> = {};
      result.error.errors.forEach(e => {
        if (e.path.length) errs[e.path.join('.')] = e.message;
      });
      setErrors(errs);
      setIsValid(false);
      return false;
    }
  }, [schema]);

  return { isValid, errors, validateField, validateAll };
} 