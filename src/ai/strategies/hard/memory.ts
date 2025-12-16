// ===================
// HARD AI MEMORY
// ===================

import type { Artist, Card, GameState, Player } from '../../../types/game'
import type { OpponentModel, PlayerTendencies, BidPattern, MoneyChangeRecord } from '../../types'
import { createProbabilityUtils } from '../../utils'

/**
 * Advanced memory system for Hard AI
 * Tracks patterns, opponent behavior, and game history
 */
export class HardAIMemory {
  private probability = createProbabilityUtils()

  // Long-term memory across games
  private globalMemory = {
    opponentProfiles: new Map<string, OpponentModel>(),
    artistPerformance: new Map<Artist, Array<{ success: boolean; profit: number; timestamp: number }>>(),
    auctionTypeSuccess: new Map<string, { wins: number; losses: number; totalProfit: number }>(),
  }

  // Current game memory
  private currentGameMemory = {
    playerActions: new Map<string, Array<{ type: string; data: any; timestamp: number }>>(),
    moneyChanges: new Array<MoneyChangeRecord>(),
    biddingPatterns: new Map<string, BidPattern[]>(),
    artistTrends: new Map<Artist, Array<{ round: number; value: number; timestamp: number }>>(),
    notableEvents: new Array<{ type: string; description: string; importance: number; timestamp: number }>(),
  }

  /**
   * Initialize memory for new game
   */
  initializeGame(gameState: GameState, playerIndex: number): void {
    // Reset current game memory
    this.currentGameMemory = {
      playerActions: new Map(),
      moneyChanges: [],
      biddingPatterns: new Map(),
      artistTrends: new Map(),
      notableEvents: [],
    }

    // Initialize player tracking
    gameState.players.forEach((player, index) => {
      this.currentGameMemory.playerActions.set(player.id, [])
      this.currentGameMemory.biddingPatterns.set(player.id, [])
    })

    // Initialize artist tracking
    const artists: Artist[] = [
      'Manuel Carvalho',
      'Sigrid Thaler',
      'Daniel Melim',
      'Ramon Martins',
      'Rafael Silveira',
    ]

    artists.forEach(artist => {
      this.currentGameMemory.artistTrends.set(artist, [])
    })
  }

  /**
   * Record player action
   */
  recordPlayerAction(playerId: string, actionType: string, data: any): void {
    const actions = this.currentGameMemory.playerActions.get(playerId) || []
    actions.push({
      type: actionType,
      data,
      timestamp: Date.now(),
    })
    this.currentGameMemory.playerActions.set(playerId, actions)
  }

  /**
   * Record money change
   */
  recordMoneyChange(
    playerIndex: number,
    amount: number,
    reason: 'bid' | 'purchase' | 'sale' | 'other'
  ): void {
    const change: MoneyChangeRecord = {
      playerIndex,
      amount,
      reason,
      round: 1, // Would extract from game state
      timestamp: Date.now(),
    }

    this.currentGameMemory.moneyChanges.push(change)
  }

  /**
   * Record bid pattern
   */
  recordBidPattern(
    playerId: string,
    auctionType: string,
    artist: Artist,
    bidAmount: number,
    won: boolean,
    wasBluff: boolean = false
  ): void {
    const pattern: BidPattern = {
      timestamp: Date.now(),
      auctionType,
      artist,
      amount: bidAmount,
      won,
      wasBluff,
    }

    const patterns = this.currentGameMemory.biddingPatterns.get(playerId) || []
    patterns.push(pattern)
    this.currentGameMemory.biddingPatterns.set(playerId, patterns)
  }

  /**
   * Record notable event
   */
  recordNotableEvent(
    type: 'high_bid' | 'artist_dominance' | 'market_shift' | 'bluff_revealed',
    description: string,
    importance: number = 0.5
  ): void {
    this.currentGameMemory.notableEvents.push({
      type,
      description,
      importance,
      timestamp: Date.now(),
    })

    // Keep only recent notable events
    if (this.currentGameMemory.notableEvents.length > 20) {
      this.currentGameMemory.notableEvents.shift()
    }
  }

