import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Exercise } from '../../types/workout'
import { wgerService, WgerExercise } from '../../services/wgerService'

interface ExerciseDetailsProps {
  exercise: Exercise
  onClose: () => void
}

const ExerciseDetails: React.FC<ExerciseDetailsProps> = ({ exercise, onClose }) => {
  const [wgerExercise, setWgerExercise] = useState<WgerExercise | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'instructions' | 'video' | 'tips'>('instructions')

  useEffect(() => {
    const fetchWgerDetails = async () => {
      try {
        const exercises = await wgerService.fetchExercises({})
        if (exercises.length > 0) {
          setWgerExercise(exercises[0] as WgerExercise)
        }
      } catch (error) {
        console.error('Error fetching exercise details:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchWgerDetails()
  }, [exercise.name])

  const renderInstructions = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Form Instructions</h3>
      <div className="prose prose-sm max-w-none">
        {exercise.instructions.map((instruction, index) => (
          <div key={index} className="flex items-start space-x-3 mb-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
              {index + 1}
            </span>
            <p className="text-gray-700">{instruction}</p>
          </div>
        ))}
      </div>
    </div>
  )

  const renderVideo = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Video Demonstration</h3>
      {exercise.videoUrl ? (
        <div className="aspect-w-16 aspect-h-9">
          <iframe
            src={exercise.videoUrl}
            title={`${exercise.name} demonstration`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="rounded-lg"
          />
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No video demonstration available</p>
        </div>
      )}
    </div>
  )

  const renderTips = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Exercise Tips</h3>
      <div className="space-y-3">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">Common Mistakes</h4>
          <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
            <li>Using momentum instead of controlled movements</li>
            <li>Not maintaining proper form throughout the exercise</li>
            <li>Breathing incorrectly during the movement</li>
          </ul>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">Pro Tips</h4>
          <ul className="list-disc list-inside text-sm text-green-700 space-y-1">
            <li>Focus on mind-muscle connection</li>
            <li>Keep core engaged throughout the movement</li>
            <li>Maintain proper breathing rhythm</li>
          </ul>
        </div>
        {wgerExercise?.comments?.length > 0 && (
          <div className="p-4 bg-purple-50 rounded-lg">
            <h4 className="font-medium text-purple-800 mb-2">Community Tips</h4>
            <ul className="list-disc list-inside text-sm text-purple-700 space-y-1">
              {wgerExercise.comments.map((comment, index: number) => (
                <li key={index}>{comment.comment}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="min-h-screen px-4 text-center">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

        <div className="inline-block w-full max-w-4xl p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold">{exercise.name}</h2>
              <p className="text-gray-600">{exercise.description}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab('instructions')}
              className={`px-4 py-2 rounded-lg ${
                activeTab === 'instructions'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Instructions
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`px-4 py-2 rounded-lg ${
                activeTab === 'video'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Video
            </button>
            <button
              onClick={() => setActiveTab('tips')}
              className={`px-4 py-2 rounded-lg ${
                activeTab === 'tips'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tips
            </button>
          </div>

          <div className="mt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'instructions' && renderInstructions()}
                {activeTab === 'video' && renderVideo()}
                {activeTab === 'tips' && renderTips()}
              </motion.div>
            </AnimatePresence>
          </div>

          {wgerExercise?.images?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Exercise Images</h3>
              <div className="grid grid-cols-2 gap-4">
                {wgerExercise.images.map((image) => (
                  <img
                    key={image.id}
                    src={image.image}
                    alt={`${exercise.name} demonstration`}
                    className="rounded-lg w-full h-48 object-cover"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default ExerciseDetails 