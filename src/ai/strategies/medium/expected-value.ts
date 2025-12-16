// ===================
// MEDIUM AI EXPECTED VALUE
// ===================

import type { Artist, Card, GameState } from '../../../types/game'
import type { MarketAnalysis, CardEvaluation } from '../../types'
import { createProbabilityUtils } from '../../utils'

/**
 * Expected value calculator for Medium AI
 * Uses mathematical analysis to make optimal decisions
 */
export class ExpectedValueCalculator {
  private probability = createProbabilityUtils()

  /**
   * Calculate expected value of a card
   */
  calculateCardEV(card: Card, context: MarketAnalysis, roundNumber: number): number {
    const artistCompetitiveness = context.artistCompetitiveness[card.artist]
    const remainingCards = context.remainingCards[card.artist]

    // Base value from current artist ranking
    let expectedValue = artistCompetitiveness.expectedFinalValue

    // Adjust for auction type complexity
    const auctionTypeMultipliers: Record<string, number> = {
      open: 1.0,
      one_offer: 0.95,
      hidden: 0.9,
      fixed_price: 1.1,
      double: 0.85,
    }

    expectedValue *= auctionTypeMultipliers[card.auctionType] || 1.0

    // Adjust for market volatility
    const volatilityAdjustment = 1.0 - (context.volatility * 0.2)
    expectedValue *= volatilityAdjustment

    // Adjust for cards remaining (supply and demand)
    if (remainingCards === 0) {
      expectedValue *= 1.3 // Last cards are valuable
    } else if (remainingCards < 3) {
      expectedValue *= 1.1 // Scarce cards are more valuable
    } else if (remainingCards > 10) {
      expectedValue *= 0.9 // Abundant cards are less valuable
    }

    // Round-based adjustments
    const roundMultiplier = this.getRoundMultiplier(roundNumber, artistCompetitiveness.rank)
    expectedValue *= roundMultiplier

    return Math.max(0, expectedValue)
  }

  /**
   * Calculate bid EV based on current auction state
   */
  calculateBidEV(
    card: Card,
    bidAmount: number,
    currentPlayerMoney: number,
    context: MarketAnalysis,
    competitionLevel: 'low' | 'medium' | 'high'
  ): { ev: number; winProbability: number; risk: number } {
    const cardEV = this.calculateCardEV(card, context, 1) // Round 1 for base value

    // Estimate win probability based on bid amount and competition
    const winProbability = this.calculateWinProbability(
      bidAmount,
      cardEV,
      currentPlayerMoney,
      competitionLevel
    )

    // Expected value if we win
    const winValue = cardEV - bidAmount

    // Expected value if we lose (just the bid amount we don't spend)
    const loseValue = 0

    // Overall EV
    const ev = (winProbability * winValue) + ((1 - winProbability) * loseValue)

    // Risk assessment
    const risk = this.calculateBidRisk(bidAmount, currentPlayerMoney, cardEV)

    return {
      ev: Math.max(0, ev),
      winProbability,
      risk,
    }
  }

  /**
   * Calculate probability of winning with given bid
   */
  private calculateWinProbability(
    bidAmount: number,
    cardValue: number,
    playerMoney: number,
    competitionLevel: 'low' | 'medium' | 'high'
  ): number {
    // Base probability from bid vs value ratio
    const bidToValueRatio = bidAmount / Math.max(1, cardValue)

    let baseProbability: number

    if (bidToValueRatio < 0.3) {
      baseProbability = 0.9 // Very low bid, likely to win
    } else if (bidToValueRatio < 0.6) {
      baseProbability = 0.7 // Low bid, good chance to win
    } else if (bidToValueRatio < 0.9) {
      baseProbability = 0.5 // Moderate bid, 50/50 chance
    } else if (bidToValueRatio < 1.2) {
      baseProbability = 0.3 // High bid, less likely to win
    } else {
      baseProbability = 0.1 // Very high bid, unlikely to win
    }

    // Adjust for competition level
    const competitionMultipliers = {
      low: 1.2,
      medium: 1.0,
      high: 0.8,
    }

    return Math.max(0.05, Math.min(0.95, baseProbability * competitionMultipliers[competitionLevel]))
  }

  /**
   * Calculate risk of bidding amount
   */
  private calculateBidRisk(bidAmount: number, playerMoney: number, cardValue: number): number {
    // Risk based on percentage of money being bid
    const moneyRisk = bidAmount / playerMoney

    // Risk based on overpaying relative to card value
    const overpayRisk = Math.max(0, bidAmount - cardValue) / Math.max(1, cardValue)

    // Combine risks (weighted average)
    const combinedRisk = (moneyRisk * 0.6) + (overpayRisk * 0.4)

    return Math.max(0, Math.min(1, combinedRisk))
  }

