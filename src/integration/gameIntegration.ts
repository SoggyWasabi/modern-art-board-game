import type { GameState } from '../types'
import { playCard } from '../engine/round'
import { AIManager } from '../ai'
import type { AIDecision } from '../ai/types'

/**
 * Game action validation results
 */
export interface ValidationResult {
  valid: boolean
  reason?: string
  suggestion?: string
}

/**
 * Game action error with recovery information
 */
export interface GameActionError {
  code: string
  message: string
  details?: any
  recoverable: boolean
}

/**
 * Turn indicator for UI feedback
 */
export interface TurnIndicator {
  type: 'user_turn' | 'ai_thinking' | 'transition'
  playerIndex?: number
  timeLimit?: number
  actionsAllowed: string[]
}

/**
 * Game event types
 */
export type GameEventType =
  | 'card_played'
  | 'bid_placed'
  | 'bid_passed'
  | 'auction_started'
  | 'auction_ended'
  | 'turn_changed'
  | 'phase_changed'
  | 'ai_thinking_started'
  | 'ai_thinking_finished'

export interface GameEvent {
  type: GameEventType
  playerId?: number
  data?: any
  timestamp: number
}

/**
 * Action validation system
 */
export class GameActionValidator {
  static validatePlayCard(cardId: string, gameState: GameState): ValidationResult {
    const player = gameState.players[0] // Assuming player 0 is human
    const card = player.hand.find(c => c.id === cardId)

    if (!card) {
      return { valid: false, reason: "Card not in hand" }
    }

    if (gameState.round.phase.type !== 'awaiting_card_play') {
      return { valid: false, reason: "Cannot play card right now" }
    }

    if (gameState.round.phase.activePlayerIndex !== 0) {
      return { valid: false, reason: "It's not your turn" }
    }

    return { valid: true }
  }

  static validateBid(amount: number, gameState: GameState): ValidationResult {
    const player = gameState.players[0]

    if (amount > player.money) {
      return { valid: false, reason: "Insufficient funds" }
    }

    if (gameState.round.phase.type !== 'auction') {
      return { valid: false, reason: "No auction in progress" }
    }

    const currentBid = gameState.round.phase.auction.currentBid
    if (amount <= currentBid) {
      return { valid: false, reason: "Bid must be higher than current bid" }
    }

    return { valid: true }
  }
}

/**
 * Centralized error handler for game actions
 */
export class GameActionHandler {
  static async executeAction<T>(
    action: () => T,
    context: string
  ): Promise<{ success: boolean; data?: T; error?: GameActionError }> {
    try {
      const data = action()
      return { success: true, data }
    } catch (error) {
      console.error(`Game action failed [${context}]:`, error)

      return {
        success: false,
        error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message || 'An unexpected error occurred',
          details: error,
          recoverable: error.recoverable ?? false
        }
      }
    }
  }
}

/**
 * Game event management system
 */
export class GameEventManager {
  private listeners = new Map<GameEventType, Array<(event: GameEvent) => void>>()

  subscribe(eventType: GameEventType, callback: (event: GameEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }
    this.listeners.get(eventType)!.push(callback)

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventType) || []
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  emit(event: GameEvent): void {
    const callbacks = this.listeners.get(event.type) || []
    callbacks.forEach(callback => callback(event))
  }

  clear(): void {
    this.listeners.clear()
  }
}

/**
 * AI thinking state for UI feedback
 */
export interface AIThinkingState {
  playerIndex: number
  decisionType: string
  startTime: number
  expectedDuration?: number
  progress?: number
}

/**
 * Action queue to prevent race conditions
 */
export class ActionQueue {
  private queue: Array<() => Promise<void>> = []
  private processing = false

  async enqueue(action: () => Promise<void>): Promise<void> {
    this.queue.push(action)

    if (!this.processing) {
      this.processing = true
      while (this.queue.length > 0) {
        const nextAction = this.queue.shift()!
        await nextAction()
      }
      this.processing = false
    }
  }

  clear(): void {
    this.queue = []
  }
}

/**
 * Game controller to mediate between UI and engine
 */
export class GameController {
  private aiManager: AIManager
  private eventManager: GameEventManager
  private actionQueue: ActionQueue
  private thinkingStates = new Map<number, AIThinkingState>()

  constructor() {
    this.aiManager = new AIManager()
    this.eventManager = new GameEventManager()
    this.actionQueue = new ActionQueue()
  }

  /**
   * Get the event manager for subscribing to game events
   */
  getEventManager(): GameEventManager {
    return this.eventManager
  }

  /**
   * Get current turn indicator for UI
   */
  getTurnIndicator(gameState: GameState): TurnIndicator {
    const phase = gameState.round.phase
    const activePlayerIndex = phase.type === 'awaiting_card_play'
      ? phase.activePlayerIndex
      : 0 // Simplified for now

    // Check if it's human player's turn
    if (activePlayerIndex === 0) {
      return {
        type: 'user_turn',
        playerIndex: 0,
        actionsAllowed: this.getAllowedActions(gameState)
      }
    }

    // Check if AI is currently thinking
    const thinkingState = this.thinkingStates.get(activePlayerIndex)
    if (thinkingState) {
      return {
        type: 'ai_thinking',
        playerIndex: activePlayerIndex,
        actionsAllowed: []
      }
    }

    // Default to transition state
    return {
      type: 'transition',
      playerIndex: activePlayerIndex,
      actionsAllowed: []
    }
  }