  /**
   * Get opponent model
   */
  getOpponentModel(playerId: string, gameState: GameState, playerIndex: number): OpponentModel {
    // Check if we have existing model
    let model = this.globalMemory.opponentProfiles.get(playerId)

    if (!model) {
      // Create new model from current game observations
      model = this.buildOpponentModel(playerId, gameState, playerIndex)
      this.globalMemory.opponentProfiles.set(playerId, model)
    } else {
      // Update existing model with current game data
      model = this.updateOpponentModel(model, playerId, gameState, playerIndex)
    }

    return model
  }

  /**
   * Build opponent model from observations
   */
  private buildOpponentModel(
    playerId: string,
    gameState: GameState,
    playerIndex: number
  ): OpponentModel {
    const targetPlayer = gameState.players.find(p => p.id === playerId)
    if (!targetPlayer) {
      throw new Error(`Player ${playerId} not found`)
    }

    const currentActions = this.currentGameMemory.playerActions.get(playerId) || []
    const biddingPatterns = this.currentGameMemory.biddingPatterns.get(playerId) || []

    // Calculate tendencies
    const tendencies = this.calculateTendencies(currentActions, biddingPatterns)

    // Estimate money (more accurate for Hard AI)
    const estimatedMoney = this.estimatePlayerMoney(targetPlayer, playerIndex)

    // Calculate artist preferences
    const artistPreferences = this.calculateArtistPreferences(biddingPatterns)

    // Risk tolerance from bidding patterns
    const riskTolerance = this.calculateRiskTolerance(biddingPatterns, estimatedMoney)

    // Predictability based on pattern consistency
    const predictability = this.calculatePredictability(currentActions, biddingPatterns)

    return {
      playerId,
      estimatedMoney,
      moneyConfidence: 0.8, // Hard AI has good estimates
      tendencies,
      biddingHistory: biddingPatterns,
      artistPreferences,
      riskTolerance,
      predictability,
    }
  }

  /**
   * Update existing opponent model
   */
  private updateOpponentModel(
    model: OpponentModel,
    playerId: string,
    gameState: GameState,
    playerIndex: number
  ): OpponentModel {
    const targetPlayer = gameState.players.find(p => p.id === playerId)
    if (!targetPlayer) return model

    const currentActions = this.currentGameMemory.playerActions.get(playerId) || []
    const newBiddingPatterns = this.currentGameMemory.biddingPatterns.get(playerId) || []

    // Update tendencies with new data
    const updatedTendencies = this.updateTendencies(model.tendencies, currentActions, newBiddingPatterns)

    // Update money estimate
    const updatedMoney = this.estimatePlayerMoney(targetPlayer, playerIndex)

    // Update artist preferences
    const updatedPreferences = this.calculateArtistPreferences(newBiddingPatterns)

    // Update risk tolerance
    const updatedRiskTolerance = this.calculateRiskTolerance(newBiddingPatterns, updatedMoney)

    // Update predictability
    const updatedPredictability = this.calculatePredictability(currentActions, newBiddingPatterns)

    return {
      ...model,
      estimatedMoney: updatedMoney,
      tendencies: updatedTendencies,
      biddingHistory: [...model.biddingHistory, ...newBiddingPatterns],
      artistPreferences: updatedPreferences,
      riskTolerance: updatedRiskTolerance,
      predictability: updatedPredictability,
    }
  }

  /**
   * Calculate player tendencies
   */
  private calculateTendencies(
    actions: Array<{ type: string; data: any; timestamp: number }>,
    biddingPatterns: BidPattern[]
  ): PlayerTendencies {
    // Aggressiveness from bidding patterns
    const aggressiveness = this.calculateAggressiveness(biddingPatterns)

    // Bluffing tendency
    const bluffingTendency = this.calculateBluffingTendency(biddingPatterns)

    // Auction type preferences
    const auctionTypePreference = this.calculateAuctionTypePreferences(biddingPatterns)

    // Artist bias
    const artistBias = this.calculateArtistBias(biddingPatterns)

    // Conservation tendency
    const conservationTendency = this.calculateConservationTendency(actions, biddingPatterns)

    return {
      aggressiveness,
      bluffingTendency,
      auctionTypePreference,
      artistBias,
      conservationTendency,
    }
  }

