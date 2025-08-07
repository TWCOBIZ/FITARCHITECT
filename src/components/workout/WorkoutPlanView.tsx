import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import { WorkoutPlan } from '../../types/workout'
import { workoutService } from '../../services/workoutService'
import { UserProfile } from '../../types/user'
import ConfirmationModal from '../common/ConfirmationModal'
import ActionButton from '../common/ActionButton'

interface WorkoutPlanViewProps {
  userProfile: UserProfile
}

const WorkoutPlanView: React.FC<WorkoutPlanViewProps> = ({ userProfile }) => {
  const [currentPlan, setCurrentPlan] = useState<WorkoutPlan | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null)
  const [workoutNotes, setWorkoutNotes] = useState('')
  const [workoutRating, setWorkoutRating] = useState(0)
  const [showTips, setShowTips] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState(0)
  const [selectedDay, setSelectedDay] = useState(0)
  const [showEndPlanModal, setShowEndPlanModal] = useState(false)
  const [isEndingPlan, setIsEndingPlan] = useState(false)

  useEffect(() => {
    const plan = workoutService.getCurrentPlan()
    setCurrentPlan(plan)
  }, [])

  const handleGeneratePlan = async () => {
    setIsGenerating(true)
    try {
      const plan = await workoutService.generateWorkoutPlan(userProfile)
      setCurrentPlan(plan)
    } catch (error) {
      console.error('Error generating plan:', error)
      toast.error('Failed to generate workout plan. Please check your connection and try again.', {
        duration: 4000
      })
    }
    setIsGenerating(false)
  }

  const handleEndPlanClick = () => {
    setShowEndPlanModal(true)
  }

  const handleEndPlanConfirm = async () => {
    setIsEndingPlan(true)
    try {
      workoutService.endCurrentPlan()
      setCurrentPlan(null)
      toast.success('Workout plan ended successfully', {
        duration: 3000
      })
      
      // Auto-dismiss modal after 3 seconds
      setTimeout(() => {
        setShowEndPlanModal(false)
      }, 3000)
      
    } catch (error) {
      toast.error('Failed to end workout plan', {
        duration: 4000
      })
    } finally {
      setIsEndingPlan(false)
    }
  }

  const handleEndPlanCancel = () => {
    setShowEndPlanModal(false)
  }

  const handleCompleteWorkout = (weekNumber: number, dayNumber: number) => {
    const week = currentPlan?.weeks?.find(w => w.weekNumber === weekNumber)
    const day = week?.days?.find(d => d.dayNumber === dayNumber)
    if (!day || !day.exercises) return

    const exercises = day.exercises.map(ex => ({
      exerciseId: ex.exercise.id,
      sets: Array.from({ length: ex.sets }, () => ({
        reps: ex.reps,
        weight: ex.weight || 0,
        completed: true
      }))
    }))

    const workoutId = `week${weekNumber}-day${dayNumber}`
    workoutService.logWorkout(workoutId, exercises, workoutNotes)
    setWorkoutNotes('')
    setWorkoutRating(0)
    setSelectedWorkout(null)
  }

  const renderWorkoutTips = (workoutId: string) => {
    const tips = workoutService.getWorkoutTips(workoutId)
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 p-4 bg-blue-50 rounded-lg"
      >
        <h3 className="text-lg font-semibold mb-2">Workout Tips</h3>
        <ul className="space-y-2">
          {tips.map((tip, index) => (
            <li key={index} className="text-sm text-gray-700">{tip}</li>
          ))}
        </ul>
      </motion.div>
    )
  }

  if (!currentPlan) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">Your Workout Plan</h2>
        <div className="text-center py-12">
          <p className="text-gray-600 mb-6">You don't have an active workout plan.</p>
          <ActionButton
            onClick={handleGeneratePlan}
            isLoading={isGenerating}
            disabled={isGenerating}
            variant="primary"
            size="lg"
            loadingText="Generating Plan..."
          >
            Generate New Workout Plan
          </ActionButton>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Your Workout Plan</h2>
        <button
          onClick={handleEndPlanClick}
          className="px-4 py-2 text-red-600 hover:text-red-700"
        >
          End Plan
        </button>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">{currentPlan.name}</h3>
        <p className="text-gray-600">{currentPlan.description}</p>
      </div>

      {!currentPlan.weeks || currentPlan.weeks.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Plan Structure Not Available</h3>
          <p className="text-yellow-700 mb-4">This workout plan was created with an older format. Please generate a new plan to access the full weekly structure.</p>
          <ActionButton
            onClick={handleGeneratePlan}
            isLoading={isGenerating}
            disabled={isGenerating}
            variant="primary"
            size="sm"
            loadingText="Generating..."
          >
            Generate New Plan
          </ActionButton>
        </div>
      ) : (
        <>
      {currentPlan.weeks && currentPlan.weeks?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {currentPlan.weeks.map((week, i) => (
            <button
              key={i}
              className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm ${selectedWeek === i ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setSelectedWeek(i)}
            >
              Week {week.weekNumber}
            </button>
          ))}
        </div>
      )}

      {currentPlan.weeks && currentPlan.weeks[selectedWeek] && (
        <div className="mb-6">
          <h4 className="font-semibold mb-2">Week {currentPlan.weeks[selectedWeek].weekNumber}</h4>
          <p className="text-gray-600 mb-4">Weekly workout schedule</p>
          
          {/* Day selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            {currentPlan.weeks[selectedWeek].days?.map((day, dayIdx) => (
              <button
                key={dayIdx}
                className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm ${selectedDay === dayIdx ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setSelectedDay(dayIdx)}
              >
                {day.name || `Day ${day.dayNumber}`}
              </button>
            ))}
          </div>
          
          {/* Current day's exercises */}
          {currentPlan.weeks[selectedWeek].days?.[selectedDay] && (
            <div>
              <h5 className="font-medium mb-3">{currentPlan.weeks[selectedWeek].days[selectedDay].name}</h5>
              <p className="text-gray-600 mb-4">{currentPlan.weeks[selectedWeek].days[selectedDay].description}</p>
              {currentPlan.weeks[selectedWeek].days[selectedDay].exercises?.map((workoutExercise, idx) => (
                <div key={idx} className="mb-4 p-4 border border-gray-200 rounded">
                  <h6 className="font-medium">{workoutExercise.exercise.name}</h6>
                  <p className="text-sm text-gray-600">{workoutExercise.sets} sets × {workoutExercise.reps} reps</p>
                  <p className="text-sm text-gray-600">Rest: {workoutExercise.restTime} seconds</p>
                  {workoutExercise.weight && <p className="text-sm text-gray-600">Weight: {workoutExercise.weight} lbs</p>}
                  {workoutExercise.notes && <p className="text-sm text-gray-500">{workoutExercise.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {currentPlan.weeks?.flatMap(week => 
          week.days?.filter(day => day.exercises && day.exercises.length > 0) || []
        ).map((day, index) => (
          <motion.div
            key={`${day.dayNumber}-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border rounded-lg p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-lg font-semibold">{day.name}</h4>
                <p className="text-sm text-gray-600">{day.description}</p>
              </div>
              <button
                onClick={() => setShowTips(!showTips)}
                className="text-blue-600 hover:text-blue-700"
              >
                {showTips ? 'Hide Tips' : 'Show Tips'}
              </button>
            </div>

            {showTips && renderWorkoutTips(`day-${day.dayNumber}`)}

            <div className="mt-4">
              <h5 className="font-medium mb-2">Exercises:</h5>
              <ul className="space-y-3">
                {day.exercises?.map(exercise => (
                  <li key={exercise.exercise.id} className="text-sm">
                    <span className="font-medium">{exercise.exercise.name}</span>
                    <span className="text-gray-600">
                      {' '}- {exercise.sets} sets × {exercise.reps} reps
                    </span>
                  </li>
                )) || []}
              </ul>
            </div>

            {selectedWorkout === `day-${day.dayNumber}` ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 space-y-4"
              >
                <textarea
                  value={workoutNotes}
                  onChange={e => setWorkoutNotes(e.target.value)}
                  placeholder="Add notes about your workout..."
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                />
                <div className="flex items-center space-x-2">
                  <span className="text-sm">Rate your workout:</span>
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => setWorkoutRating(rating)}
                      className={`w-8 h-8 rounded-full ${
                        workoutRating >= rating ? 'bg-yellow-400' : 'bg-gray-200'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setSelectedWorkout(null)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const week = currentPlan?.weeks?.find(w => w.days?.some(d => d.dayNumber === day.dayNumber))
                      if (week) handleCompleteWorkout(week.weekNumber, day.dayNumber)
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Complete Workout
                  </button>
                </div>
              </motion.div>
            ) : (
              <button
                onClick={() => setSelectedWorkout(`day-${day.dayNumber}`)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Start Workout
              </button>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Your Progress</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Completed Workouts</p>
            <p className="text-2xl font-bold">
              {workoutService.getProgress().completedWorkouts} / {workoutService.getProgress().totalWorkouts}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Current Streak</p>
            <p className="text-2xl font-bold">{workoutService.getProgress().streak} days</p>
          </div>
        </div>
      </div>
        </>
      )}

      {/* End Plan Confirmation Modal */}
      <ConfirmationModal
        isOpen={showEndPlanModal}
        onClose={handleEndPlanCancel}
        onConfirm={handleEndPlanConfirm}
        title="End Workout Plan"
        message="Are you sure you want to end this workout plan? Your progress will be saved, but you'll need to generate a new plan to continue."
        confirmText="End Plan"
        cancelText="Keep Plan"
        type="warning"
        isLoading={isEndingPlan}
      />
    </div>
  )
}

export default WorkoutPlanView 