  /**
   * Get allowed actions for current player
   */
  private getAllowedActions(gameState: GameState): string[] {
    const phase = gameState.round.phase
    const actions: string[] = []

    if (phase.type === 'awaiting_card_play') {
      actions.push('play_card')
    } else if (phase.type === 'auction') {
      actions.push('place_bid', 'pass_bid')
    }

    return actions
  }

  /**
   * Execute a card play with proper validation and state updates
   */
  async executePlayCard(gameState: GameState, cardId: string): Promise<GameState> {
    // Validate action
    const validation = GameActionValidator.validatePlayCard(cardId, gameState)
    if (!validation.valid) {
      throw new Error(validation.reason)
    }

    // Get card index
    const player = gameState.players[0]
    const cardIndex = player.hand.findIndex(c => c.id === cardId)
    if (cardIndex === -1) {
      throw new Error('Card not found in hand')
    }

    console.log('Playing card:', { cardId, cardIndex, card: player.hand[cardIndex] })

    // Emit event before action
    this.eventManager.emit({
      type: 'card_played',
      playerId: 0,
      data: { cardId, cardIndex },
      timestamp: Date.now()
    })

    try {
      // Execute engine action - it returns the new state
      const newGameState = playCard(gameState, 0, cardIndex)

      console.log('New game state after playCard:', {
        phase: newGameState.round.phase.type,
        round: newGameState.round
      })

      // Emit success event
      this.eventManager.emit({
        type: 'phase_changed',
        data: { newPhase: newGameState.round.phase.type },
        timestamp: Date.now()
      })

      // If auction started, process AI turns
      if (newGameState.round.phase.type === 'auction') {
        // TODO: Process AI turns in auction
        console.log('Auction started - AI processing not yet implemented')
      }

      return newGameState
    } catch (error) {
      console.error('Error in playCard:', error)
      // Emit error event
      this.eventManager.emit({
        type: 'turn_changed',
        data: { error: error.message },
        timestamp: Date.now()
      })
      throw error
    }
  }

  /**
   * Process AI turns in auction
   */
  private async processAuctionWithAI(gameState: GameState): Promise<void> {
    const auction = gameState.round.phase

    // Get all AI players in order
    const aiPlayers = gameState.players
      .map((player, index) => ({ player, index }))
      .filter(({ index }) => index !== 0 && player.type === 'ai')

    // Process each AI player's turn
    for (const { player, index } of aiPlayers) {
      // Check if it's this AI's turn to bid
      if (this.shouldAIBid(gameState, index)) {
        await this.processAITurn(gameState, index)
      }
    }
  }

  /**
   * Check if AI should take action
   */
  private shouldAIBid(gameState: GameState, playerIndex: number): boolean {
    const phase = gameState.round.phase
    if (phase.type !== 'auction') return false

    // Simplified logic for now
    return true
  }

  /**
   * Process a single AI turn
   */
  private async processAITurn(gameState: GameState, playerIndex: number): Promise<void> {
    // Start thinking state
    const thinkingState: AIThinkingState = {
      playerIndex,
      decisionType: 'bid',
      startTime: Date.now(),
      expectedDuration: 2000 // 2 seconds thinking time
    }

    this.thinkingStates.set(playerIndex, thinkingState)

    this.eventManager.emit({
      type: 'ai_thinking_started',
      playerId: playerIndex,
      data: thinkingState,
      timestamp: Date.now()
    })

    try {
      // Get AI decision
      const decision = await this.aiManager.makeDecision(
        playerIndex,
        'bid',
        gameState
      )

      // Execute AI decision
      if (decision.type === 'bid') {
        if (decision.action === 'bid' && decision.amount) {
          await this.executeAIBid(gameState, playerIndex, decision.amount)
        } else if (decision.action === 'pass') {
          await this.executeAIPass(gameState, playerIndex)
        }
      }

      this.eventManager.emit({
        type: 'ai_thinking_finished',
        playerId: playerIndex,
        data: { decision },
        timestamp: Date.now()
      })
    } catch (error) {
      console.error(`AI turn failed for player ${playerIndex}:`, error)

      this.eventManager.emit({
        type: 'ai_thinking_finished',
        playerId: playerIndex,
        data: { error: error.message },
        timestamp: Date.now()
      })
    } finally {
      this.thinkingStates.delete(playerIndex)
    }
  }

  /**
   * Execute AI bid
   */
  private async executeAIBid(gameState: GameState, playerIndex: number, amount: number): Promise<void> {
    this.eventManager.emit({
      type: 'bid_placed',
      playerId: playerIndex,
      data: { amount },
      timestamp: Date.now()
    })

    // Update game state with bid
    // Note: This would need to be integrated with the actual engine
    const aiPlayer = gameState.players[playerIndex]
    if (aiPlayer) {
      console.log(`AI Player ${playerIndex} (${aiPlayer.name}) bids ${amount}`)
    }
  }

  /**
   * Execute AI pass
   */
  private async executeAIPass(gameState: GameState, playerIndex: number): Promise<void> {
    this.eventManager.emit({
      type: 'bid_passed',
      playerId: playerIndex,
      timestamp: Date.now()
    })

    // Update game state with pass
    console.log(`AI Player ${playerIndex} passes`)
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.eventManager.clear()
    this.actionQueue.clear()
    this.thinkingStates.clear()
  }
}

// Singleton instance
let gameControllerInstance: GameController | null = null

export function getGameController(): GameController {
  if (!gameControllerInstance) {
    gameControllerInstance = new GameController()
  }
  return gameControllerInstance
}