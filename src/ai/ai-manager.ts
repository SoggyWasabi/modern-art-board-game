// ===================
// AI MANAGER
// ===================

import type { GameState, Player } from '../types/game'
import type { AuctionState } from '../types/auction'
import type {
  AnyAIDecision,
  AICardPlayDecision,
  AIBidDecision,
  AIFixedPriceDecision,
  AIDoubleOfferDecision,
  AIHiddenBidDecision,
  AIOneOfferBidDecision,
  AIStrategy,
  AIDifficulty,
  StrategyConfig,
  AIDecisionContext,
  VisibleGameState,
  MarketAnalysis,
  CardEvaluation,
  OpponentModel,
} from './types'
import { GameStateAnalyzer, MarketSimulator, InformationFilter } from './knowledge'
import { TimeSlicer, TimeSliceUtils, AIDecisionValidator } from './utils'
import { AIStrategyFactory } from './strategies'

/**
 * AI Manager - Main orchestrator for AI decision making
 * Handles strategy selection, decision context, and timing
 */
export class AIManager {
  private strategies: Map<string, AIStrategy> = new Map()
  private activeComputations: Map<string, AbortController> = new Map()
  private decisionHistory: Map<string, AnyAIDecision[]> = new Map()
  private playerContexts: Map<number, AIDecisionContext> = new Map()

  constructor() {
    this.initializeDefaultStrategies()
  }

  /**
   * Initialize default strategies for all difficulty levels
   */
  private initializeDefaultStrategies(): void {
    // Strategies are created on-demand via registerAI
    // No need to pre-initialize
  }

  /**
   * Register an AI player with strategy
   */
  registerAI(playerIndex: number, difficulty: 'easy' | 'medium' | 'hard', seed?: number): void {
    const strategy = AIStrategyFactory.create({
      difficulty,
      seed,
    })

    const playerId = `player_${playerIndex}`
    this.strategies.set(playerId, strategy)
  }

  /**
   * Unregister an AI player
   */
  unregisterAI(playerIndex: number): void {
    const playerId = `player_${playerIndex}`
    this.strategies.delete(playerId)
  }

  /**
   * Check if player has AI
   */
  hasAI(playerIndex: number): boolean {
    const playerId = `player_${playerIndex}`
    return this.strategies.has(playerId)
  }

  /**
   * Register a new AI strategy
   */
  registerStrategy(playerId: string, strategy: AIStrategy): void {
    this.strategies.set(playerId, strategy)
  }

  /**
   * Get strategy for a player
   */
  getStrategy(playerId: string): AIStrategy | undefined {
    return this.strategies.get(playerId)
  }

  /**
   * Create AI strategy from configuration
   */
  createStrategy(config: StrategyConfig): AIStrategy {
    // Use the strategy factory to create the actual strategy
    return AIStrategyFactory.create({
      difficulty: config.difficulty,
      seed: config.performance?.maxTime || Date.now(), // Use as seed for consistency
    })
  }

  /**
   * Make an AI decision
   */
  async makeDecision(
    playerIndex: number,
    decisionType: 'card_play' | 'bid' | 'hidden_bid' | 'fixed_price' | 'buy',
    gameState: GameState,
    options?: {
      auction?: AuctionState
      currentBid?: number
      card?: Card
      timeoutMs?: number
      timeSliceController?: {
        shouldContinue: () => boolean
        getTimeRemaining: () => number
      }
    }
  ): Promise<AnyAIDecision> {
    const player = gameState.players[playerIndex]
    if (!player.isAI) {
      throw new Error(`Player ${playerIndex} is not an AI`)
    }

    // Look up strategy by player index format
    const playerId = `player_${playerIndex}`
    const strategy = this.strategies.get(playerId)
    if (!strategy) {
      throw new Error(`No strategy found for player ${playerIndex}`)
    }

    // Create decision context
    const context = await this.createDecisionContext(gameState, playerIndex)

    // Use strategy's makeDecision method
    return await strategy.makeDecision(decisionType, context, options)
  }

