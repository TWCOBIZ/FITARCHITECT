import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { TextPlugin } from 'gsap/TextPlugin'

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, TextPlugin)

// Animation durations
export const DURATIONS = {
  FAST: 0.2,
  MEDIUM: 0.4,
  SLOW: 0.6
}

// Easing functions
export const EASINGS = {
  EASE_OUT: 'power2.out',
  EASE_IN_OUT: 'power2.inOut',
  BOUNCE: 'bounce.out'
}

// User preference for reduced motion
const getUserMotionPreference = () => {
  const preference = localStorage.getItem('reducedMotion')
  return preference === 'true'
}

// Page transition animations
export const pageTransition = {
  fadeIn: (element: HTMLElement) => {
    return gsap.fromTo(
      element,
      { opacity: 0 },
      { opacity: 1, duration: DURATIONS.MEDIUM, ease: EASINGS.EASE_OUT }
    )
  },
  fadeOut: (element: HTMLElement) => {
    return gsap.to(element, {
      opacity: 0,
      duration: DURATIONS.FAST,
      ease: EASINGS.EASE_OUT
    })
  },
  slideIn: (element: HTMLElement, direction: 'left' | 'right' = 'left') => {
    const x = direction === 'left' ? -100 : 100
    return gsap.fromTo(
      element,
      { x, opacity: 0 },
      { x: 0, opacity: 1, duration: DURATIONS.MEDIUM, ease: EASINGS.EASE_OUT }
    )
  }
}

// Card animations
export const cardAnimations = {
  hover: (element: HTMLElement) => {
    return gsap.to(element, {
      scale: 1.02,
      boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
      duration: DURATIONS.FAST,
      ease: EASINGS.EASE_OUT
    })
  },
  hoverOut: (element: HTMLElement) => {
    return gsap.to(element, {
      scale: 1,
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      duration: DURATIONS.FAST,
      ease: EASINGS.EASE_OUT
    })
  },
  reveal: (element: HTMLElement) => {
    return gsap.fromTo(
      element,
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: DURATIONS.MEDIUM, ease: EASINGS.EASE_OUT }
    )
  }
}

// Notification animations
export const notificationAnimations = {
  slideIn: (element: HTMLElement) => {
    return gsap.fromTo(
      element,
      { x: 100, opacity: 0 },
      { x: 0, opacity: 1, duration: DURATIONS.FAST, ease: EASINGS.BOUNCE }
    )
  },
  pulse: (element: HTMLElement) => {
    return gsap.to(element, {
      scale: 1.1,
      duration: DURATIONS.FAST,
      repeat: 1,
      yoyo: true,
      ease: EASINGS.EASE_IN_OUT
    })
  }
}

// Progress animations
export const progressAnimations = {
  counter: (element: HTMLElement, value: number) => {
    return gsap.to(element, {
      textContent: value,
      duration: DURATIONS.MEDIUM,
      snap: { textContent: 1 },
      ease: EASINGS.EASE_OUT
    })
  },
  progressBar: (element: HTMLElement, value: number) => {
    return gsap.to(element, {
      width: `${value}%`,
      duration: DURATIONS.MEDIUM,
      ease: EASINGS.EASE_OUT
    })
  }
}

// Stagger animations
export const staggerAnimations = {
  fadeIn: (elements: HTMLElement[]) => {
    return gsap.fromTo(
      elements,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: DURATIONS.MEDIUM,
        stagger: 0.1,
        ease: EASINGS.EASE_OUT
      }
    )
  }
}

// Utility function to create a timeline
export const createTimeline = () => {
  return gsap.timeline()
}

// Utility function to animate with user preference support
export const animateWithReducedMotion = (
  animation: () => gsap.core.Timeline,
  fallback: () => void
) => {
  if (getUserMotionPreference()) {
    fallback()
  } else {
    animation()
  }
}

// Function to set user's motion preference
export const setUserMotionPreference = (preferReducedMotion: boolean) => {
  localStorage.setItem('reducedMotion', preferReducedMotion.toString())
} 