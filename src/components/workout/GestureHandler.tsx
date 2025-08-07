import React, { ReactNode } from 'react'
import { useSwipeable } from 'react-swipeable'
import { motion } from 'framer-motion'
import { useHotkeys } from 'react-hotkeys-hook'

interface GestureHandlerProps {
  children: ReactNode
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onDoubleTap?: () => void
  onLongPress?: () => void
  enableKeyboard?: boolean
  swipeThreshold?: number
  className?: string
}

const GestureHandler: React.FC<GestureHandlerProps> = ({
  children,
  onSwipeUp,
  onSwipeDown,
  onSwipeLeft,
  onSwipeRight,
  onDoubleTap,
  onLongPress,
  enableKeyboard = true,
  swipeThreshold = 50,
  className = ""
}) => {
  const [lastTap, setLastTap] = React.useState(0)
  const [longPressTimer, setLongPressTimer] = React.useState<NodeJS.Timeout | null>(null)
  const [isLongPressing, setIsLongPressing] = React.useState(false)
  const [dragState, setDragState] = React.useState({ x: 0, y: 0, isDragging: false })

  // Swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedUp: () => {
      if (onSwipeUp && Math.abs(dragState.y) > swipeThreshold) {
        onSwipeUp()
      }
    },
    onSwipedDown: () => {
      if (onSwipeDown && Math.abs(dragState.y) > swipeThreshold) {
        onSwipeDown()
      }
    },
    onSwipedLeft: () => {
      if (onSwipeLeft && Math.abs(dragState.x) > swipeThreshold) {
        onSwipeLeft()
      }
    },
    onSwipedRight: () => {
      if (onSwipeRight && Math.abs(dragState.x) > swipeThreshold) {
        onSwipeRight()
      }
    },
    onSwiping: (eventData) => {
      setDragState({
        x: eventData.deltaX,
        y: eventData.deltaY,
        isDragging: true
      })
    },
    onSwiped: () => {
      setDragState({ x: 0, y: 0, isDragging: false })
    },
    trackMouse: true,
    trackTouch: true,
    delta: 10,
    preventScrollOnSwipe: true,
    rotationAngle: 0,
  })

  // Keyboard shortcuts
  if (enableKeyboard) {
    useHotkeys('space', () => onDoubleTap?.(), { preventDefault: true })
    useHotkeys('enter', () => onDoubleTap?.(), { preventDefault: true })
    useHotkeys('up', () => onSwipeUp?.(), { preventDefault: true })
    useHotkeys('down', () => onSwipeDown?.(), { preventDefault: true })
    useHotkeys('left', () => onSwipeLeft?.(), { preventDefault: true })
    useHotkeys('right', () => onSwipeRight?.(), { preventDefault: true })
  }

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const currentTime = new Date().getTime()
    const tapLength = currentTime - lastTap

    // Handle double tap
    if (tapLength < 500 && tapLength > 0) {
      onDoubleTap?.()
      setLastTap(0)
    } else {
      setLastTap(currentTime)
    }

    // Handle long press
    if (onLongPress) {
      const timer = setTimeout(() => {
        setIsLongPressing(true)
        onLongPress()
      }, 500)
      setLongPressTimer(timer)
    }
  }

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
    setIsLongPressing(false)
  }

  // Visual feedback for gestures
  const getSwipeIndicator = () => {
    if (!dragState.isDragging) return null

    const { x, y } = dragState
    const threshold = swipeThreshold
    
    let direction = ''
    let progress = 0
    
    if (Math.abs(x) > Math.abs(y)) {
      direction = x > 0 ? 'right' : 'left'
      progress = Math.min(Math.abs(x) / threshold, 1)
    } else {
      direction = y > 0 ? 'down' : 'up'
      progress = Math.min(Math.abs(y) / threshold, 1)
    }

    const arrows = {
      up: '↑',
      down: '↓', 
      left: '←',
      right: '→'
    }

    return (
      <motion.div
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: progress > 0.3 ? 1 : 0 }}
        transition={{ duration: 0.1 }}
      >
        <motion.div
          className={`
            text-4xl font-bold rounded-full w-16 h-16 flex items-center justify-center
            ${progress > 0.7 ? 'bg-green-500 text-white' : 'bg-gray-800/80 text-gray-300'}
          `}
          animate={{
            scale: 0.8 + (progress * 0.4),
            boxShadow: progress > 0.7 ? '0 0 20px rgba(16, 185, 129, 0.5)' : 'none'
          }}
        >
          {arrows[direction as keyof typeof arrows]}
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div
      {...swipeHandlers}
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={(e) => handleTouchStart(e as any)}
      onMouseUp={handleTouchEnd}
      animate={{
        scale: isLongPressing ? 0.98 : 1,
      }}
      transition={{ duration: 0.1 }}
    >
      {children}
      {getSwipeIndicator()}
      
      {/* Long press indicator */}
      {isLongPressing && (
        <motion.div
          className="absolute inset-0 pointer-events-none border-2 border-blue-500 rounded-lg"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ 
            opacity: [0, 1, 0],
            scale: [1.1, 1, 1.1]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </motion.div>
  )
}

export default GestureHandler