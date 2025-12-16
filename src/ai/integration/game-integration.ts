// ===================
// AI GAME INTEGRATION
// ===================

import type { GameState, Player, Card, AuctionState } from '../../types/game'
import type { GameSetup } from '../../types/setup'
import { AIManager, type AIPlayer } from '../ai-manager'
import { startGame, playCard, nextRound, checkRoundEnd, checkEarlyGameEnd } from '../../engine/game'
import {
  startRound as startRoundEngine,
  canPlayerPlayCard,
  getCurrentPlayer,
  isRoundInAuction,
  getCurrentAuction
} from '../../engine/round'
import { createOpenAuction } from '../../engine/auction/open'
import { createFixedPriceAuction } from '../../engine/auction/fixedPrice'
import { createSealedBidAuction } from '../../engine/auction/hidden'
import { createOneOfferAuction } from '../../engine/auction/oneOffer'
import { createDoubleAuction } from '../../engine/auction/double'
import { endRound } from '../../engine/round'

/**
 * AI Game Integration - Connects AI system to game engine
 *
 * This layer:
 * - Initializes AI players when game starts
 * - Handles AI turn-taking automatically
 * - Connects AI decisions to game engine actions
 * - Manages the game flow between human and AI players
 */

export interface AIGameIntegration {
  // Game management
  startNewGame(setup: GameSetup): GameState
  updateGameState(gameState: GameState): Promise<GameState>

  // Turn management
  processAITurns(gameState: GameState): Promise<GameState>
  isAITurn(gameState: GameState): boolean

  // AI utilities
  getAIPlayer(gameState: GameState, playerIndex: number): AIPlayer | null
  getAllAIPlayers(gameState: GameState): AIPlayer[]

  // Cleanup
  cleanup(): void
}