  /**
   * Update AI with new context
   */
  async updateAI(playerIndex: number, context: AIDecisionContext): void {
    const playerId = `player_${playerIndex}`
    const strategy = this.strategies.get(playerId)

    if (strategy) {
      strategy.update(context)
    }
  }

  
  /**
   * Create decision context for AI
   */
  private async createDecisionContext(
    gameState: GameState,
    playerIndex: number
  ): Promise<AIDecisionContext> {
    const player = gameState.players[playerIndex]

    // Get analyzer for this player's difficulty
    const analyzer = new GameStateAnalyzer(playerIndex, player.aiDifficulty || 'medium')
    const simulator = new MarketSimulator()
    const filter = new InformationFilter(playerIndex, player.aiDifficulty || 'medium')

    // Extract visible game state
    const visibleGameState = analyzer.extractVisibleGameState(gameState)

    // Analyze market
    const marketAnalysis = simulator.analyzeMarket(gameState)

    // Evaluate cards in hand
    const cardEvaluations: CardEvaluation[] = []
    for (const card of player.hand) {
      const evaluation = simulator.evaluateCard(card, gameState, playerIndex)
      cardEvaluations.push(evaluation)
    }

    // Create opponent models
    const opponentModels = filter.filterOpponentInformation(gameState.players)

    // Get AI memory
    const memory = analyzer.getMemory()

    // Determine current auction if applicable
    const currentAuction = gameState.round.phase.type === 'auction'
      ? gameState.round.phase.auction
      : undefined

    // Calculate time pressure and importance
    const timePressure = this.calculateTimePressure(gameState, playerIndex)
    const importance = this.calculateImportance(gameState, playerIndex)

    return {
      gameState: visibleGameState,
      marketAnalysis,
      cardEvaluations,
      opponentModels,
      memory,
      currentAuction,
      playerIndex,
      timePressure,
      importance,
    }
  }

  /**
   * Calculate time pressure (0-1)
   */
  private calculateTimePressure(gameState: GameState, playerIndex: number): number {
    // Early game = low pressure, late game = high pressure
    const roundProgress = gameState.round.roundNumber / 4
    return Math.min(1.0, roundProgress + 0.2) // Minimum pressure
  }

  /**
   * Calculate decision importance (0-1)
   */
  private calculateImportance(gameState: GameState, playerIndex: number): number {
    const player = gameState.players[playerIndex]

    // Higher importance when:
    // - Low money (need to be careful)
    // - Late in game (decisions matter more)
    // - Winning/losing by small margin

    let importance = 0.5

    // Money pressure
    if (player.money < 30) importance += 0.3
    else if (player.money < 50) importance += 0.1

    // Round pressure
    importance += (gameState.round.roundNumber - 1) * 0.1

    return Math.min(1.0, importance)
  }

  /**
   * Create fallback decision when time runs out or error occurs
   */
  private createFallbackDecision(
    strategy: AIStrategy,
    decisionType: string,
    context: AIDecisionContext
  ): AnyAIDecision {
    // Simple fallback based on difficulty and decision type
    // Will be improved in Phase 2

    switch (decisionType) {
      case 'card_play':
        return {
          type: 'card_play',
          confidence: 0.1,
          cardId: context.cardEvaluations[0]?.card.id || 'unknown',
          reasoning: 'Fallback - first card in hand',
        }

      case 'open_bid':
        return {
          type: 'bid',
          confidence: 0.1,
          action: 'pass',
          reasoning: 'Fallback - passing',
        }

      case 'hidden_bid':
        return {
          type: 'hidden_bid',
          confidence: 0.1,
          amount: 0,
          reasoning: 'Fallback - not bidding',
        }

      case 'fixed_price':
        return {
          type: 'fixed_price',
          confidence: 0.1,
          price: 10,
          reasoning: 'Fallback - minimum price',
        }

      case 'double_offer':
        return {
          type: 'double_offer',
          confidence: 0.1,
          action: 'decline',
          reasoning: 'Fallback - declining',
        }

      default:
        throw new Error(`Unknown decision type for fallback: ${decisionType}`)
    }
  }

