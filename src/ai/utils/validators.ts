// ===================
// VALIDATORS
// ===================

import type { Artist, Card, GameState, Player } from '../../types/game'
import type { AuctionState } from '../../types/auction'
import type { AnyAIDecision, AIBidDecision, AICardPlayDecision, AIFixedPriceDecision, AIDoubleOfferDecision, AIHiddenBidDecision, AIOneOfferBidDecision } from '../types'

/**
 * Validation result for AI decisions
 */
export interface ValidationResult {
  /** Whether the decision is valid */
  isValid: boolean
  /** Error messages if invalid */
  errors: string[]
  /** Warnings about the decision */
  warnings: string[]
  /** Confidence in validation (0-1) */
  confidence: number
  /** Whether this violates game rules */
  isRuleViolation: boolean
}

/**
 * Comprehensive validator for AI decisions
 */
export class AIDecisionValidator {
  private gameState: GameState
  private playerIndex: number

  constructor(gameState: GameState, playerIndex: number) {
    this.gameState = gameState
    this.playerIndex = playerIndex
  }

  /**
   * Validate any AI decision
   */
  validate(decision: AnyAIDecision): ValidationResult {
    const baseValidation = this.validateBaseDecision(decision)

    switch (decision.type) {
      case 'card_play':
        return this.validateCardPlayDecision(decision, baseValidation)

      case 'bid':
        return this.validateBidDecision(decision, baseValidation)

      case 'fixed_price':
        return this.validateFixedPriceDecision(decision, baseValidation)

      case 'double_offer':
        return this.validateDoubleOfferDecision(decision, baseValidation)

      case 'hidden_bid':
        return this.validateHiddenBidDecision(decision, baseValidation)

      case 'one_offer_bid':
        return this.validateOneOfferBidDecision(decision, baseValidation)

      default:
        return {
          ...baseValidation,
          isValid: false,
          errors: [...baseValidation.errors, `Unknown decision type: ${(decision as any).type}`],
          isRuleViolation: true,
        }
    }
  }

  /**
   * Validate base decision properties
   */
  private validateBaseDecision(decision: AnyAIDecision): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check confidence is valid
    if (decision.confidence < 0 || decision.confidence > 1) {
      errors.push('Confidence must be between 0 and 1')
    }

