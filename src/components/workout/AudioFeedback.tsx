import React, { useEffect, useRef } from 'react'

interface AudioFeedbackProps {
  isEnabled?: boolean
  volume?: number
}

type SoundType = 'setComplete' | 'exerciseComplete' | 'workoutComplete' | 'focus' | 'milestone'

const AudioFeedback: React.FC<AudioFeedbackProps> = ({ 
  isEnabled = true, 
  volume = 0.5 
}) => {
  const audioContextRef = useRef<AudioContext | null>(null)
  const isInitialized = useRef(false)

  useEffect(() => {
    if (!isEnabled || isInitialized.current) return

    // Initialize AudioContext on user interaction
    const initAudio = () => {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        isInitialized.current = true
      } catch (error) {
        console.warn('Audio context initialization failed:', error)
      }
    }

    // Add event listeners for user interaction
    const events = ['click', 'keydown', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, initAudio, { once: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, initAudio)
      })
    }
  }, [isEnabled])

  const playBeep = (frequency: number, duration: number, type: 'sine' | 'square' | 'triangle' = 'sine') => {
    if (!isEnabled || !audioContextRef.current) return

    try {
      const oscillator = audioContextRef.current.createOscillator()
      const gainNode = audioContextRef.current.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContextRef.current.destination)
      
      oscillator.frequency.value = frequency
      oscillator.type = type
      
      gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime)
      gainNode.gain.linearRampToValueAtTime(volume, audioContextRef.current.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration)
      
      oscillator.start(audioContextRef.current.currentTime)
      oscillator.stop(audioContextRef.current.currentTime + duration)
    } catch (error) {
      console.warn('Audio playback failed:', error)
    }
  }

  const playSound = (soundType: SoundType) => {
    if (!isEnabled) return

    switch (soundType) {
      case 'setComplete':
        // Quick positive beep
        playBeep(800, 0.15, 'sine')
        break
      
      case 'exerciseComplete':
        // Double beep - achievement sound
        playBeep(600, 0.2, 'sine')
        setTimeout(() => playBeep(800, 0.2, 'sine'), 150)
        break
      
      case 'workoutComplete':
        // Triumphant chord progression
        playBeep(523, 0.3, 'sine') // C
        setTimeout(() => playBeep(659, 0.3, 'sine'), 100) // E
        setTimeout(() => playBeep(784, 0.3, 'sine'), 200) // G
        setTimeout(() => playBeep(1047, 0.4, 'sine'), 300) // C
        break
      
      case 'focus':
        // Soft focus chime
        playBeep(1000, 0.1, 'triangle')
        break
      
      case 'milestone':
        // Milestone celebration
        playBeep(700, 0.2, 'sine')
        setTimeout(() => playBeep(900, 0.2, 'sine'), 100)
        break
    }
  }

  // Expose the playSound function globally for the workout components
  useEffect(() => {
    (window as any).playWorkoutSound = playSound
    return () => {
      delete (window as any).playWorkoutSound
    }
  }, [isEnabled, volume])

  return null // This component doesn't render anything
}

// Helper function to play sounds from other components
export const playWorkoutSound = (soundType: SoundType) => {
  if ((window as any).playWorkoutSound) {
    (window as any).playWorkoutSound(soundType)
  }
}

// Hook for using audio feedback in components
export const useAudioFeedback = () => {
  return {
    playSetComplete: () => playWorkoutSound('setComplete'),
    playExerciseComplete: () => playWorkoutSound('exerciseComplete'),
    playWorkoutComplete: () => playWorkoutSound('workoutComplete'),
    playFocus: () => playWorkoutSound('focus'),
    playMilestone: () => playWorkoutSound('milestone')
  }
}

export default AudioFeedback