export function createAIGameIntegration(): AIGameIntegration {
  const aiManager = new AIManager()
  const activeAIs = new Map<string, AIPlayer>()

  /**
   * Start a new game with AI players initialized
   */
  function startNewGame(setup: GameSetup): GameState {
    // Start the game using engine
    const gameState = startGame(setup)

    // Initialize AI players
    setup.players.forEach((playerConfig, index) => {
      if (playerConfig.type === 'ai') {
        const aiPlayer = aiManager.registerAI(
          playerConfig.id,
          playerConfig.aiDifficulty || 'medium'
        )
        activeAIs.set(playerConfig.id, aiPlayer)

        // Initialize AI with game state
        aiPlayer.initialize(gameState, index)
      }
    })

    return gameState
  }

  /**
   * Update game state and process AI turns if needed
   */
  async function updateGameState(gameState: GameState): Promise<GameState> {
    let updatedState = gameState

    // Check for round end conditions
    updatedState = checkRoundEnd(updatedState)
    updatedState = checkEarlyGameEnd(updatedState)

    // Process AI turns if it's not human turn
    if (isAITurn(updatedState)) {
      updatedState = await processAITurns(updatedState)
    }

    return updatedState
  }

  /**
   * Check if it's currently an AI player's turn
   */
  function isAITurn(gameState: GameState): boolean {
    const currentPlayerIndex = getCurrentPlayer(gameState)

    if (currentPlayerIndex === null) {
      return false
    }

    const currentPlayer = gameState.players[currentPlayerIndex]
    return currentPlayer.isAI === true
  }

  /**
   * Process all AI turns in sequence
   */
  async function processAITurns(gameState: GameState): Promise<GameState> {
    let updatedState = gameState

    // Keep processing while it's AI turns
    while (isAITurn(updatedState)) {
      const currentPlayerIndex = getCurrentPlayer(updatedState)

      if (currentPlayerIndex === null) {
        break
      }

      const currentPlayer = updatedState.players[currentPlayerIndex]
      const aiPlayer = activeAIs.get(currentPlayer.id)

      if (!aiPlayer) {
        console.error(`No AI found for player ${currentPlayer.id}`)
        break
      }

      // Process turn based on current phase
      if (updatedState.round.phase.type === 'awaiting_card_play') {
        updatedState = await processAICardPlay(updatedState, currentPlayerIndex, aiPlayer)
      } else if (updatedState.round.phase.type === 'auction') {
        updatedState = await processAIAuction(updatedState, currentPlayerIndex, aiPlayer)
      } else {
        // Other phases (selling, etc.) - skip to next
        break
      }

      // Check for round end after each action
      updatedState = checkRoundEnd(updatedState)
      if (updatedState.round.phase.type !== 'awaiting_card_play' &&
          updatedState.round.phase.type !== 'auction') {
        break
      }
    }

    return updatedState
  }

  /**
   * Process AI card play decision
   */
  async function processAICardPlay(
    gameState: GameState,
    playerIndex: number,
    aiPlayer: AIPlayer
  ): Promise<GameState> {
    try {
      // Get AI decision
      const decision = await aiPlayer.makeDecision('card_play', gameState)

      if (!decision.success || !decision.value) {
        console.error('AI failed to make card play decision:', decision.error)
        return gameState
      }

      const cardDecision = decision.value

      // Find the card in player's hand
      const player = gameState.players[playerIndex]
      const cardIndex = player.hand.findIndex(card => card.id === cardDecision.cardId)

      if (cardIndex === -1) {
        console.error(`AI selected card ${cardDecision.cardId} not found in hand`)
        return gameState
      }

      // Play the card using engine
      let newState = playCard(gameState, playerIndex, cardIndex)

      // Create auction based on card type
      const card = player.hand[cardIndex]
      const auction = createAuctionForCard(card, player, gameState.players)

      // Update game state with auction
      newState = {
        ...newState,
        round: {
          ...newState.round,
          phase: {
            type: 'auction',
            auction
          }
        }
      }

      console.log(`AI ${player.name} played ${card.artist} (${card.auctionType})`)

      return newState

    } catch (error) {
      console.error('Error processing AI card play:', error)
      return gameState
    }
  }

  /**
   * Process AI auction decisions
   */
  async function processAIAuction(
    gameState: GameState,
    playerIndex: number,
    aiPlayer: AIPlayer
  ): Promise<GameState> {
    try {
      const auction = getCurrentAuction(gameState)

      if (!auction) {
        console.error('No active auction found')
        return gameState
      }

      // Make decision based on auction type
      let decision

      switch (auction.type) {
        case 'open':
          decision = await aiPlayer.makeDecision('bid', gameState, { auction })
          break
        case 'fixed_price':
          decision = await aiPlayer.makeDecision('buy', gameState, { auction })
          break
        case 'sealed_bid':
          decision = await aiPlayer.makeDecision('hidden_bid', gameState, { auction })
          break
        case 'one_offer':
          decision = await aiPlayer.makeDecision('one_offer_bid', gameState, { auction })
          break
        case 'double':
          // For double auction, AI needs to decide which card to offer first
          if (auction.phase === 'selecting_first_card') {
            decision = await aiPlayer.makeDecision('card_play', gameState)
          } else {
            decision = await aiPlayer.makeDecision('double_offer', gameState, { auction })
          }
          break
        default:
          console.error(`Unknown auction type: ${auction.type}`)
          return gameState
      }

      if (!decision.success || !decision.value) {
        console.error('AI failed to make auction decision:', decision.error)
        return gameState
      }

      // Apply AI decision to auction
      // This would integrate with the auction engine
      console.log(`AI ${gameState.players[playerIndex].name} action:`, decision.value.reasoning)

      // TODO: Integrate with auction engine to actually apply the decision

      return gameState

    } catch (error) {
      console.error('Error processing AI auction:', error)
      return gameState
    }
  }

  /**
   * Create appropriate auction for a card
   */
  function createAuctionForCard(card: Card, auctioneer: Player, players: Player[]): AuctionState {
    switch (card.auctionType) {
      case 'open':
        return createOpenAuction(card, auctioneer, players)
      case 'fixed_price':
        return createFixedPriceAuction(card, auctioneer, players)
      case 'sealed_bid':
        return createSealedBidAuction(card, auctioneer, players)
      case 'one_offer':
        return createOneOfferAuction(card, auctioneer, players)
      case 'double':
        return createDoubleAuction(card, auctioneer, players)
      default:
        return createOpenAuction(card, auctioneer, players)
    }
  }

  /**
   * Get AI player instance
   */
  function getAIPlayer(gameState: GameState, playerIndex: number): AIPlayer | null {
    const player = gameState.players[playerIndex]
    return player.isAI ? activeAIs.get(player.id) || null : null
  }

  /**
   * Get all AI players
   */
  function getAllAIPlayers(gameState: GameState): AIPlayer[] {
    return gameState.players
      .filter(player => player.isAI)
      .map(player => activeAIs.get(player.id))
      .filter(Boolean) as AIPlayer[]
  }

  /**
   * Cleanup AI resources
   */
  function cleanup(): void {
    aiManager.clearAll()
    activeAIs.clear()
  }

  return {
    startNewGame,
    updateGameState,
    processAITurns,
    isAITurn,
    getAIPlayer,
    getAllAIPlayers,
    cleanup
  }
}