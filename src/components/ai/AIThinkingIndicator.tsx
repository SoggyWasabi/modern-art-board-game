// ===================
// AI THINKING INDICATOR
// ===================

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AIThinkingIndicatorProps {
  isActive: boolean
  playerIndex: number
  playerName: string
  difficulty?: 'easy' | 'medium' | 'hard'
  className?: string
}

/**
 * Shows AI thinking animation and status
 */
export function AIThinkingIndicator({
  isActive,
  playerIndex,
  playerName,
  difficulty,
  className = '',
}: AIThinkingIndicatorProps) {
  const [thinkingPhase, setThinkingPhase] = useState<'analyzing' | 'computing' | 'deciding'>('analyzing')
  const [dots, setDots] = useState(0)

  // Animate thinking phases
  useEffect(() => {
    if (!isActive) {
      setThinkingPhase('analyzing')
      setDots(0)
      return
    }

    const phaseInterval = setInterval(() => {
      setThinkingPhase(prev => {
        switch (prev) {
          case 'analyzing':
            return 'computing'
          case 'computing':
            return 'deciding'
          case 'deciding':
            return 'analyzing'
          default:
            return 'analyzing'
        }
      })
    }, 1500)

    const dotsInterval = setInterval(() => {
      setDots(prev => (prev + 1) % 4)
    }, 500)

    return () => {
      clearInterval(phaseInterval)
      clearInterval(dotsInterval)
    }
  }, [isActive])

  const getPhaseText = () => {
    switch (thinkingPhase) {
      case 'analyzing':
        return 'Analyzing'
      case 'computing':
        return 'Computing'
      case 'deciding':
        return 'Making Decision'
    }
  }

  const getDifficultyColor = () => {
    switch (difficulty) {
      case 'easy':
        return 'from-green-400 to-green-600'
      case 'medium':
        return 'from-blue-400 to-blue-600'
      case 'hard':
        return 'from-purple-400 to-purple-600'
      default:
        return 'from-gray-400 to-gray-600'
    }
  }

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`
            flex items-center gap-3 px-4 py-2 bg-gradient-to-r ${getDifficultyColor()}
            bg-opacity-10 rounded-lg border border-opacity-20 border-gray-300
            ${className}
          `}
        >
          {/* Pulsing AI icon */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-600 to-gray-800 flex items-center justify-center"
          >
            <span className="text-white text-sm font-bold">AI</span>
          </motion.div>

          {/* Thinking text */}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-800">
              {playerName}
            </span>
            <span className="text-xs text-gray-600">
              {getPhaseText()}{Array(dots + 1).fill('.').join('')}
            </span>
          </div>

          {/* Progress indicator based on difficulty */}
          <div className="flex-1 max-w-24">
            <div className="h-1 bg-gray-300 rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${getDifficultyColor()}`}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{
                  duration: difficulty === 'hard' ? 4 : difficulty === 'medium' ? 2.5 : 1.5,
                  ease: 'linear',
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Simple AI status badge
 */
export function AIStatusBadge({
  isAI,
  difficulty,
  isThinking = false,
}: {
  isAI: boolean
  difficulty?: 'easy' | 'medium' | 'hard'
  isThinking?: boolean
}) {
  if (!isAI) return null

  const getBadgeColor = () => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'hard':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border
        ${getBadgeColor()}
        ${isThinking ? 'animate-pulse' : ''}
      `}
    >
      <span className="text-xs">🤖</span>
      {difficulty && <span className="capitalize">{difficulty}</span>}
      {isThinking && <span className="text-xs">⚡</span>}
    </div>
  )
}