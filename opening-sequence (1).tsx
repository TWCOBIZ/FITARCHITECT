"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

export default function OpeningSequence() {
  const [stage, setStage] = useState(1)
  const [showLogo, setShowLogo] = useState(true)
  const [showBackground, setShowBackground] = useState(false)
  const [showTitle, setShowTitle] = useState(false)
  const [showTagline, setShowTagline] = useState(false)
  const [showButtons, setShowButtons] = useState(false)

  // Control animation flow
  useEffect(() => {
    // Stage 1: Show logo for 2 seconds, then fade out
    const logoTimer = setTimeout(() => {
      setShowLogo(false)

      // After logo fades out, move to stage 2
      setTimeout(() => {
        setStage(2)
        setShowBackground(true)

        // Stage 2: Show background for 3 seconds, then show text
        setTimeout(() => {
          setStage(3)
          setShowTitle(true)

          // After title appears, show tagline
          setTimeout(() => {
            setShowTagline(true)

            // After tagline appears, show buttons
            setTimeout(() => {
              setStage(4)
              setShowButtons(true)
            }, 1000)
          }, 1000)
        }, 3000)
      }, 500) // Allow time for logo fade out
    }, 2000)

    return () => clearTimeout(logoTimer)
  }, [])

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      {/* Stage 1: Logo on black background */}
      <AnimatePresence mode="wait">
        {stage === 1 && (
          <motion.div
            className="absolute inset-0 bg-black flex items-center justify-center z-30"
            initial={{ opacity: 1 }}
            animate={{ opacity: showLogo ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-64 h-64 relative"
            >
              <Image src="/logo.png" alt="Fit Architect Logo" fill className="object-contain" priority />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage 2: Background Image */}
      <AnimatePresence mode="wait">
        {stage >= 2 && (
          <motion.div
            className="absolute inset-0 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: showBackground ? 1 : 0 }}
            transition={{ duration: 1 }}
          >
            <Image src="/background.jpg" alt="Fit Architect Background" fill className="object-cover" priority />
            {/* Overlay to ensure text is readable */}
            <div className="absolute inset-0 bg-black/30" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage 3: Text Animations */}
      <AnimatePresence>
        {stage >= 3 && (
          <div className="absolute inset-0 flex flex-col items-center z-20 pt-24 md:pt-32">
            {/* Main Title */}
            <motion.h1
              className="text-white text-5xl md:text-7xl font-bold tracking-wider mb-2"
              initial={{ opacity: 0, y: 100 }}
              animate={{
                opacity: showTitle ? 1 : 0,
                y: showTitle ? 0 : 100,
              }}
              transition={{
                duration: 0.8,
                ease: "easeOut",
              }}
            >
              FIT ARCHITECT
            </motion.h1>

            {/* Tagline */}
            <motion.p
              className="text-gray-300 text-xl md:text-2xl font-medium tracking-wide"
              initial={{ opacity: 0 }}
              animate={{ opacity: showTagline ? 1 : 0 }}
              transition={{ duration: 0.8 }}
            >
              DISCIPLINE IS THE BLUEPRINT
            </motion.p>
          </div>
        )}
      </AnimatePresence>

      {/* Stage 4: Buttons */}
      <AnimatePresence>
        {stage >= 4 && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center pt-40 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: showButtons ? 1 : 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col gap-4 mt-16">
              {["START YOUR JOURNEY", "LOGIN", "CONTINUE AS GUEST"].map((text, index) => (
                <motion.button
                  key={index}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/30 rounded-md py-3 px-8 min-w-[240px] backdrop-blur-sm transition-colors"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.3 * index,
                    ease: "easeOut",
                  }}
                >
                  {text}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
