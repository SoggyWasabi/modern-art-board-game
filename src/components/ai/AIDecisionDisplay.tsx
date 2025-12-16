// ===================
// AI DECISION DISPLAY
// ===================

import React from 'react'
import { motion } from 'framer-motion'
import type { AIDecision } from '../../ai/types'

interface AIDecisionDisplayProps {
  decision: AIDecision | null
  playerName: string
  isRevealed?: boolean
  className?: string
}

/**
 * Displays AI decision with animated reveal
 */
export function AIDecisionDisplay({
  decision,
  playerName,
  isRevealed = false,
  className = '',
}: AIDecisionDisplayProps) {
  if (!decision) {
    return (
      <div className={`flex items-center gap-2 text-gray-500 ${className}`}>
        <span className="text-sm">No decision</span>
      </div>
    )
  }

  const getDecisionIcon = () => {
    switch (decision.type) {
      case 'card_play':
        return '🎴'
      case 'bid':
        return '💰'
      case 'hidden_bid':
        return '🕵️'
      case 'buy':
        return '🛒'
      case 'fixed_price':
        return '🏷️'
      default:
        return '❓'
    }
  }

  const getDecisionText = () => {
    if (!isRevealed && (decision.type === 'hidden_bid' || decision.type === 'bid')) {
      return 'Thinking...'
    }

    switch (decision.type) {
      case 'card_play':
        return decision.action === 'play_card'
          ? `Playing ${decision.card?.artist || 'a card'}`
          : 'Not playing'

      case 'bid':
        return decision.action === 'bid'
          ? `Bidding $${decision.amount}`
          : 'Passing'

      case 'hidden_bid':
        return decision.action === 'bid'
          ? isRevealed ? `Bid $${decision.amount}` : 'Placed bid'
          : 'Passed'

      case 'buy':
        return decision.action === 'buy'
          ? `Buying for $${decision.amount}`
          : 'Not buying'

      case 'fixed_price':
        return decision.action === 'accept'
          ? `Buying for $${decision.amount}`
          : 'Declining'

      default:
        return 'Making decision'
    }
  }

  const getDecisionColor = () => {
    if (!isRevealed && (decision.type === 'hidden_bid')) {
      return 'text-gray-600 bg-gray-100'
    }

    switch (decision.action) {
      case 'bid':
      case 'buy':
      case 'accept':
      case 'play_card':
        return 'text-green-700 bg-green-100'
      case 'pass':
      case 'decline':
        return 'text-orange-700 bg-orange-100'
      default:
        return 'text-blue-700 bg-blue-100'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        flex items-center gap-3 p-3 rounded-lg border border-gray-200
        ${className}
      `}
    >
      {/* Player name */}
      <span className="text-sm font-medium text-gray-700">{playerName}</span>

      {/* Decision icon */}
      <motion.div
        animate={{
          rotate: [0, 10, -10, 0],
        }}
        transition={{
          duration: 0.5,
          repeat: isRevealed ? 0 : Infinity,
          repeatDelay: 2,
        }}
        className="text-2xl"
      >
        {getDecisionIcon()}
      </motion.div>

      {/* Decision text */}
      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getDecisionColor()}`}>
        {getDecisionText()}
      </div>

      {/* Confidence indicator for revealed decisions */}
      {isRevealed && 'confidence' in decision && (
        <div className="ml-auto flex items-center gap-1">
          <span className="text-xs text-gray-500">Confidence:</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={`w-2 h-2 rounded-full ${
                  level <= (decision.confidence || 0) * 5
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

/**
 * Shows AI decision history/recent actions
 */
export function AIDecisionHistory({
  decisions,
  playerName,
  maxItems = 5,
}: {
  decisions: Array<{ decision: AIDecision; timestamp: number }>
  playerName: string
  maxItems?: number
}) {
  if (decisions.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        <span className="text-sm">No decisions yet</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {decisions.slice(-maxItems).reverse().map((item, index) => (
        <motion.div
          key={`${item.timestamp}-${index}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <AIDecisionDisplay
            decision={item.decision}
            playerName={playerName}
            isRevealed={true}
            className="text-sm"
          />
        </motion.div>
      ))}
    </div>
  )
}