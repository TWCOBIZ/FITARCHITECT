import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface GestureGuideProps {
  isVisible: boolean
  onClose: () => void
  isCompact?: boolean
}

const GestureGuide: React.FC<GestureGuideProps> = ({ 
  isVisible, 
  onClose, 
  isCompact = false 
}) => {
  const [activeGesture, setActiveGesture] = useState<string | null>(null)

  const gestures = [
    {
      id: 'swipe-left',
      icon: '←',
      title: 'Swipe Left',
      description: 'Previous Exercise',
      keyboard: '← or A',
      demo: 'Swipe left on the exercise area'
    },
    {
      id: 'swipe-right', 
      icon: '→',
      title: 'Swipe Right',
      description: 'Next Exercise',
      keyboard: '→ or D',
      demo: 'Swipe right on the exercise area'
    },
    {
      id: 'swipe-up',
      icon: '↑',
      title: 'Swipe Up',
      description: 'Complete Set',
      keyboard: '↑ or W',
      demo: 'Swipe up to mark current set complete'
    },
    {
      id: 'double-tap',
      icon: '👆',
      title: 'Double Tap',
      description: 'Quick Actions',
      keyboard: 'Space or Enter',
      demo: 'Double tap for quick set completion'
    },
    {
      id: 'long-press',
      icon: '✋',
      title: 'Long Press',
      description: 'Exercise Menu',
      keyboard: 'Hold Shift',
      demo: 'Press and hold for exercise options'
    }
  ]

  if (isCompact) {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-xl p-4 mb-4 shadow-lg"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-blue-400">👋</span>
                Quick Gestures
              </h3>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {gestures.map((gesture) => (
                <motion.div
                  key={gesture.id}
                  className="text-center p-2 bg-black/50 rounded-lg border border-gray-700"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="text-2xl mb-1">{gesture.icon}</div>
                  <div className="text-xs font-medium text-white">{gesture.title}</div>
                  <div className="text-xs text-gray-400">{gesture.description}</div>
                  <div className="text-xs text-blue-400 mt-1">{gesture.keyboard}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <span className="text-blue-400">🎯</span>
                  Gesture Controls Guide
                </h2>
                <p className="text-gray-400 mt-1">Master these gestures for efficient workout navigation</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Gesture Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {gestures.map((gesture, index) => (
                <motion.div
                  key={gesture.id}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    activeGesture === gesture.id 
                      ? 'border-blue-500 bg-blue-900/20 shadow-lg' 
                      : 'border-gray-700 bg-black/50 hover:border-gray-600'
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onHoverStart={() => setActiveGesture(gesture.id)}
                  onHoverEnd={() => setActiveGesture(null)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-center">
                    <motion.div 
                      className="text-4xl mb-3"
                      animate={activeGesture === gesture.id ? {
                        scale: [1, 1.2, 1],
                        rotate: gesture.id === 'swipe-left' ? [-10, 0] : 
                                gesture.id === 'swipe-right' ? [10, 0] :
                                gesture.id === 'swipe-up' ? [0, -10, 0] : 0
                      } : {}}
                      transition={{ duration: 0.5 }}
                    >
                      {gesture.icon}
                    </motion.div>
                    <h3 className="text-lg font-bold text-white mb-2">{gesture.title}</h3>
                    <p className="text-gray-300 mb-3">{gesture.description}</p>
                    
                    {/* Keyboard Shortcut */}
                    <div className="bg-gray-800 rounded-lg p-2 mb-3">
                      <div className="text-xs text-gray-400 mb-1">Keyboard</div>
                      <div className="text-sm font-mono text-blue-400">{gesture.keyboard}</div>
                    </div>
                    
                    {/* Demo Text */}
                    <div className="text-xs text-gray-500">{gesture.demo}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Usage Tips */}
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-4 border border-blue-500/30">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-yellow-400">💡</span>
                Pro Tips
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span className="text-gray-300">Swipe gestures work on the entire exercise area</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span className="text-gray-300">Visual feedback shows gesture progress</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span className="text-gray-300">Keyboard shortcuts work when gesture area is focused</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span className="text-gray-300">Use gestures for hands-free workout navigation</span>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-center mt-6">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
              >
                Got it! Let's workout
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default GestureGuide