  /**
   * Calculate optimal bid amount
   */
  calculateOptimalBid(
    card: Card,
    currentPlayerMoney: number,
    context: MarketAnalysis,
    currentHighBid: number | null,
    competitionLevel: 'low' | 'medium' | 'high'
  ): { amount: number; ev: number; confidence: number } {
    const cardEV = this.calculateCardEV(card, context, 1)
    const minBid = (currentHighBid || 0) + 1

    // Search for optimal bid amount
    let bestBid = minBid
    let bestEV = -Infinity
    let bestConfidence = 0

    // Try different bid amounts (limited search for performance)
    const maxBid = Math.min(currentPlayerMoney, Math.min(cardEV * 1.5, currentHighBid ? currentHighBid + 30 : 40))
    const bidStep = Math.max(1, Math.floor((maxBid - minBid) / 20)) // Try at most 20 different amounts

    for (let bid = minBid; bid <= maxBid; bid += bidStep) {
      const result = this.calculateBidEV(card, bid, currentPlayerMoney, context, competitionLevel)

      // Adjust EV based on confidence
      const confidence = this.calculateBidConfidence(bid, currentPlayerMoney, competitionLevel)
      const adjustedEV = result.ev * confidence

      if (adjustedEV > bestEV) {
        bestEV = adjustedEV
        bestBid = bid
        bestConfidence = confidence
      }
    }

    return {
      amount: bestBid,
      ev: bestEV,
      confidence: bestConfidence,
    }
  }

  /**
   * Calculate confidence in bid decision
   */
  private calculateBidConfidence(
    bidAmount: number,
    playerMoney: number,
    competitionLevel: 'low' | 'medium' | 'high'
  ): number {
    let confidence = 0.7 // Base confidence

    // Higher confidence for conservative bids
    const moneyRatio = bidAmount / playerMoney
    if (moneyRatio < 0.2) {
      confidence += 0.2
    } else if (moneyRatio < 0.4) {
      confidence += 0.1
    } else if (moneyRatio > 0.6) {
      confidence -= 0.2
    }

    // Adjust based on competition
    const competitionAdjustments = {
      low: 0.1,
      medium: 0.0,
      high: -0.1,
    }

    confidence += competitionAdjustments[competitionLevel]

    return Math.max(0.3, Math.min(1.0, confidence))
  }

  /**
   * Calculate round multiplier for EV calculations
   */
  private getRoundMultiplier(roundNumber: number, artistRank: number): number {
    // Later rounds have higher stakes
    const roundMultipliers = [0.8, 1.0, 1.2, 1.4] // Rounds 1-4
    let multiplier = roundMultipliers[roundNumber - 1] || 1.0

    // Artist rank matters more in later rounds
    if (roundNumber >= 3) {
      if (artistRank <= 2) {
        multiplier += 0.2 // Top artists are more valuable late game
      } else if (artistRank >= 4) {
        multiplier -= 0.1 // Lower artists are less valuable late game
      }
    }

    return multiplier
  }

  /**
   * Calculate expected value of artist control
   */
  calculateArtistControlEV(
    artist: Artist,
    currentCards: number,
    targetCards: number,
    context: MarketAnalysis
  ): number {
    const artistCompetitiveness = context.artistCompetitiveness[artist]
    const cardsNeeded = Math.max(0, targetCards - currentCards)
    const remainingCards = context.remainingCards[artist]

    if (cardsNeeded === 0) {
      return artistCompetitiveness.expectedFinalValue
    }

    if (remainingCards === 0) {
      return 0 // Can't achieve control
    }

    // Probability of getting needed cards
    const cardProbability = Math.min(1, remainingCards / Math.max(1, cardsNeeded))

    // Value if achieved
    const achievedValue = artistCompetitiveness.expectedFinalValue

    // Cost of pursuing control (opportunity cost)
    const controlCost = cardsNeeded * 15 // Rough estimate of card acquisition cost

    // Expected value
    const ev = (cardProbability * achievedValue) - ((1 - cardProbability) * controlCost * 0.5)

    return Math.max(0, ev)
  }

  /**
   * Calculate portfolio EV (value of all paintings player owns)
   */
  calculatePortfolioEV(
    playerCards: Card[],
    context: MarketAnalysis,
    roundNumber: number
  ): { currentEV: number; futureEV: number; risk: number } {
    let currentEV = 0
    let futureEV = 0
    let totalRisk = 0

    playerCards.forEach(card => {
      const cardEV = this.calculateCardEV(card, context, roundNumber)
      currentEV += cardEV

      // Future EV considers potential value appreciation
      const artistCompetitiveness = context.artistCompetitiveness[card.artist]
      const appreciationPotential = artistCompetitiveness.marketControl * 20
      futureEV += cardEV + appreciationPotential

      // Risk based on artist competitiveness
      totalRisk += (5 - artistCompetitiveness.rank) * 0.1 // Higher rank = lower risk
    })

    const averageRisk = playerCards.length > 0 ? totalRisk / playerCards.length : 0

    return {
      currentEV,
      futureEV,
      risk: Math.min(1, averageRisk),
    }
  }

  /**
   * Monte Carlo simulation for complex decisions
   */
  simulateDecisionEV<T>(
    simulations: number,
    simulation: (rng: any) => T,
    evaluator: (result: T) => number
  ): { ev: number; confidence: number; distribution: { min: number; max: number; p50: number; p90: number } } {
    const results: number[] = []

    for (let i = 0; i < simulations; i++) {
      const rng = this.probability.rng
      const result = simulation(rng)
      const value = evaluator(result)
      results.push(value)
    }

    results.sort((a, b) => a - b)

    const ev = results.reduce((sum, value) => sum + value, 0) / results.length

    // Calculate confidence (inverse of variance)
    const variance = results.reduce((sum, value) => sum + Math.pow(value - ev, 2), 0) / results.length
    const confidence = Math.max(0.1, 1 - (Math.sqrt(variance) / Math.max(1, ev)))

    const distribution = {
      min: results[0],
      max: results[results.length - 1],
      p50: results[Math.floor(results.length * 0.5)],
      p90: results[Math.floor(results.length * 0.9)],
    }

    return { ev, confidence, distribution }
  }
}