  /**
   * Update tendencies with new data
   */
  private updateTendencies(
    oldTendencies: PlayerTendencies,
    newActions: Array<{ type: string; data: any; timestamp: number }>,
    newBiddingPatterns: BidPattern[]
  ): PlayerTendencies {
    // Weight old and new tendencies
    const oldWeight = 0.7
    const newWeight = 0.3

    const newAggressiveness = this.calculateAggressiveness(newBiddingPatterns)
    const newBluffingTendency = this.calculateBluffingTendency(newBiddingPatterns)
    const newAuctionTypePreference = this.calculateAuctionTypePreferences(newBiddingPatterns)
    const newArtistBias = this.calculateArtistBias(newBiddingPatterns)
    const newConservationTendency = this.calculateConservationTendency(newActions, newBiddingPatterns)

    return {
      aggressiveness: (oldTendencies.aggressiveness * oldWeight) + (newAggressiveness * newWeight),
      bluffingTendency: (oldTendencies.bluffingTendency * oldWeight) + (newBluffingTendency * newWeight),
      auctionTypePreference: {
        ...oldTendencies.auctionTypePreference,
        ...newAuctionTypePreference,
      },
      artistBias: {
        ...oldTendencies.artistBias,
        ...newArtistBias,
      },
      conservationTendency: (oldTendencies.conservationTendency * oldWeight) + (newConservationTendency * newWeight),
    }
  }

  /**
   * Estimate player money with high accuracy
   */
  private estimatePlayerMoney(player: Player, observerIndex: number): number {
    if (player.money !== undefined) {
      return player.money // Exact if available
    }

    // For AI players, use starting money minus visible spending
    const startingMoney = 100
    const visibleSpending = (player.purchases || []).reduce((total, painting) => {
      return total + painting.purchasePrice
    }, 0)

    // Add some uncertainty but less than Medium AI
    const uncertainty = 5 + Math.random() * 5
    const adjustment = (Math.random() - 0.5) * uncertainty

    return Math.max(0, startingMoney - visibleSpending + adjustment)
  }

  /**
   * Calculate aggressiveness from bidding patterns
   */
  private calculateAggressiveness(biddingPatterns: BidPattern[]): number {
    if (biddingPatterns.length === 0) return 0.5

    const avgBidRatio = biddingPatterns.reduce((sum, pattern) => {
      const expectedValue = 20 // Rough average value
      return sum + (pattern.amount / expectedValue)
    }, 0) / biddingPatterns.length

    return Math.max(0.1, Math.min(0.9, avgBidRatio / 2))
  }

  /**
   * Calculate bluffing tendency
   */
  private calculateBluffingTendency(biddingPatterns: BidPattern[]): number {
    if (biddingPatterns.length === 0) return 0.3

    const hiddenBids = biddingPatterns.filter(p => p.auctionType === 'hidden')
    if (hiddenBids.length === 0) return 0.3

    const bluffCount = hiddenBids.filter(p => p.wasBluff).length
    return Math.max(0.1, Math.min(0.9, bluffCount / hiddenBids.length))
  }

  /**
   * Calculate auction type preferences
   */
  private calculateAuctionTypePreferences(biddingPatterns: BidPattern[]): Record<string, number> {
    const preferences: Record<string, number> = {
      open: 0.5,
      one_offer: 0.5,
      hidden: 0.5,
      fixed_price: 0.5,
      double: 0.5,
    }

    // Analyze success rates by auction type
    const typeGroups = new Map<string, BidPattern[]>()
    biddingPatterns.forEach(pattern => {
      const group = typeGroups.get(pattern.auctionType) || []
      group.push(pattern)
      typeGroups.set(pattern.auctionType, group)
    })

    typeGroups.forEach((patterns, auctionType) => {
      if (patterns.length > 0) {
        const winRate = patterns.filter(p => p.won).length / patterns.length
        preferences[auctionType] = winRate
      }
    })

    return preferences
  }

  /**
   * Calculate artist bias
   */
  private calculateArtistBias(biddingPatterns: BidPattern[]): Record<Artist, number> {
    const bias: Record<Artist, number> = {
      'Manuel Carvalho': 0,
      'Sigrid Thaler': 0,
      'Daniel Melim': 0,
      'Ramon Martins': 0,
      'Rafael Silveira': 0,
    }

    // Count bids per artist
    const artistBids = new Map<Artist, number>()
    biddingPatterns.forEach(pattern => {
      const count = artistBids.get(pattern.artist) || 0
      artistBids.set(pattern.artist, count + 1)
    })

    const totalBids = Array.from(artistBids.values()).reduce((sum, count) => sum + count, 0)

    if (totalBids > 0) {
      artistBids.forEach((count, artist) => {
        bias[artist] = (count / totalBids - 0.2) * 2 // Normalize to -1 to 1
      })
    }

    return bias
  }

