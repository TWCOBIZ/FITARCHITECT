import React from 'react';

export type ProfileErrorType = 'network' | 'validation' | 'auth' | 'server' | 'unknown';

export interface ProfileError {
  type: ProfileErrorType;
  message: string;
  fieldErrors?: Record<string, string>;
}

export function handleProfileError(err: any): ProfileError {
  if (err?.response?.status === 401) {
    return { type: 'auth', message: 'Authentication required.' };
  }
  if (err?.response?.status === 400 && err?.response?.data?.errors) {
    return { type: 'validation', message: 'Validation error.', fieldErrors: err.response.data.errors };
  }
  if (err?.message?.includes('Network')) {
    return { type: 'network', message: 'Network error. Please check your connection.' };
  }
  if (err?.response?.status >= 500) {
    return { type: 'server', message: 'Server error. Please try again later.' };
  }
  return { type: 'unknown', message: 'An unknown error occurred.' };
}

export class ProfileErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, info: any) {
    // Log error to monitoring service
    // console.error(error, info);
  }
  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please refresh the page or contact support.</div>;
    }
    return this.props.children;
  }
} 