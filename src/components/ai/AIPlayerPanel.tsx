// ===================
// AI PLAYER PANEL
// ===================

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AIThinkingIndicator, AIStatusBadge } from './AIThinkingIndicator'
import { AIDecisionHistory } from './AIDecisionDisplay'
import type { AIDecision } from '../../ai/types'
import type { Player } from '../../types/game'

interface AIPlayerPanelProps {
  player: Player
  isCurrentPlayer?: boolean
  isThinking?: boolean
  recentDecision?: AIDecision | null
  decisionHistory?: Array<{ decision: AIDecision; timestamp: number }>
  stats?: {
    decisionsMade: number
    averageDecisionTime: number
    successRate: number
  }
  className?: string
}

/**
 * Enhanced player panel for AI players with thinking indicators and decision history
 */
export function AIPlayerPanel({
  player,
  isCurrentPlayer = false,
  isThinking = false,
  recentDecision,
  decisionHistory = [],
  stats,
  className = '',
}: AIPlayerPanelProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <motion.div
      layout
      className={`
        relative bg-white rounded-lg shadow-sm border-2 transition-all duration-200
        ${isCurrentPlayer ? 'border-blue-400 shadow-lg' : 'border-gray-200'}
        ${className}
      `}
    >
      {/* Current player indicator */}
      {isCurrentPlayer && (
        <motion.div
          layoutId="current-player-indicator"
          className="absolute -top-2 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full"
        >
          Current Turn
        </motion.div>
      )}

      {/* Player header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Player avatar/icon */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
              <span className="text-white text-lg font-bold">
                🤖
              </span>
            </div>

            {/* Player info */}
            <div>
              <h3 className="font-semibold text-gray-900">{player.name}</h3>
              <div className="flex items-center gap-2">
                <AIStatusBadge
                  isAI={player.isAI}
                  difficulty={player.aiDifficulty}
                  isThinking={isThinking}
                />
                <span className="text-sm text-gray-500">
                  ${player.money}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className={`w-5 h-5 transform transition-transform ${showDetails ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Thinking indicator */}
      <AnimatePresence>
        {isThinking && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <AIThinkingIndicator
              isActive={true}
              playerIndex={0} // This would come from props
              playerName={player.name}
              difficulty={player.aiDifficulty}
              className="mx-4 mb-4"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent decision */}
      {recentDecision && !isThinking && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pb-3"
        >
          <div className="text-xs text-gray-500 mb-1">Last Action:</div>
          <div className="p-2 bg-gray-50 rounded text-sm">
            {recentDecision.type === 'card_play' && recentDecision.action === 'play_card' && (
              <span>Played {recentDecision.card?.artist}</span>
            )}
            {recentDecision.type === 'bid' && (
              <span>{recentDecision.action === 'bid' ? `Bid $${recentDecision.amount}` : 'Passed'}</span>
            )}
            {recentDecision.type === 'hidden_bid' && (
              <span>{recentDecision.action === 'bid' ? 'Placed hidden bid' : 'Passed'}</span>
            )}
            {recentDecision.type === 'fixed_price' && (
              <span>{recentDecision.action === 'accept' ? 'Accepted price' : 'Declined'}</span>
            )}
          </div>
        </motion.div>
      )}

      {/* Expandable details */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Stats */}
              {stats && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Performance</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-medium text-gray-900">{stats.decisionsMade}</div>
                      <div className="text-gray-500">Decisions</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-medium text-gray-900">
                        {stats.averageDecisionTime.toFixed(1)}s
                      </div>
                      <div className="text-gray-500">Avg Time</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-medium text-gray-900">
                        {(stats.successRate * 100).toFixed(0)}%
                      </div>
                      <div className="text-gray-500">Success</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Decision history */}
              {decisionHistory.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Actions</h4>
                  <AIDecisionHistory
                    decisions={decisionHistory}
                    playerName={player.name}
                    maxItems={3}
                  />
                </div>
              )}

              {/* AI personality (for hard AI) */}
              {player.aiDifficulty === 'hard' && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">AI Personality</h4>
                  <div className="text-xs text-gray-600">
                    <div className="flex justify-between py-1">
                      <span>Aggressiveness:</span>
                      <span className="font-medium">High</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Risk Tolerance:</span>
                      <span className="font-medium">Medium</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Adaptability:</span>
                      <span className="font-medium">Learning</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}