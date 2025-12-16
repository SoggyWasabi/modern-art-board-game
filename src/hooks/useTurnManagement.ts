import { useEffect, useState, useCallback } from 'react'
import { useGameStore } from '../store/gameStore'
import { getGameController } from '../integration/gameIntegration'
import type { TurnIndicator, GameEvent } from '../integration/gameIntegration'

/**
 * Hook for managing turn state and providing UI feedback
 */
export function useTurnManagement() {
  const { gameState } = useGameStore()
  const [turnIndicator, setTurnIndicator] = useState<TurnIndicator | null>(null)
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([])

  // Initialize game controller and event listeners
  useEffect(() => {
    const controller = getGameController()
    const eventManager = controller.getEventManager()

    // Subscribe to relevant game events
    const unsubscribeFromEvents: Array<() => void> = []

    // Listen for turn changes
    unsubscribeFromEvents.push(
      eventManager.subscribe('turn_changed', (event: GameEvent) => {
        console.log('Turn changed:', event)
        setGameEvents(prev => [...prev.slice(-9), event]) // Keep last 10 events
      })
    )

    // Listen for AI thinking states
    unsubscribeFromEvents.push(
      eventManager.subscribe('ai_thinking_started', (event: GameEvent) => {
        console.log('AI started thinking:', event)
        setIsAIThinking(true)
        setGameEvents(prev => [...prev.slice(-9), event])
      })
    )

    unsubscribeFromEvents.push(
      eventManager.subscribe('ai_thinking_finished', (event: GameEvent) => {
        console.log('AI finished thinking:', event)
        setIsAIThinking(false)
        setGameEvents(prev => [...prev.slice(-9), event])
      })
    )

    // Listen for phase changes
    unsubscribeFromEvents.push(
      eventManager.subscribe('phase_changed', (event: GameEvent) => {
        console.log('Phase changed:', event)
        setGameEvents(prev => [...prev.slice(-9), event])
      })
    )

    // Cleanup on unmount
    return () => {
      unsubscribeFromEvents.forEach(unsubscribe => unsubscribe())
    }
  }, [])

  // Update turn indicator when game state changes
  useEffect(() => {
    if (!gameState) {
      setTurnIndicator(null)
      return
    }

    const controller = getGameController()
    const indicator = controller.getTurnIndicator(gameState)
    setTurnIndicator(indicator)
  }, [gameState])

  // Check if it's the current player's turn
  const isPlayerTurn = useCallback(() => {
    return turnIndicator?.type === 'user_turn'
  }, [turnIndicator])

  // Get allowed actions for current player
  const getAllowedActions = useCallback(() => {
    return turnIndicator?.actionsAllowed || []
  }, [turnIndicator])

  // Get message to display to user
  const getTurnMessage = useCallback(() => {
    if (!turnIndicator || !gameState) return ''

    const { type, playerIndex } = turnIndicator
    const playerName = playerIndex !== undefined
      ? gameState.players[playerIndex]?.name
      : ''

    switch (type) {
      case 'user_turn':
        return "It's your turn!"
      case 'ai_thinking':
        return `${playerName} is thinking...`
      case 'transition':
        return 'Processing...'
      default:
        return ''
    }
  }, [turnIndicator, gameState])

  return {
    turnIndicator,
    isPlayerTurn: isPlayerTurn(),
    isAIThinking,
    allowedActions: getAllowedActions(),
    turnMessage: getTurnMessage(),
    gameEvents
  }
}