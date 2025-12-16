// ===================
// INFORMATION FILTER
// ===================

import type { Artist, Card, GameState, Player } from '../../types/game'
import type { OpponentModel, PlayerTendencies, BidPattern } from '../types'

/**
 * Information filter that enforces fair play by limiting AI knowledge
 * Ensures AI only knows what a human player would know
 */
export class InformationFilter {
  private readonly playerIndex: number
  private readonly difficulty: 'easy' | 'medium' | 'hard'

  constructor(playerIndex: number, difficulty: 'easy' | 'medium' | 'hard') {
    this.playerIndex = playerIndex
    this.difficulty = difficulty
  }

  /**
   * Filter opponent information based on AI difficulty and game rules
   */
  filterOpponentInformation(players: Player[]): OpponentModel[] {
    return players.map((player, index) => {
      if (index === this.playerIndex) {
        // Don't filter self information
        return this.createSelfModel(player, index)
      }

      return this.createOpponentModel(player, index)
    })
  }

  /**
   * Create model for self (player)
   */
  private createSelfModel(player: Player, playerIndex: number): OpponentModel {
    return {
      playerId: player.id,
      estimatedMoney: player.money,
      moneyConfidence: 1.0, // Exact knowledge of own money
      tendencies: {
        aggressiveness: 0.5, // Would be set by personality system
        bluffingTendency: 0.3,
        auctionTypePreference: {},
        artistBias: {},
        conservationTendency: 0.5,
      },
      biddingHistory: [],
      artistPreferences: {},
      riskTolerance: 0.5,
      predictability: 0.5,
    }
  }

  /**
   * Create model for opponent with filtered information
   */
  private createOpponentModel(player: Player, playerIndex: number): OpponentModel {
    const baseModel: OpponentModel = {
      playerId: player.id,
      estimatedMoney: this.filterMoneyInformation(player),
      moneyConfidence: this.getMoneyConfidence(),
      tendencies: this.filterTendencyInformation(playerIndex),
      biddingHistory: this.filterBidHistory(playerIndex),
      artistPreferences: this.filterArtistPreferences(playerIndex),
      riskTolerance: this.estimateRiskTolerance(playerIndex),
      predictability: this.estimatePredictability(playerIndex),
    }

    return baseModel
  }

  /**
   * Filter money information based on difficulty
   */
  private filterMoneyInformation(player: Player): number {
    const startingMoney = 100

    // Calculate visible spending
    const visibleSpending = (player.purchases || []).reduce((total, painting) => {
      return total + painting.purchasePrice
    }, 0)

    let estimate = startingMoney - visibleSpending

    // Add uncertainty based on difficulty
    switch (this.difficulty) {
      case 'easy':
        // Easy AI: High uncertainty, rough estimates
        const easyUncertainty = 20 + Math.random() * 20
        estimate += (Math.random() - 0.5) * easyUncertainty
        break

      case 'medium':
        // Medium AI: Moderate uncertainty
        const mediumUncertainty = 10 + Math.random() * 10
        estimate += (Math.random() - 0.5) * mediumUncertainty
        break

      case 'hard':
        // Hard AI: Lower uncertainty, better estimates
        const hardUncertainty = 5 + Math.random() * 5
        estimate += (Math.random() - 0.5) * hardUncertainty
        break
    }

    return Math.max(0, Math.round(estimate))
  }

  /**
   * Get confidence in money estimate based on difficulty
   */
  private getMoneyConfidence(): number {
    switch (this.difficulty) {
      case 'easy': return 0.3
      case 'medium': return 0.6
      case 'hard': return 0.8
      default: return 0.5
    }
  }

  /**
   * Filter tendency information based on difficulty
   */
  private filterTendencyInformation(playerIndex: number): PlayerTendencies {
    const base: PlayerTendencies = {
      aggressiveness: 0.5, // Default to unknown
      bluffingTendency: 0.3,
      auctionTypePreference: {},
      artistBias: {},
      conservationTendency: 0.5,
    }

    // Easy AI gets minimal tendency information
    if (this.difficulty === 'easy') {
      return {
        ...base,
        aggressiveness: 0.5,
        riskTolerance: 0.5,
      }
    }

    // Medium/Hard AI gets some tendency information based on observation
    return {
      ...base,
      aggressiveness: this.observeAggressiveness(playerIndex),
      bluffingTendency: this.observeBluffingTendency(playerIndex),
      auctionTypePreference: this.observeAuctionPreferences(playerIndex),
      artistBias: this.observeArtistBias(playerIndex),
      conservationTendency: this.observeConservation(playerIndex),
    }
  }

  /**
   * Observe aggressiveness from visible behavior
   */
  private observeAggressiveness(playerIndex: number): number {
    // Would analyze actual bid history and spending patterns
    // For now, return estimated based on difficulty
    switch (this.difficulty) {
      case 'easy': return 0.5 // No observation capability
      case 'medium': return 0.4 + Math.random() * 0.2 // Rough estimate
      case 'hard': return 0.3 + Math.random() * 0.4 // Better observation
      default: return 0.5
    }
  }

  /**
   * Observe bluffing tendency from hidden auctions
   */
  private observeBluffingTendency(playerIndex: number): number {
    // Hard AI can detect patterns in hidden auction results
    if (this.difficulty !== 'hard') {
      return 0.3 // Default assumption
    }

    // Would analyze hidden auction history vs final outcomes
    return 0.2 + Math.random() * 0.3
  }

