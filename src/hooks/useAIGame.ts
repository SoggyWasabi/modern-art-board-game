// ===================
// AI GAME HOOK
// ===================

import { useCallback, useRef, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { createAIGameIntegration, type AIGameIntegration } from '../ai/integration/game-integration'
import type { GameState, GameSetup } from '../types'

/**
 * React hook for managing AI-integrated gameplay
 *
 * This hook:
 * - Manages AI game integration lifecycle
 * - Handles AI turn processing
 * - Connects user actions to game engine
 * - Provides smooth gameplay experience
 */

export function useAIGame() {
  const {
    gameState,
    setPlayerCount,
    updatePlayerSlot,
    startGameFromSetup,
    playCard: storePlayCard,
    placeBid: storePlaceBid,
    passBid: storePassBid,
    submitHiddenBid: storeSubmitHiddenBid,
    setFixedPrice: storeSetFixedPrice,
    buyAtFixedPrice: storeBuyAtFixedPrice,
    passFixedPrice: storePassFixedPrice,
    offerSecondCardForDouble: storeOfferSecondCardForDouble,
    declineSecondCardForDouble: storeDeclineSecondCardForDouble,
    resetGame
  } = useGameStore()

  const integrationRef = useRef<AIGameIntegration | null>(null)
  const processingRef = useRef(false)

  // Initialize AI integration on first use
  useEffect(() => {
    if (!integrationRef.current) {
      integrationRef.current = createAIGameIntegration()
    }

    return () => {
      integrationRef.current?.cleanup()
    }
  }, [])

  // Process AI turns whenever game state changes
  useEffect(() => {
    if (!gameState || processingRef.current || !integrationRef.current) {
      return
    }

    const processAITurns = async () => {
      if (!integrationRef.current) return

      processingRef.current = true
      try {
        const updatedState = await integrationRef.current.updateGameState(gameState)

        // If state changed, update store
        if (updatedState !== gameState) {
          // This would typically be handled by the store's update mechanism
          // For now, we'll rely on the game engine to emit events
        }
      } catch (error) {
        console.error('Error processing AI turns:', error)
      } finally {
        processingRef.current = false
      }
    }

    // Process AI turns after a brief delay to allow UI to update
    const timeoutId = setTimeout(processAITurns, 1000)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [gameState])

  // Enhanced game setup that includes AI initialization
  const startAIGame = useCallback((setup: GameSetup) => {
    if (!integrationRef.current) {
      console.error('AI integration not initialized')
      return
    }

    // Start game with AI integration
    const aiGameState = integrationRef.current.startNewGame(setup)

    // Update store with AI-enhanced game state
    // Note: This would require modifying the store to accept external state
    startGameFromSetup()
  }, [startGameFromSetup])

  // Enhanced card playing that includes AI turn processing
  const playCard = useCallback((cardId: string) => {
    if (!gameState || !integrationRef.current) return

    // Get current player index (human player)
    const currentPlayerIndex = 0

    // Play card through game engine
    // This would integrate with the engine's playCard function
    storePlayCard(cardId)

    // AI turns will be processed automatically by the effect above
  }, [gameState, storePlayCard])

  // Enhanced auction actions
  const placeBid = useCallback((amount: number) => {
    if (!gameState || !integrationRef.current) return

    // Place bid through game engine
    storePlaceBid(amount)

    // AI turns will be processed automatically
  }, [gameState, storePlaceBid])

  const passBid = useCallback(() => {
    if (!gameState || !integrationRef.current) return

    storePassBid()
    // AI turns will be processed automatically
  }, [gameState, storePassBid])

  const submitHiddenBid = useCallback((amount: number) => {
    if (!gameState || !integrationRef.current) return

    storeSubmitHiddenBid(amount)
    // AI turns will be processed automatically
  }, [gameState, storeSubmitHiddenBid])

  const setFixedPrice = useCallback((price: number) => {
    if (!gameState || !integrationRef.current) return

    storeSetFixedPrice(price)
    // AI turns will be processed automatically
  }, [gameState, storeSetFixedPrice])

  const buyAtFixedPrice = useCallback(() => {
    if (!gameState || !integrationRef.current) return

    storeBuyAtFixedPrice()
    // AI turns will be processed automatically
  }, [gameState, storeBuyAtFixedPrice])

  const passFixedPrice = useCallback(() => {
    if (!gameState || !integrationRef.current) return

    storePassFixedPrice()
    // AI turns will be processed automatically
  }, [gameState, storePassFixedPrice])

  // Check if it's currently AI turn
  const isAITurn = gameState && integrationRef.current
    ? integrationRef.current.isAITurn(gameState)
    : false

  // Get AI players info
  const getAIPlayers = useCallback(() => {
    if (!gameState || !integrationRef.current) return []
    return integrationRef.current.getAllAIPlayers(gameState)
  }, [gameState])

  // Get AI reasoning for current action
  const getAIReasoning = useCallback((playerIndex: number) => {
    if (!gameState || !integrationRef.current) return null
    const aiPlayer = integrationRef.current.getAIPlayer(gameState, playerIndex)
    return aiPlayer?.getLastDecision() || null
  }, [gameState])

  return {
    // Current state
    gameState,
    isAITurn,
    isProcessingAITurn: processingRef.current,

    // Setup actions
    setPlayerCount,
    updatePlayerSlot,
    startAIGame,

    // Game actions (enhanced with AI integration)
    playCard,
    placeBid,
    passBid,
    submitHiddenBid,
    setFixedPrice,
    buyAtFixedPrice,
    passFixedPrice,
    offerSecondCardForDouble,
    declineSecondCardForDouble,

    // AI utilities
    getAIPlayers,
    getAIReasoning,

    // Cleanup
    resetGame
  }
}