  /**
   * Calculate conservation tendency
   */
  private calculateConservationTendency(
    actions: Array<{ type: string; data: any; timestamp: number }>,
    biddingPatterns: BidPattern[]
  ): number {
    // Conservative if often passes or bids low
    const passActions = actions.filter(a => a.type === 'pass').length
    const totalActions = actions.length

    if (totalActions === 0) return 0.5

    const passRate = passActions / totalActions
    const avgBidAmount = biddingPatterns.length > 0
      ? biddingPatterns.reduce((sum, p) => sum + p.amount, 0) / biddingPatterns.length
      : 20

    // High pass rate and low average bids = more conservative
    const conservationScore = (passRate * 0.6) + ((20 - Math.min(20, avgBidAmount)) / 20 * 0.4)

    return Math.max(0.1, Math.min(0.9, conservationScore))
  }

  /**
   * Calculate artist preferences from patterns
   */
  private calculateArtistPreferences(biddingPatterns: BidPattern[]): Record<Artist, number> {
    return this.calculateArtistBias(biddingPatterns)
  }

  /**
   * Calculate risk tolerance
   */
  private calculateRiskTolerance(biddingPatterns: BidPattern[], estimatedMoney: number): number {
    if (biddingPatterns.length === 0) return 0.5

    // High risk tolerance if bidding high percentage of money
    const avgBidPercentage = biddingPatterns.reduce((sum, pattern) => {
      return sum + (pattern.amount / estimatedMoney)
    }, 0) / biddingPatterns.length

    // Consider hidden bids (higher risk)
    const hiddenBidRate = biddingPatterns.filter(p => p.auctionType === 'hidden').length / biddingPatterns.length

    const riskScore = (avgBidPercentage * 0.7) + (hiddenBidRate * 0.3)

    return Math.max(0.1, Math.min(0.9, riskScore))
  }

  /**
   * Calculate predictability
   */
  private calculatePredictability(
    actions: Array<{ type: string; data: any; timestamp: number }>,
    biddingPatterns: BidPattern[]
  ): number {
    // More predictable if patterns are consistent
    let consistency = 0.5

    // Check bidding consistency
    if (biddingPatterns.length > 2) {
      const bidAmounts = biddingPatterns.map(p => p.amount)
      const avgBid = bidAmounts.reduce((sum, amount) => sum + amount, 0) / bidAmounts.length
      const variance = bidAmounts.reduce((sum, amount) => sum + Math.pow(amount - avgBid, 2), 0) / bidAmounts.length
      const standardDeviation = Math.sqrt(variance)

      // Lower standard deviation = more predictable
      consistency = Math.max(0.1, 1 - (standardDeviation / avgBid))
    }

    // Check action timing consistency
    if (actions.length > 2) {
      const timeDiffs = []
      for (let i = 1; i < actions.length; i++) {
        timeDiffs.push(actions[i].timestamp - actions[i - 1].timestamp)
      }

      const avgTimeDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length
      const timeVariance = timeDiffs.reduce((sum, diff) => sum + Math.pow(diff - avgTimeDiff, 2), 0) / timeDiffs.length

      const timeConsistency = Math.max(0.1, 1 - (Math.sqrt(timeVariance) / avgTimeDiff))
      consistency = (consistency + timeConsistency) / 2
    }

    return consistency
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    return {
      opponentProfiles: this.globalMemory.opponentProfiles.size,
      currentGameActions: Array.from(this.currentGameMemory.playerActions.values())
        .reduce((sum, actions) => sum + actions.length, 0),
      biddingPatterns: Array.from(this.currentGameMemory.biddingPatterns.values())
        .reduce((sum, patterns) => sum + patterns.length, 0),
      notableEvents: this.currentGameMemory.notableEvents.length,
    }
  }

  /**
   * Clean up old memory data
   */
  cleanup(): void {
    // Remove very old opponent profiles
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000) // 7 days ago

    for (const [playerId, model] of this.globalMemory.opponentProfiles) {
      const lastActivity = model.biddingHistory[model.biddingHistory.length - 1]?.timestamp || 0

      if (lastActivity < cutoffTime) {
        this.globalMemory.opponentProfiles.delete(playerId)
      }
    }
  }
}