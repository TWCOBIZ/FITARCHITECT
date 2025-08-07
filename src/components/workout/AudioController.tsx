import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import useSound from 'use-sound'

// Audio file URLs (we'll create simple tone sounds)
const AUDIO_FILES = {
  setComplete: '/sounds/set-complete.mp3',
  restStart: '/sounds/rest-start.mp3', 
  restEnd: '/sounds/rest-end.mp3',
  workoutComplete: '/sounds/workout-complete.mp3',
  countdownTick: '/sounds/countdown-tick.mp3',
  encouragement: '/sounds/encouragement.mp3'
}

interface AudioSettings {
  enabled: boolean
  volume: number
  enableVoice: boolean
  enableEffects: boolean
}

interface AudioContextType {
  settings: AudioSettings
  updateSettings: (settings: Partial<AudioSettings>) => void
  playSetComplete: () => void
  playRestStart: () => void
  playRestEnd: () => void
  playWorkoutComplete: () => void
  playCountdownTick: () => void
  playEncouragement: () => void
  speakText: (text: string) => void
}

const AudioContext = createContext<AudioContextType | null>(null)

// Generate simple tones using Web Audio API as fallback
const createTone = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
  return () => {
    if (typeof window === 'undefined') return
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
      oscillator.type = type
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration)
    } catch (error) {
      console.warn('Audio not supported:', error)
    }
  }
}

// Tone generators for different events
const tones = {
  setComplete: createTone(523.25, 0.3), // C5 note
  restStart: createTone(440, 0.5), // A4 note
  restEnd: createTone(659.25, 0.4), // E5 note
  workoutComplete: createTone(783.99, 0.8), // G5 note
  countdownTick: createTone(800, 0.1), // High tick
  encouragement: createTone(698.46, 0.6) // F5 note
}

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AudioSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workout-audio-settings')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          // Fall through to defaults
        }
      }
    }
    return {
      enabled: true,
      volume: 0.7,
      enableVoice: true,
      enableEffects: true
    }
  })

  const speechSynthRef = useRef<SpeechSynthesis | null>(null)

  // Initialize speech synthesis
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthRef.current = window.speechSynthesis
    }
  }, [])

  // Save settings to localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('workout-audio-settings', JSON.stringify(settings))
    }
  }, [settings])

  // Load sounds with fallback to tones
  const [playSetCompleteSound] = useSound(AUDIO_FILES.setComplete, {
    volume: settings.volume,
    onloadError: () => console.warn('Could not load set complete sound, using tone fallback')
  })
  
  const [playRestStartSound] = useSound(AUDIO_FILES.restStart, {
    volume: settings.volume,
    onloadError: () => console.warn('Could not load rest start sound, using tone fallback')
  })
  
  const [playRestEndSound] = useSound(AUDIO_FILES.restEnd, {
    volume: settings.volume,
    onloadError: () => console.warn('Could not load rest end sound, using tone fallback')
  })
  
  const [playWorkoutCompleteSound] = useSound(AUDIO_FILES.workoutComplete, {
    volume: settings.volume,
    onloadError: () => console.warn('Could not load workout complete sound, using tone fallback')
  })
  
  const [playCountdownTickSound] = useSound(AUDIO_FILES.countdownTick, {
    volume: settings.volume,
    onloadError: () => console.warn('Could not load countdown tick sound, using tone fallback')
  })
  
  const [playEncouragementSound] = useSound(AUDIO_FILES.encouragement, {
    volume: settings.volume,
    onloadError: () => console.warn('Could not load encouragement sound, using tone fallback')
  })

  const updateSettings = useCallback((newSettings: Partial<AudioSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  const speakText = useCallback((text: string) => {
    console.log('speakText called with:', text, 'settings:', settings)
    if (!settings.enabled || !settings.enableVoice || !speechSynthRef.current) {
      console.log('Speech blocked - enabled:', settings.enabled, 'enableVoice:', settings.enableVoice, 'speechSynth:', !!speechSynthRef.current)
      return
    }
    
    try {
      // Cancel any existing speech
      speechSynthRef.current.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.volume = settings.volume
      utterance.rate = 1.1
      utterance.pitch = 1
      
      console.log('Speaking:', text)
      speechSynthRef.current.speak(utterance)
    } catch (error) {
      console.error('Speech synthesis failed:', error)
    }
  }, [settings])

  const createAudioPlayer = (soundPlayer: () => void, tonePlayer: () => void, voiceText?: string) => {
    return () => {
      console.log('Audio player triggered - enabled:', settings.enabled, 'effects:', settings.enableEffects, 'voice:', settings.enableVoice)
      if (!settings.enabled) {
        console.log('Audio disabled globally')
        return
      }
      
      if (settings.enableEffects) {
        try {
          console.log('Playing sound effect...')
          soundPlayer()
        } catch (error) {
          console.log('Sound effect failed, trying tone fallback...', error)
          // Fallback to tone
          tonePlayer()
        }
      }
      
      if (voiceText && settings.enableVoice) {
        console.log('Playing voice text:', voiceText)
        speakText(voiceText)
      }
    }
  }

  const audioActions = {
    playSetComplete: createAudioPlayer(
      playSetCompleteSound,
      tones.setComplete,
      "Set complete! Great job!"
    ),
    playRestStart: createAudioPlayer(
      playRestStartSound,
      tones.restStart,
      "Rest time. Take a breath."
    ),
    playRestEnd: createAudioPlayer(
      playRestEndSound,
      tones.restEnd,
      "Rest over. Let's go!"
    ),
    playWorkoutComplete: createAudioPlayer(
      playWorkoutCompleteSound,
      tones.workoutComplete,
      "Workout complete! Amazing work!"
    ),
    playCountdownTick: createAudioPlayer(
      playCountdownTickSound,
      tones.countdownTick
    ),
    playEncouragement: createAudioPlayer(
      playEncouragementSound,
      tones.encouragement,
      "You've got this! Keep pushing!"
    )
  }

  const contextValue: AudioContextType = {
    settings,
    updateSettings,
    speakText,
    ...audioActions
  }

  return (
    <AudioContext.Provider value={contextValue}>
      {children}
    </AudioContext.Provider>
  )
}

export const useAudio = () => {
  const context = useContext(AudioContext)
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider')
  }
  return context
}

