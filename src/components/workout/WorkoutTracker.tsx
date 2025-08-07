import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { useWorkout } from '../../contexts/WorkoutContext'
import { useAuth } from '../../contexts/AuthContext'
import ExerciseCardWithApi from './ExerciseCardWithApi'
import SetTracker from './SetTracker'
import ProgressPyramid from './ProgressPyramid'
import CircularTimer from './CircularTimer'
import CelebrationSystem, { CelebrationSystemRef } from './CelebrationSystem'
import GestureHandler from './GestureHandler'
import GestureGuide from './GestureGuide'
import { useAudio, AudioSettings } from './AudioController'
import { preloadWorkoutGifs } from '../../utils/exerciseImages'
import { logger } from '../../utils/logger'

// Workout session management
interface WorkoutSession {
  id: string;
  workoutId: string;
  userId: string;
  startTime: Date;
  tabId: string;
  isActive: boolean;
}

class WorkoutSessionManager {
  private static instance: WorkoutSessionManager;
  private sessions: Map<string, WorkoutSession> = new Map();
  private currentSessionId: string | null = null;
  private tabId: string;
  
  constructor() {
    this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.setupEventListeners();
  }
  
  static getInstance(): WorkoutSessionManager {
    if (!WorkoutSessionManager.instance) {
      WorkoutSessionManager.instance = new WorkoutSessionManager();
    }
    return WorkoutSessionManager.instance;
  }
  
  private setupEventListeners() {
    // Listen for messages from other tabs
    window.addEventListener('storage', this.handleStorageChange.bind(this));
    
    // Clean up session on page unload
    window.addEventListener('beforeunload', () => {
      if (this.currentSessionId) {
        this.endSession(this.currentSessionId);
      }
    });
    
    // Handle visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.currentSessionId) {
        // Tab is now hidden - mark session as potentially inactive
        this.updateSessionActivity(false);
      } else if (!document.hidden && this.currentSessionId) {
        // Tab is now visible - reactivate session
        this.updateSessionActivity(true);
      }
    });
  }
  
  private handleStorageChange(event: StorageEvent) {
    if (event.key === 'workoutSessions') {
      this.syncSessions();
    }
  }
  
  private syncSessions() {
    const storedSessions = localStorage.getItem('workoutSessions');
    if (storedSessions) {
      const parsed = JSON.parse(storedSessions);
      this.sessions.clear();
      for (const [key, value] of Object.entries(parsed)) {
        this.sessions.set(key, value as WorkoutSession);
      }
    }
  }
  
  private saveSessions() {
    const sessionsObj = Object.fromEntries(this.sessions);
    localStorage.setItem('workoutSessions', JSON.stringify(sessionsObj));
  }
  
  canStartSession(workoutId: string, userId: string): { canStart: boolean; reason?: string; activeSessionId?: string } {
    this.syncSessions();
    
    // Check if there's already an active session for this workout
    const existingSession = Array.from(this.sessions.values()).find(
      session => session.workoutId === workoutId && 
                session.userId === userId && 
                session.isActive &&
                session.tabId !== this.tabId
    );
    
    if (existingSession) {
      // Check if session is stale (older than 30 minutes)
      const sessionAge = Date.now() - new Date(existingSession.startTime).getTime();
      if (sessionAge > 30 * 60 * 1000) {
        // Remove stale session
        this.sessions.delete(existingSession.id);
        this.saveSessions();
        return { canStart: true };
      }
      
      return { 
        canStart: false, 
        reason: 'This workout is already in progress in another tab. Would you like to resume it?',
        activeSessionId: existingSession.id
      };
    }
    
    return { canStart: true };
  }
  
  startSession(workoutId: string, userId: string): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: WorkoutSession = {
      id: sessionId,
      workoutId,
      userId,
      startTime: new Date(),
      tabId: this.tabId,
      isActive: true
    };
    
    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;
    this.saveSessions();
    
    logger.workout.info('Workout session started', {
      operation: 'workout_session_start',
      component: 'WorkoutTracker',
      metadata: { sessionId, workoutId, tabId: this.tabId }
    });
    
    return sessionId;
  }
  
  endSession(sessionId: string): void {
    if (this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
      this.saveSessions();
      
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
      }
      
      logger.workout.info('Workout session ended', {
        operation: 'workout_session_end',
        component: 'WorkoutTracker',
        metadata: { sessionId }
      });
    }
  }
  
  updateSessionActivity(isActive: boolean): void {
    if (this.currentSessionId && this.sessions.has(this.currentSessionId)) {
      const session = this.sessions.get(this.currentSessionId)!;
      session.isActive = isActive;
      this.sessions.set(this.currentSessionId, session);
      this.saveSessions();
    }
  }
  
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }
  
  isSessionActive(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session ? session.isActive : false;
  }
}