  /**
   * Store decision in history
   */
  private storeDecision(playerId: string, decision: AnyAIDecision): void {
    if (!this.decisionHistory.has(playerId)) {
      this.decisionHistory.set(playerId, [])
    }

    const history = this.decisionHistory.get(playerId)!
    history.push(decision)

    // Keep only last 50 decisions
    if (history.length > 50) {
      history.shift()
    }
  }

  /**
   * Get decision history for a player
   */
  getDecisionHistory(playerId: string): AnyAIDecision[] {
    return this.decisionHistory.get(playerId) || []
  }

  /**
   * Cancel all active computations
   */
  cancelAllComputations(): void {
    for (const [id, controller] of this.activeComputations) {
      controller.abort()
    }
    this.activeComputations.clear()
  }

  /**
   * Cancel computation for specific player
   */
  cancelPlayerComputation(playerId: string): void {
    for (const [id, controller] of this.activeComputations) {
      if (id.startsWith(playerId)) {
        controller.abort()
        this.activeComputations.delete(id)
      }
    }
  }

  /**
   * Check if player is currently thinking
   */
  isPlayerThinking(playerId: string): boolean {
    for (const [id] of this.activeComputations) {
      if (id.startsWith(playerId)) {
        return true
      }
    }
    return false
  }

  /**
   * Get number of active computations
   */
  getActiveComputationCount(): number {
    return this.activeComputations.size
  }

  /**
   * Emit progress event (would connect to UI)
   */
  private emitProgress(playerIndex: number, decisionType: string, progress: number): void {
    // Will be connected to UI state management in Phase 2
    console.log(`AI Progress: Player ${playerIndex}, ${decisionType}: ${progress}%`)
  }

  /**
   * Initialize AI players in a game
   */
  initializeAIPlayers(gameState: GameState): void {
    gameState.players.forEach((player, index) => {
      if (player.isAI) {
        const config: StrategyConfig = {
          difficulty: player.aiDifficulty || 'medium',
        }

        const strategy = this.createStrategy(config)
        this.registerStrategy(player.id, strategy)

        // Initialize strategy with game state
        strategy.initialize(gameState, index)
      }
    })
  }

  /**
   * Update all AI strategies with new game state
   */
  updateAIPlayers(gameState: GameState): void {
    this.strategies.forEach((strategy, playerId) => {
      const playerIndex = gameState.players.findIndex(p => p.id === playerId)
      if (playerIndex >= 0) {
        // Create context and update strategy
        this.createDecisionContext(gameState, playerIndex)
          .then(context => strategy.update(context))
          .catch(error => console.error('Failed to update AI strategy:', error))
      }
    })
  }

  /**
   * Clean up all AI resources
   */
  cleanup(): void {
    this.cancelAllComputations()
    this.strategies.forEach(strategy => strategy.cleanup())
    this.strategies.clear()
    this.decisionHistory.clear()
    this.playerContexts.clear()
  }

  /**
   * Get debug information for all AI players
   */
  getDebugInfo(): Record<string, any> {
    const debugInfo: Record<string, any> = {}

    this.strategies.forEach((strategy, playerId) => {
      debugInfo[playerId] = {
        difficulty: strategy.difficulty,
        name: strategy.name,
        decisionCount: this.getDecisionHistory(playerId).length,
        isThinking: this.isPlayerThinking(playerId),
      }
    })

    return {
      strategies: debugInfo,
      activeComputations: this.activeComputations.size,
      totalDecisions: Array.from(this.decisionHistory.values())
        .reduce((sum, history) => sum + history.length, 0),
    }
  }
}