// Audio Settings Component
export const AudioSettings: React.FC = () => {
  const { settings, updateSettings } = useAudio()

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Audio Settings</h3>
      
      <div className="space-y-3">
        {/* Enable Audio */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">Enable Audio</label>
          <button
            onClick={() => updateSettings({ enabled: !settings.enabled })}
            className={`w-12 h-6 rounded-full transition-colors ${
              settings.enabled ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Volume */}
        <div className="space-y-2">
          <label className="text-sm text-gray-300">Volume</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.volume}
            onChange={(e) => updateSettings({ volume: parseFloat(e.target.value) })}
            className="w-full"
            disabled={!settings.enabled}
          />
        </div>

        {/* Voice Feedback */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">Voice Coaching</label>
          <button
            onClick={() => updateSettings({ enableVoice: !settings.enableVoice })}
            disabled={!settings.enabled}
            className={`w-12 h-6 rounded-full transition-colors ${
              settings.enableVoice && settings.enabled ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full transition-transform ${
                settings.enableVoice && settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Sound Effects */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">Sound Effects</label>
          <button
            onClick={() => updateSettings({ enableEffects: !settings.enableEffects })}
            disabled={!settings.enabled}
            className={`w-12 h-6 rounded-full transition-colors ${
              settings.enableEffects && settings.enabled ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full transition-transform ${
                settings.enableEffects && settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

export default { AudioProvider, useAudio, AudioSettings }