  /**
   * Observe auction type preferences
   */
  private observeAuctionPreferences(playerIndex: number): Record<string, number> {
    // Easy/Medium AI gets minimal information
    if (this.difficulty !== 'hard') {
      return {
        open: 0.5,
        one_offer: 0.5,
        hidden: 0.5,
        fixed_price: 0.5,
        double: 0.5,
      }
    }

    // Hard AI can observe preferences from game behavior
    return {
      open: 0.4 + Math.random() * 0.2,
      one_offer: 0.4 + Math.random() * 0.2,
      hidden: 0.4 + Math.random() * 0.2,
      fixed_price: 0.4 + Math.random() * 0.2,
      double: 0.4 + Math.random() * 0.2,
    }
  }

  /**
   * Observe artist bias
   */
  private observeArtistBias(playerIndex: number): Record<Artist, number> {
    const artists: Artist[] = [
      'Manuel Carvalho',
      'Sigrid Thaler',
      'Daniel Melim',
      'Ramon Martins',
      'Rafael Silveira',
    ]

    const bias: Record<Artist, number> = {} as any

    // Easy AI gets no bias information
    if (this.difficulty === 'easy') {
      artists.forEach(artist => {
        bias[artist] = 0
      })
      return bias
    }

    // Medium/Hard AI gets some bias information from visible purchases
    artists.forEach(artist => {
      // Would analyze actual purchase history
      bias[artist] = (Math.random() - 0.5) * 0.4 // Small random bias
    })

    return bias
  }

  /**
   * Observe conservation tendency
   */
  private observeConservation(playerIndex: number): number {
    // Would analyze spending patterns
    switch (this.difficulty) {
      case 'easy': return 0.5 // No observation
      case 'medium': return 0.4 + Math.random() * 0.2
      case 'hard': return 0.3 + Math.random() * 0.4
      default: return 0.5
    }
  }

  /**
   * Filter bid history based on what should be visible
   */
  private filterBidHistory(playerIndex: number): BidPattern[] {
    // In most auctions, bids are public information
    // Hidden bids are only revealed after auction ends
    const patterns: BidPattern[] = []

    // Would extract from actual game event log
    // For now, return empty based on difficulty

    if (this.difficulty === 'hard') {
      // Hard AI remembers more history
      return patterns
    }

    return []
  }

  /**
   * Filter artist preferences
   */
  private filterArtistPreferences(playerIndex: number): Record<Artist, number> {
    const artists: Artist[] = [
      'Manuel Carvalho',
      'Sigrid Thaler',
      'Daniel Melim',
      'Ramon Martins',
      'Rafael Silveira',
    ]

    const preferences: Record<Artist, number> = {} as any

    artists.forEach(artist => {
      // Easy AI gets no preference information
      if (this.difficulty === 'easy') {
        preferences[artist] = 0
      } else {
        // Medium/Hard AI can infer some preferences from purchases
        preferences[artist] = (Math.random() - 0.5) * 0.3
      }
    })

    return preferences
  }

  /**
   * Estimate risk tolerance
   */
  private estimateRiskTolerance(playerIndex: number): number {
    switch (this.difficulty) {
      case 'easy': return 0.5 // No observation
      case 'medium': return 0.4 + Math.random() * 0.2
      case 'hard': return 0.3 + Math.random() * 0.4
      default: return 0.5
    }
  }

  /**
   * Estimate predictability
   */
  private estimatePredictability(playerIndex: number): number {
    // How predictable is this opponent's behavior?
    switch (this.difficulty) {
      case 'easy': return 0.8 // Easy AI assumes most players are predictable
      case 'medium': return 0.6
      case 'hard': return 0.4 // Hard AI knows humans can be unpredictable
      default: return 0.6
    }
  }

  /**
   * Check if information should be visible to AI
   */
  shouldKnowInformation(infoType: string, sourcePlayer?: number): boolean {
    // Always know own information
    if (sourcePlayer === this.playerIndex) {
      return true
    }

    // Public information is always visible
    const publicInfo = [
      'cards_on_table',
      'current_auctions',
      'artist_values',
      'visible_purchases',
    ]

    if (publicInfo.includes(infoType)) {
      return true
    }

    // Hidden information depends on difficulty
    const hiddenInfo = [
      'exact_money',
      'hand_contents',
      'hidden_bids',
      'future_intentions',
    ]

    if (hiddenInfo.includes(infoType)) {
      switch (this.difficulty) {
        case 'easy': return false
        case 'medium': return Math.random() < 0.3 // Occasionally glimpses
        case 'hard': return Math.random() < 0.6 // Better observation
      }
    }

    return false
  }

  /**
   * Validate that AI is not accessing forbidden information
   */
  validateInformationAccess(
    requestedInfo: string,
    sourcePlayer?: number,
    actualInfo?: any
  ): { allowed: boolean; reason?: string } {
    if (!this.shouldKnowInformation(requestedInfo, sourcePlayer)) {
      return {
        allowed: false,
        reason: `AI difficulty ${this.difficulty} should not have access to ${requestedInfo}`,
      }
    }

    return { allowed: true }
  }
}