interface ExerciseProgress {
  completed: boolean
  sets: { completed: boolean; reps: number; weight?: number }[]
  notes?: string
}

const WorkoutTracker: React.FC = () => {
  const { activePlan, trackingWorkout, getTodaysWorkout, completeWorkout, loading: workoutLoading } = useWorkout()
  const { user } = useAuth()
  const [workoutNotes, setWorkoutNotes] = useState('')
  const [workoutRating, setWorkoutRating] = useState(0)
  const [startTime] = useState(new Date())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null)
  
  // Session management
  const sessionManager = useRef(WorkoutSessionManager.getInstance())
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [exerciseProgress, setExerciseProgress] = useState<Record<string, ExerciseProgress>>({})
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false)
  const [loadingWorkoutData, setLoadingWorkoutData] = useState(true)
  const [loadingExerciseGifs, setLoadingExerciseGifs] = useState(false)
  const [completingWorkout, setCompletingWorkout] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSetTracker, setShowSetTracker] = useState(true)
  const [focusedExercise, setFocusedExercise] = useState<string | null>(null)
  const [isResting, setIsResting] = useState(false)
  const [restTimeRemaining, setRestTimeRemaining] = useState(0)
  const [restTotalTime, setRestTotalTime] = useState(60)
  const [celebration, setCelebration] = useState<'set' | 'exercise' | 'workout' | null>(null)
  const [showAudioSettings, setShowAudioSettings] = useState(false)
  const [showGestureGuide, setShowGestureGuide] = useState(false)
  const [showCompactGuide, setShowCompactGuide] = useState(true)
  
  // Ref for imperative celebration control
  const celebrationRef = useRef<CelebrationSystemRef>(null)

  // Stable celebration callback to prevent stale closures
  const handleCelebrationComplete = useCallback(() => {
    console.log('WorkoutTracker: Celebration complete, clearing state')
    setCelebration(null)
  }, [])

  // Emergency celebration reset
  const forceResetCelebration = useCallback(() => {
    console.log('WorkoutTracker: Emergency celebration reset')
    celebrationRef.current?.forceReset()
    setCelebration(null)
  }, [])
  
  // Enhanced audio feedback with voice coaching
  const { 
    playSetComplete, 
    playRestStart, 
    playRestEnd, 
    playWorkoutComplete, 
    playEncouragement,
    speakText 
  } = useAudio()

  // Audio debugging and initialization
  const testAudio = () => {
    // Only allow audio testing in development mode or for admin users
    if (process.env.NODE_ENV !== 'development') {
      console.log('Audio testing disabled in production')
      return
    }
    
    console.log('Testing audio system...')
    try {
      playSetComplete()
      speakText('Audio test - can you hear this?')
      console.log('Audio functions called successfully')
    } catch (error) {
      console.error('Audio test failed:', error)
    }
  }
  
  // Custom encouragement messages
  const playFocus = () => {
    playEncouragement()
    speakText('Focus on this exercise. You\'ve got this!')
  }
  
  // Gesture handlers
  const handleSwipeLeft = () => {
    // Previous exercise
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1)
      speakText('Previous exercise')
      if (currentExerciseRef.current) {
        currentExerciseRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }
  
  const handleSwipeRight = () => {
    // Next exercise
    if (currentExerciseIndex < getTotalExercises() - 1) {
      setCurrentExerciseIndex(prev => prev + 1)
      speakText('Next exercise')
      if (currentExerciseRef.current) {
        currentExerciseRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }
  
  const handleSwipeUp = () => {
    // Complete current set
    const currentExercise = selectedWorkout?.exercises?.[currentExerciseIndex]
    if (currentExercise) {
      const exerciseId = currentExercise.exercise?.id || currentExercise.exercise?.uuid || `exercise-${currentExerciseIndex}`
      const progress = exerciseProgress[exerciseId]
      if (progress) {
        const nextIncompleteSet = progress.sets.findIndex(set => !set.completed)
        if (nextIncompleteSet !== -1) {
          // Use default reps and weight for gesture completion
          const defaultReps = currentExercise.reps || 10
          markSetComplete(exerciseId, nextIncompleteSet, defaultReps)
        }
      }
    }
  }
  
  const handleDoubleTap = () => {
    // Quick set completion or toggle set tracker
    if (!showSetTracker) {
      setShowSetTracker(true)
      speakText('Set tracker opened')
    } else {
      handleSwipeUp() // Complete set if tracker is already open
    }
  }
  
  const handleLongPress = () => {
    // Long press handler - currently unused
    speakText('Long press detected')
  }
  
  // Rest timer effect
  useEffect(() => {
    if (!isResting || restTimeRemaining <= 0) return
    
    const timer = setInterval(() => {
      setRestTimeRemaining(prev => {
        if (prev <= 1) {
          setIsResting(false)
          // Enhanced rest end audio and coaching
          playRestEnd()
          
          // Rest completion handled by audio feedback only (no conflicting toast)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [isResting, restTimeRemaining])
  
  // Refs for smooth scrolling
  const currentExerciseRef = useRef<HTMLDivElement>(null)
  const setTrackerRef = useRef<HTMLDivElement>(null)

  // Timer effect
  useEffect(() => {
    if (!isWorkoutStarted) return
    
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000))
    }, 1000)
    
    return () => clearInterval(timer)
  }, [isWorkoutStarted, startTime])

  // Get workout from trackingWorkout or today's workout
  useEffect(() => {
    const loadWorkout = async () => {
      setLoadingWorkoutData(true)
      
      try {
        if (!selectedWorkout) {
          // First priority: use trackingWorkout if set
          if (trackingWorkout) {
            setSelectedWorkout(trackingWorkout)
            initializeProgress(trackingWorkout)
          }
          // Fallback: get today's workout from active plan
          else if (activePlan) {
            const todaysWorkout = getTodaysWorkout(activePlan)
            if (todaysWorkout) {
              setSelectedWorkout(todaysWorkout)
              initializeProgress(todaysWorkout)
            }
          }
        }
      } catch (error) {
        logger.workout.error('Failed to load workout', error)
        setError(error instanceof Error ? error.message : 'Failed to load workout data')
      } finally {
        setLoadingWorkoutData(false)
      }
    }
    
    loadWorkout()
  }, [activePlan, trackingWorkout, selectedWorkout, getTodaysWorkout])

  const initializeProgress = (workout: any) => {
    const progress: Record<string, ExerciseProgress> = {}
    workout.exercises?.forEach((exercise: any, index: number) => {
      // Handle both nested (exercise.exercise) and flat exercise structures
      const exerciseData = exercise.exercise || exercise
      const exerciseId = exerciseData.id || exerciseData.uuid || `exercise-${index}`
      const sets = exercise.sets || exerciseData.sets || 3
      
      progress[exerciseId] = {
        completed: false,
        sets: Array(sets).fill(null).map(() => ({ completed: false, reps: 0 }))
      }
    })
    setExerciseProgress(progress)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const markSetComplete = (exerciseId: string, setIndex: number, reps: number, weight?: number) => {
    setExerciseProgress(prev => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        sets: prev[exerciseId].sets.map((set, index) => 
          index === setIndex ? { completed: true, reps, weight } : set
        )
      }
    }))
    
    // Enhanced audio feedback with voice coaching
    playSetComplete()
    
    // Check if exercise is complete and start rest timer
    const exercise = selectedWorkout?.exercises?.find((ex: any) => {
      const exerciseData = ex.exercise || ex
      return exerciseData.id === exerciseId || exerciseData.uuid === exerciseId
    })
    
    const updatedProgress = {
      ...exerciseProgress,
      [exerciseId]: {
        ...exerciseProgress[exerciseId],
        sets: exerciseProgress[exerciseId].sets.map((set, index) => 
          index === setIndex ? { completed: true, reps, weight } : set
        )
      }
    }
    
    const completedSets = updatedProgress[exerciseId].sets.filter(set => set.completed).length
    const totalSets = updatedProgress[exerciseId].sets.length
    
    // Start rest timer if not the last set
    if (completedSets < totalSets) {
      const restTime = exercise?.restTime || exercise?.rest || 60
      setRestTotalTime(restTime)
      setRestTimeRemaining(restTime)
      setIsResting(true)
      
      // Dismiss any ongoing celebrations immediately when rest starts
      forceResetCelebration()
      
      // Enhanced rest start audio and coaching
      playRestStart()
      
      // Rest notification handled by audio feedback only (no conflicting toast)
    }
    
    if (completedSets === totalSets) {
      // Exercise complete!
      setTimeout(() => {
        markExerciseComplete(exerciseId)
        playEncouragement()
        setCelebration('exercise')
      }, 500)
    } else {
      // Set complete celebration with voiceover
      console.log('Set complete - triggering celebration and audio...')
      setCelebration('set')
      playSetComplete()
    }
  }

  const markExerciseComplete = (exerciseId: string) => {
    setExerciseProgress(prev => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        completed: true
      }
    }))
    
    // Check if this completes the workout
    const completedCount = Object.values(exerciseProgress).filter(p => p.completed).length + 1
    const totalExercises = getTotalExercises()
    
    if (completedCount === totalExercises) {
      // Workout complete!
      setTimeout(() => {
        playWorkoutComplete()
        setCelebration('workout')
      }, 1000)
    } else {
      // Auto-advance to next exercise after rest period ends
      const currentRestTime = selectedWorkout?.exercises?.[currentExerciseIndex]?.restTime || 
                             selectedWorkout?.exercises?.[currentExerciseIndex]?.rest || 60
      
      setTimeout(() => {
        // Move to next exercise
        if (currentExerciseIndex < getTotalExercises() - 1) {
          setCurrentExerciseIndex(prev => prev + 1)
          console.log('Auto-advanced to next exercise after rest')
        }
      }, currentRestTime * 1000) // Wait for rest period to complete
    }
  }

  const getCompletedExercises = () => {
    return Object.values(exerciseProgress).filter(p => p.completed).length
  }

  const getTotalExercises = () => {
    return selectedWorkout?.exercises?.length || 0
  }

  const validateExerciseData = (exercise: any): { isValid: boolean; issues: string[] } => {
    const issues: string[] = []
    const exerciseData = exercise.exercise || exercise

    if (!exerciseData.name || exerciseData.name.trim() === '') {
      issues.push('Missing exercise name')
    }
    if (!exercise.sets || exercise.sets <= 0) {
      issues.push('Invalid sets count')
    }
    if (!exercise.reps || exercise.reps <= 0) {
      issues.push('Invalid reps count')
    }

    return {
      isValid: issues.length === 0,
      issues
    }
  }

  const handleCompleteWorkout = async () => {
    if (selectedWorkout && activePlan) {
      setCompletingWorkout(true)
      try {
        const workoutDurationMinutes = Math.floor(elapsedTime / 60) // Convert seconds to minutes
        await completeWorkout(
          selectedWorkout.id, 
          Object.values(exerciseProgress), 
          workoutNotes, 
          workoutRating,
          workoutDurationMinutes
        )
        // End workout session
        if (currentSessionId) {
          sessionManager.current.endSession(currentSessionId);
          setCurrentSessionId(null);
          
          logger.workout.info('Workout session ended after completion', {
            operation: 'workout_complete_session',
            component: 'WorkoutTracker',
            metadata: { sessionId: currentSessionId, duration: workoutDurationMinutes }
          });
        }
        
        // Reset state after completion
        forceResetCelebration() // Ensure no celebrations persist after workout completion
        setIsWorkoutStarted(false)
        setCurrentExerciseIndex(0)
        setExerciseProgress({})
        setSessionError(null)
      } catch (error) {
        console.error('Failed to complete workout:', error)
        setError(error instanceof Error ? error.message : 'Failed to save workout. Please try again.')
      } finally {
        setCompletingWorkout(false)
      }
    }
  }

  const handleExerciseReplace = (newExercise: any) => {
    // Replace current exercise with the new one
    const updatedWorkout = { ...selectedWorkout }
    updatedWorkout.exercises[currentExerciseIndex] = {
      ...updatedWorkout.exercises[currentExerciseIndex],
      exercise: newExercise
    }
    
    setSelectedWorkout(updatedWorkout)
  }

  const handleGetAlternatives = (alternatives: any[]) => {
    // Exercise alternatives received - could be used for UI updates
  }

  const getWorkoutFeedback = () => {
    const completed = getCompletedExercises()
    const total = getTotalExercises()
    const completionRate = total > 0 ? (completed / total) * 100 : 0
    
    return {
      completionRate,
      difficultyRating: workoutRating || 3,
      timeToComplete: elapsedTime / 60 // Convert to minutes
    }
  }

  const handleStartWorkout = async () => {
    // Session management - check if workout can be started
    const workoutId = selectedWorkout?.id || 'unknown';
    const userId = user?.id || user?.email || 'anonymous';
    
    const sessionCheck = sessionManager.current.canStartSession(workoutId, userId);
    if (!sessionCheck.canStart) {
      if (sessionCheck.activeSessionId) {
        // Instead of showing error, offer to resume the active session
        toast.success('Resuming your active workout...', { 
          duration: 2000,
          icon: '🔄'
        });
        
        // Set the current session to the existing one and continue
        setCurrentSessionId(sessionCheck.activeSessionId);
        setSessionError(null);
        
        // Continue with workout start (don't return early)
      } else {
        setSessionError(sessionCheck.reason || 'Cannot start workout session');
        toast.error(sessionCheck.reason || 'Cannot start workout session');
        return;
      }
    }
    
    // Start workout session
    try {
      const sessionId = sessionManager.current.startSession(workoutId, userId);
      setCurrentSessionId(sessionId);
      setSessionError(null);
      
      logger.workout.info('Workout session initialized', {
        operation: 'workout_start_session',
        component: 'WorkoutTracker',
        metadata: { sessionId, workoutId, userId }
      });
      
    } catch (error) {
      console.error('Failed to start workout session:', error);
      setSessionError('Failed to initialize workout session');
      return;
    }
    
    setIsWorkoutStarted(true)
    
    // Ensure set tracker is visible for immediate set logging
    setShowSetTracker(true)
    
    // Preload GIFs for workout exercises to improve performance
    if (selectedWorkout?.exercises) {
      setLoadingExerciseGifs(true)
      try {
        logger.workout.debug('Preloading GIFs for workout exercises')
        await preloadWorkoutGifs(selectedWorkout.exercises)
        logger.workout.debug('Finished preloading workout GIFs')
      } catch (error) {
        logger.workout.warn('Failed to preload workout GIFs', error)
      } finally {
        setLoadingExerciseGifs(false)
      }
    }
    
    // Welcome message with set tracking guidance
    toast.success('🚀 Workout started! Set tracker is ready - log your sets as you go!', {
      duration: 4000,
      style: {
        background: '#1f2937',
        color: '#fff',
        border: '1px solid #3b82f6'
      }
    })
    
    // Scroll to top for optimal workout start experience
    setTimeout(() => {
      window.scrollTo({ 
        top: 0, 
        behavior: 'smooth' 
      })
    }, 1000)
  }

  // Show loading screen while loading workout data
  if (loadingWorkoutData || workoutLoading) {
    return (
      <div className="min-h-screen bg-black text-white py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-800 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold mb-4">Loading Workout</h2>
            <p className="text-gray-400 mb-6">
              Preparing your workout plan and exercise data...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show workout selection if no workout selected
  if (!selectedWorkout) {
    return (
      <div className="min-h-screen bg-black text-white py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4">No Workout Selected</h2>
            <p className="text-gray-400 mb-6">
              Go to your Current Plan to select a workout to track.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Pre-workout screen
  if (!isWorkoutStarted) {
    return (
      <div className="min-h-screen bg-black text-white py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Workout Header */}
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl p-8 mb-6">
            <h1 className="text-3xl font-bold mb-2">{selectedWorkout.name}</h1>
            <p className="text-gray-400 mb-6">{selectedWorkout.description}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-black/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">{getTotalExercises()}</div>
                <div className="text-sm text-gray-400">Exercises</div>
              </div>
              <div className="bg-black/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{selectedWorkout.duration || 45}</div>
                <div className="text-sm text-gray-400">Minutes</div>
              </div>
              <div className="bg-black/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">{selectedWorkout.difficulty}</div>
                <div className="text-sm text-gray-400">Difficulty</div>
              </div>
              <div className="bg-black/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-400">~300</div>
                <div className="text-sm text-gray-400">Calories</div>
              </div>
            </div>

            <button
              onClick={handleStartWorkout}
              disabled={loadingExerciseGifs}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl text-lg transition-colors duration-200 flex items-center justify-center gap-3"
            >
              {loadingExerciseGifs ? (
                <>
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Preparing Exercises...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m2-10v18a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2h12a2 2 0 012 2z" />
                  </svg>
                  Start Workout
                </>
              )}
            </button>
          </div>

          {/* Exercise Preview */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4">Today's Exercises</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedWorkout.exercises?.map((workoutEx: any, index: number) => {
                const exercise = workoutEx.exercise || workoutEx
                return (
                  <div key={index} className="bg-black border border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">{exercise.name}</h4>
                    <div className="text-sm text-gray-400">
                      {workoutEx.sets || 3} × {workoutEx.reps || 10} • {workoutEx.restTime || workoutEx.rest || 60}s rest
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Active workout tracking screen
  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Error Banners */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-semibold text-red-300">Error</h4>
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Session Info Banner - Now shows resume option instead of error */}
        {sessionError && (
          <div className="bg-blue-900/50 border border-blue-500 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-semibold text-blue-300">Active Workout Found</h4>
                <p className="text-blue-200 text-sm">{sessionError}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  // Auto-resume the workout instead of making user click
                  handleStartWorkout();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Resume Workout
              </button>
              <button
                onClick={() => setSessionError(null)}
                className="text-blue-400 hover:text-blue-300 transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        {/* Workout Header with Timer */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 sm:p-8 md:p-6 lg:p-4 mb-6 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 break-words">{selectedWorkout.name}</h1>
              <p className="text-blue-100 text-sm sm:text-base lg:text-lg">Exercise {currentExerciseIndex + 1} of {getTotalExercises()}</p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
                <div className="flex items-center gap-1 sm:gap-2 text-blue-200">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-xs sm:text-sm">{selectedWorkout.difficulty}</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 text-blue-200">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  </svg>
                  <span className="text-xs sm:text-sm">~{Math.round((elapsedTime / 60) * 10)} cal</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button 
                onClick={() => setShowSetTracker(!showSetTracker)}
                className={`p-2 sm:p-4 md:p-3 lg:p-2 rounded-lg transition-colors ${
                  showSetTracker ? 'bg-purple-600 text-white shadow-lg' : 'bg-purple-500 hover:bg-purple-400 text-white'
                } min-w-[44px] min-h-[44px] sm:min-w-[48px] sm:min-h-[48px] md:min-w-[44px] md:min-h-[44px]`}
                title={showSetTracker ? "Hide Set Tracker" : "Show Set Tracker"}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showSetTracker ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  )}
                </svg>
              </button>
              <button 
                onClick={() => setShowAudioSettings(!showAudioSettings)}
                className={`p-2 sm:p-4 md:p-3 lg:p-2 rounded-lg transition-colors ${
                  showAudioSettings ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-500 hover:bg-indigo-400 text-white'
                } min-w-[44px] min-h-[44px] sm:min-w-[48px] sm:min-h-[48px] md:min-w-[44px] md:min-h-[44px]`}
                title="Audio & Voice Settings"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M8.586 17.414l7.071-7.071M3 3l3.546 3.546m0 0L20 20M6.546 6.546L20 20" />
                </svg>
              </button>
              <button 
                onClick={() => setShowGestureGuide(true)}
                className="p-2 sm:p-4 md:p-3 lg:p-2 rounded-lg bg-green-500 hover:bg-green-400 text-white transition-colors min-w-[44px] min-h-[44px] sm:min-w-[48px] sm:min-h-[48px] md:min-w-[44px] md:min-h-[44px]"
                title="Gesture Controls Guide"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3.5M9 16.5h6" />
                </svg>
              </button>
              <div className="text-right bg-blue-800/30 rounded-lg p-2 sm:p-6 md:p-4 lg:p-2">
                <div className="text-2xl sm:text-4xl md:text-3xl lg:text-4xl font-mono font-bold">{formatTime(elapsedTime)}</div>
                <div className="text-blue-100 text-xs sm:text-base md:text-sm font-medium">Elapsed Time</div>
              </div>
            </div>
          </div>
          
          {/* Enhanced Progress Display */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-blue-100 mb-4">
              <span className="font-medium">Workout Progress</span>
              <span className="font-bold">{getCompletedExercises()}/{getTotalExercises()} exercises complete</span>
            </div>
            
            {/* Workout Progress Pyramid */}
            <div className="bg-blue-900/30 rounded-xl p-4 mb-4">
              <ProgressPyramid 
                totalSets={getTotalExercises()}
                completedSets={getCompletedExercises()}
                currentSet={Math.min(getCompletedExercises() + 1, getTotalExercises())}
                variant="compact"
                showLabels={false}
              />
            </div>
            
            <div className="flex justify-between text-xs text-blue-200">
              <span>Started: {startTime.toLocaleTimeString()}</span>
              <span>{Math.round((getCompletedExercises() / getTotalExercises()) * 100)}% Complete</span>
            </div>
          </div>
        </div>

        {/* Gesture Guide */}
        <GestureGuide 
          isVisible={showGestureGuide}
          onClose={() => setShowGestureGuide(false)}
        />
        
        {/* Compact Gesture Guide */}
        {showCompactGuide && (
          <GestureGuide 
            isVisible={true}
            onClose={() => setShowCompactGuide(false)}
            isCompact={true}
          />
        )}

        {/* Current Exercise and AI Panel Layout with Gestures */}
        {selectedWorkout.exercises && selectedWorkout.exercises[currentExerciseIndex] && (
          <div ref={currentExerciseRef} className="mb-6">
            <GestureHandler
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              onSwipeUp={handleSwipeUp}
              onDoubleTap={handleDoubleTap}
              onLongPress={handleLongPress}
              className="gesture-workout-area"
            >
              <div className={`flex flex-col lg:flex-row gap-4 lg:gap-6`}>
              {/* Current Exercise */}
              <div className="w-full transition-all duration-300">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg sm:text-xl font-bold">Current Exercise</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentExerciseIndex(Math.max(0, currentExerciseIndex - 1))}
                        disabled={currentExerciseIndex === 0}
                        className="p-2 bg-gray-800 rounded-lg disabled:opacity-50"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setCurrentExerciseIndex(Math.min(getTotalExercises() - 1, currentExerciseIndex + 1))}
                        disabled={currentExerciseIndex === getTotalExercises() - 1}
                        className="p-2 bg-gray-800 rounded-lg disabled:opacity-50"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <ExerciseCardWithApi
                    exercise={selectedWorkout.exercises[currentExerciseIndex]}
                    sets={selectedWorkout.exercises[currentExerciseIndex].sets || 3}
                    reps={selectedWorkout.exercises[currentExerciseIndex].reps || 10}
                    restTime={selectedWorkout.exercises[currentExerciseIndex].restTime || selectedWorkout.exercises[currentExerciseIndex].rest || 60}
                    notes={selectedWorkout.exercises[currentExerciseIndex].notes}
                    showDetails={true}
                    exerciseProgress={exerciseProgress[selectedWorkout.exercises[currentExerciseIndex].exercise?.id || selectedWorkout.exercises[currentExerciseIndex].exercise?.uuid || `exercise-${currentExerciseIndex}`]}
                  />
                  
                  {/* Rest Timer */}
                  {isResting && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="mt-6 bg-blue-900/30 border border-blue-500/30 rounded-xl p-6 text-center"
                    >
                      <h3 className="text-xl font-bold text-blue-400 mb-4">Rest Time</h3>
                      <div className="flex justify-center mb-4">
                        <CircularTimer
                          timeRemaining={restTimeRemaining}
                          totalTime={restTotalTime}
                          isActive={true}
                          size="lg"
                          variant="rest"
                        />
                      </div>
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => setIsResting(false)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Skip Rest
                        </button>
                        <button
                          onClick={() => {
                            setRestTimeRemaining(prev => Math.min(prev + 15, restTotalTime))
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          +15s
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Set Tracker Component */}
                  <AnimatePresence>
                    {showSetTracker && (
                      <motion.div
                        ref={setTrackerRef}
                        initial={{ opacity: 0, y: 20, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -20, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-4"
                      >
                        <div className="relative">
                          {/* Minimize button */}
                          <button
                            onClick={() => setShowSetTracker(false)}
                            className="absolute top-2 right-2 z-10 p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
                            title="Minimize Set Tracker"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          <SetTracker
                            exerciseId={selectedWorkout.exercises[currentExerciseIndex].exercise?.id || selectedWorkout.exercises[currentExerciseIndex].exercise?.uuid || `exercise-${currentExerciseIndex}`}
                            exerciseName={selectedWorkout.exercises[currentExerciseIndex].exercise?.name || selectedWorkout.exercises[currentExerciseIndex].name || 'Exercise'}
                            sets={exerciseProgress[selectedWorkout.exercises[currentExerciseIndex].exercise?.id || selectedWorkout.exercises[currentExerciseIndex].exercise?.uuid || `exercise-${currentExerciseIndex}`]?.sets || []}
                            targetReps={selectedWorkout.exercises[currentExerciseIndex].reps || 10}
                            targetSets={selectedWorkout.exercises[currentExerciseIndex].sets || 3}
                            onSetComplete={(setIndex, reps, weight) => {
                              const exerciseId = selectedWorkout.exercises[currentExerciseIndex].exercise?.id || selectedWorkout.exercises[currentExerciseIndex].exercise?.uuid || `exercise-${currentExerciseIndex}`
                              markSetComplete(exerciseId, setIndex, reps, weight)
                            }}
                            onSetUpdate={(setIndex, reps, weight) => {
                              // Optional: Handle real-time updates without marking complete
                            }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Audio Settings Panel */}
                  <AnimatePresence>
                    {showAudioSettings && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="mt-6 bg-indigo-900/30 border border-indigo-500/30 rounded-xl p-6"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-indigo-400">Audio & Voice Settings</h3>
                          <button
                            onClick={() => setShowAudioSettings(false)}
                            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <AudioSettings />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              </div>
            </GestureHandler>
          </div>
        )}

        {/* All Exercises List */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-white">All Exercises</h3>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Click Focus to jump to exercise • Track Sets for detailed logging</span>
            </div>
          </div>
          <div className="space-y-3">
            {selectedWorkout.exercises?.map((workoutEx: any, index: number) => {
              const exercise = workoutEx.exercise || workoutEx
              const exerciseId = exercise.id || exercise.uuid || `exercise-${index}`
              const progress = exerciseProgress[exerciseId]
              const isCompleted = progress?.completed || false
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`border rounded-lg p-4 transition-all duration-300 ${
                    isCompleted 
                      ? 'border-green-500 bg-green-900/20 shadow-lg' 
                      : index === currentExerciseIndex
                      ? 'border-blue-500 bg-blue-900/20 shadow-md ring-1 ring-blue-500/20'
                      : focusedExercise === exerciseId
                      ? 'border-yellow-400 bg-yellow-900/10 shadow-md'
                      : 'border-gray-700 bg-black/50 hover:bg-black/70'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white flex items-center gap-2 text-base sm:text-lg">
                        {isCompleted && (
                          <motion.svg 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-5 h-5 text-green-400" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </motion.svg>
                        )}
                        {index === currentExerciseIndex && (
                          <motion.div
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="flex items-center"
                          >
                            <svg className="w-4 h-4 text-blue-400 mr-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                          </motion.div>
                        )}
                        {exercise.name}
                      </h4>
                      <div className="mt-2 space-y-1">
                        <p className="text-gray-400 text-sm">
                          {workoutEx.sets || 3} sets × {workoutEx.reps || 10} reps • {workoutEx.restTime || workoutEx.rest || 60}s rest
                        </p>
                        {exerciseProgress[exerciseId] && (
                          <div className="mt-2">
                            <ProgressPyramid 
                              totalSets={workoutEx.sets || 3}
                              completedSets={exerciseProgress[exerciseId].sets.filter(set => set.completed).length}
                              currentSet={Math.min(exerciseProgress[exerciseId].sets.filter(set => set.completed).length + 1, workoutEx.sets || 3)}
                              variant="compact"
                              showLabels={false}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          setCurrentExerciseIndex(index)
                          setFocusedExercise(exerciseId)
                          playFocus()
                          
                          // Auto-clear focus after 3 seconds
                          setTimeout(() => {
                            setFocusedExercise(null)
                          }, 3000)
                          
                          // Scroll to current exercise section
                          if (currentExerciseRef.current) {
                            currentExerciseRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }
                        }}
                        className={`px-2 sm:px-3 py-1 text-white text-xs sm:text-sm rounded transition-colors ${
                          focusedExercise === exerciseId 
                            ? 'bg-yellow-500 hover:bg-yellow-600' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {focusedExercise === exerciseId ? '🎯 Focused' : 'Focus'}
                      </button>
                      {!isCompleted && (
                        <button
                          onClick={() => markExerciseComplete(exerciseId)}
                          className="px-2 sm:px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm rounded transition-colors"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Workout Notes and Rating */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">Workout Feedback</h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-2">
                Notes & Observations
              </label>
              <textarea
                id="notes"
                rows={3}
                className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={workoutNotes}
                onChange={(e) => setWorkoutNotes(e.target.value)}
                placeholder="How did this workout feel? Any notes about form, difficulty, or modifications?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rate Your Workout
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setWorkoutRating(rating)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                      workoutRating >= rating
                        ? 'bg-yellow-500 text-black'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Complete Workout Button */}
        <button
          onClick={handleCompleteWorkout}
          disabled={getCompletedExercises() === 0 || completingWorkout || isResting}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl text-lg transition-colors duration-200 flex items-center justify-center gap-3"
        >
          {completingWorkout ? (
            <>
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving Workout...
            </>
          ) : isResting ? (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v18m9-9H3" />
              </svg>
              Finish Rest to Complete Workout
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Complete Workout ({getCompletedExercises()}/{getTotalExercises()} exercises)
            </>
          )}
        </button>
        
        {/* Enhanced Celebration System */}
        <CelebrationSystem 
          ref={celebrationRef}
          trigger={celebration}
          onComplete={handleCelebrationComplete}
        />
      </div>
    </div>
  )
}

export default WorkoutTracker