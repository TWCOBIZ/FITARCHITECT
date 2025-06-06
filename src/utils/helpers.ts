import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utility function to merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date to readable string
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }

    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export function isProfileComplete(user: any): boolean {
  if (!user) return false;
  const profile = user.profile || user;
  return !!profile.fitnessLevel &&
    !!profile.goals && Array.isArray(profile.goals) && profile.goals.length > 0 &&
    !!profile.availableEquipment && Array.isArray(profile.availableEquipment) && profile.availableEquipment.length > 0 &&
    !!profile.daysPerWeek &&
    !!profile.preferredWorkoutDuration;
} 