    // Check decision time is reasonable
    if (decision.decisionTime && (decision.decisionTime < 0 || decision.decisionTime > 30000)) {
      warnings.push('Decision time seems unusual (negative or > 30 seconds)')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: errors.length === 0 ? 1.0 : 0.0,
      isRuleViolation: false,
    }
  }

  /**
   * Validate card play decision
   */
  private validateCardPlayDecision(
    decision: AICardPlayDecision,
    baseValidation: ValidationResult
  ): ValidationResult {
    const errors = [...baseValidation.errors]
    const warnings = [...baseValidation.warnings]

    const player = this.gameState.players[this.playerIndex]

    // Check if card exists in player's hand
    const cardInHand = player.hand.find(card => card.id === decision.cardId)
    if (!cardInHand) {
      errors.push(`Card ${decision.cardId} not found in player's hand`)
    }

    // Check if it's player's turn to play a card
    const currentPhase = this.gameState.round.phase
    if (currentPhase.type !== 'awaiting_card_play') {
      errors.push('Cannot play card outside of card selection phase')
    } else if (currentPhase.activePlayerIndex !== this.playerIndex) {
      errors.push('Not this player\'s turn to select a card')
    }

    // Check card play rules (would need more game-specific logic)
    if (cardInHand) {
      // Check if playing this card would end the round inappropriately
      const artist = cardInHand.artist
      const currentCount = this.gameState.round.cardsPlayedPerArtist[artist] || 0

      if (currentCount >= 4) {
        warnings.push('Playing this card may end the round')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: errors.length === 0 ? 1.0 : 0.0,
      isRuleViolation: errors.length > 0,
    }
  }

  /**
   * Validate bid decision
   */
  private validateBidDecision(
    decision: AIBidDecision,
    baseValidation: ValidationResult
  ): ValidationResult {
    const errors = [...baseValidation.errors]
    const warnings = [...baseValidation.warnings]

    const player = this.gameState.players[this.playerIndex]

    if (decision.action === 'bid' && decision.amount) {
      // Check if bid amount is valid
      if (decision.amount <= 0) {
        errors.push('Bid amount must be positive')
      }

      // Check if player can afford this bid
      if (decision.amount > player.money) {
        errors.push(`Cannot afford bid of ${decision.amount} with only ${player.money}`)
      }

      // Check if bid is higher than current high bid
      const currentPhase = this.gameState.round.phase
      if (currentPhase.type === 'auction') {
        const auction = currentPhase.auction
        if ('currentHighBid' in auction && auction.currentHighBid) {
          if (decision.amount <= auction.currentHighBid) {
            errors.push(`Bid must be higher than current high bid of ${auction.currentHighBid}`)
          }
        }
      }

      // Warn about very high bids
      if (decision.amount > player.money * 0.8) {
        warnings.push('Bid uses most of player\'s money')
      }
    } else if (decision.action === 'pass') {
      // Check if passing is allowed
      const currentPhase = this.gameState.round.phase
      if (currentPhase.type === 'auction') {
        const auction = currentPhase.auction
        if ('currentHighBid' in auction && !auction.currentHighBid) {
          warnings.push('Passing on opening bid may not be optimal')
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: errors.length === 0 ? 1.0 : 0.0,
      isRuleViolation: errors.length > 0,
    }
  }

  /**
   * Validate fixed price decision
   */
  private validateFixedPriceDecision(
    decision: AIFixedPriceDecision,
    baseValidation: ValidationResult
  ): ValidationResult {
    const errors = [...baseValidation.errors]
    const warnings = [...baseValidation.warnings]

    const player = this.gameState.players[this.playerIndex]

    // Check if price is positive
    if (decision.price <= 0) {
      errors.push('Fixed price must be positive')
    }

    // Check if player can afford to buy at this price
    if (decision.price > player.money) {
      errors.push(`Cannot set price of ${decision.price} with only ${player.money}`)
    }

    // Check if price is reasonable (game-specific rules)
    if (decision.price > 100) { // Assuming max reasonable price
      warnings.push('Price seems unusually high')
    }

    if (decision.price < 1) {
      warnings.push('Price seems unusually low')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: errors.length === 0 ? 1.0 : 0.0,
      isRuleViolation: errors.length > 0,
    }
  }

  /**
   * Validate double offer decision
   */
  private validateDoubleOfferDecision(
    decision: AIDoubleOfferDecision,
    baseValidation: ValidationResult
  ): ValidationResult {
    const errors = [...baseValidation.errors]
    const warnings = [...baseValidation.warnings]

    const player = this.gameState.players[this.playerIndex]

    if (decision.action === 'offer' && decision.cardId) {
      // Check if card exists in player's hand
      const cardInHand = player.hand.find(card => card.id === decision.cardId)
      if (!cardInHand) {
        errors.push(`Card ${decision.cardId} not found in player's hand`)
      }

      // Check if card matches double card (would need auction context)
      // This would need to be implemented with specific game logic
      warnings.push('Double offer validation needs auction context')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: errors.length === 0 ? 1.0 : 0.0,
      isRuleViolation: errors.length > 0,
    }
  }

  /**
   * Validate hidden bid decision
   */
  private validateHiddenBidDecision(
    decision: AIHiddenBidDecision,
    baseValidation: ValidationResult
  ): ValidationResult {
    const errors = [...baseValidation.errors]
    const warnings = [...baseValidation.warnings]

    const player = this.gameState.players[this.playerIndex]

    // Check if bid amount is non-negative
    if (decision.amount < 0) {
      errors.push('Hidden bid cannot be negative')
    }

    // Check if player can afford this bid
    if (decision.amount > player.money) {
      errors.push(`Cannot afford hidden bid of ${decision.amount} with only ${player.money}`)
    }

    // Warn about bidding 0 (passing)
    if (decision.amount === 0) {
      warnings.push('Bidding 0 means passing in hidden auction')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: errors.length === 0 ? 1.0 : 0.0,
      isRuleViolation: errors.length > 0,
    }
  }

  /**
   * Validate one-offer bid decision
   */
  private validateOneOfferBidDecision(
    decision: AIOneOfferBidDecision,
    baseValidation: ValidationResult
  ): ValidationResult {
    const errors = [...baseValidation.errors]
    const warnings = [...baseValidation.warnings]

    const player = this.gameState.players[this.playerIndex]

    if (decision.action === 'bid' && decision.amount) {
      // Check if bid amount is positive
      if (decision.amount <= 0) {
        errors.push('Bid amount must be positive')
      }

      // Check if player can afford this bid
      if (decision.amount > player.money) {
        errors.push(`Cannot afford bid of ${decision.amount} with only ${player.money}`)
      }

      // Check if bid is higher than current bid (would need auction context)
      warnings.push('One-offer bid validation needs auction context')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: errors.length === 0 ? 1.0 : 0.0,
      isRuleViolation: errors.length > 0,
    }
  }
}

/**
 * Game state validator
 */
export class GameStateValidator {
  /**
   * Validate that game state is consistent
   */
  static validateGameState(gameState: GameState): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check player count
    if (gameState.players.length < 3 || gameState.players.length > 5) {
      errors.push(`Invalid player count: ${gameState.players.length}. Must be 3-5.`)
    }

    // Check player money
    gameState.players.forEach((player, index) => {
      if (player.money < 0) {
        errors.push(`Player ${index} has negative money: ${player.money}`)
      }

      if (player.money > 200) { // Assuming reasonable max
        warnings.push(`Player ${index} has unusually high money: ${player.money}`)
      }
    })

    // Check round number
    if (gameState.round.roundNumber < 1 || gameState.round.roundNumber > 4) {
      errors.push(`Invalid round number: ${gameState.round.roundNumber}. Must be 1-4.`)
    }

    // Check auctioneer index
    if (gameState.round.currentAuctioneerIndex < 0 ||
        gameState.round.currentAuctioneerIndex >= gameState.players.length) {
      errors.push(`Invalid auctioneer index: ${gameState.round.currentAuctioneerIndex}`)
    }

    // Check artist card counts
    const artists: Artist[] = [
      'Manuel Carvalho',
      'Sigrid Thaler',
      'Daniel Melim',
      'Ramon Martins',
      'Rafael Silveira',
    ]

    artists.forEach(artist => {
      const totalPlayed = gameState.board.playedCards[artist]?.length || 0
      const roundCount = gameState.round.cardsPlayedPerArtist[artist] || 0

      if (totalPlayed !== roundCount) {
        errors.push(`Inconsistent ${artist} card counts: board has ${totalPlayed}, round has ${roundCount}`)
      }

      if (totalPlayed > 5) {
        errors.push(`${artist} has more than 5 cards played: ${totalPlayed}`)
      }
    })

    // Check deck consistency
    const totalCards = this.getTotalCardCount()
    const accountedCards =
      gameState.deck.length +
      gameState.discardPile.length +
      gameState.players.reduce((sum, player) => sum + player.hand.length, 0) +
      Object.values(gameState.board.playedCards).reduce((sum, cards) => sum + cards.length, 0)

    if (accountedCards > totalCards) {
      errors.push(`More cards accounted for (${accountedCards}) than exist in game (${totalCards})`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: errors.length === 0 ? 1.0 : 0.0,
      isRuleViolation: errors.length > 0,
    }
  }

  /**
   * Get total card count in game
   */
  private static getTotalCardCount(): number {
    return 70 // Total cards in Modern Art
  }

  /**
   * Check if move is legal in current game context
   */
  static checkMoveLegality(
    gameState: GameState,
    playerIndex: number,
    move: AnyAIDecision
  ): ValidationResult {
    // Use decision validator with game state context
    const validator = new AIDecisionValidator(gameState, playerIndex)
    return validator.validate(move)
  }
}

/**
 * Utility functions for validation
 */
export const ValidationUtils = {
  /**
   * Check if value is within range
   */
  isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max
  },

  /**
   * Check if player has enough money
   */
  canAfford(player: Player, cost: number): boolean {
    return player.money >= cost
  },

  /**
   * Check if artist has reached card limit
   */
  hasReachedCardLimit(gameState: GameState, artist: Artist): boolean {
    return (gameState.round.cardsPlayedPerArtist[artist] || 0) >= 5
  },

  /**
   * Check if it's player's turn
   */
  isPlayerTurn(gameState: GameState, playerIndex: number): boolean {
    const currentPhase = gameState.round.phase
    return currentPhase.type === 'awaiting_card_play' &&
           currentPhase.activePlayerIndex === playerIndex
  },

  /**
   * Check if auction is active
   */
  isAuctionActive(gameState: GameState): boolean {
    return gameState.round.phase.type === 'auction'
  },

  /**
   * Create default validation result
   */
  createValidationResult(
    isValid: boolean,
    errors: string[] = [],
    warnings: string[] = [],
    confidence: number = 1.0
  ): ValidationResult {
    return {
      isValid,
      errors,
      warnings,
      confidence,
      isRuleViolation: errors.length > 0,
    }
  },

  /**
   * Combine multiple validation results
   */
  combineValidationResults(results: ValidationResult[]): ValidationResult {
    const allErrors = results.flatMap(r => r.errors)
    const allWarnings = results.flatMap(r => r.warnings)
    const allValid = results.every(r => r.isValid)
    const minConfidence = Math.min(...results.map(r => r.confidence))
    const hasRuleViolations = results.some(r => r.isRuleViolation)

    return {
      isValid: allValid,
      errors: allErrors,
      warnings: allWarnings,
      confidence: minConfidence,
      isRuleViolation: hasRuleViolations,
    }
  },
}