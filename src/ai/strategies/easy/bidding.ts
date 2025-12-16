// ===================
// EASY AI BIDDING
// ===================

import type { GameState, Player } from '../../../types/game'
import type { AIDecisionContext } from '../../types'
import { createProbabilityUtils } from '../../utils'

/**
 * Easy AI bidding utilities
 * Random but within valid ranges
 */
export class EasyAIBidding {
  private probability = createProbabilityUtils()

  /**
   * Calculate random bid range
   */
  getRandomBidRange(
    player: Player,
    currentHighBid: number | null,
    auctionType: string
  ): { min: number; max: number } {
    const minBid = (currentHighBid || 0) + 1

    let maxBid: number

    switch (auctionType) {
      case 'open':
        // Open auction: willing to bid up to 30% of money
        maxBid = Math.min(player.money, Math.max(minBid, Math.floor(player.money * 0.3)))
        break

      case 'one_offer':
        // One-offer: more conservative, up to 25% of money
        maxBid = Math.min(player.money, Math.max(minBid, Math.floor(player.money * 0.25)))
        break

      case 'hidden':
        // Hidden: random amounts, but not too high
        maxBid = Math.min(player.money, Math.max(minBid, 20))
        break

      default:
        // Default: up to 20% of money
        maxBid = Math.min(player.money, Math.max(minBid, Math.floor(player.money * 0.2)))
        break
    }

    // Ensure reasonable bounds
    maxBid = Math.max(maxBid, minBid)

    return { min: minBid, max }
  }

  /**
   * Decide whether to bid or pass
   */
  shouldBid(
    player: Player,
    currentHighBid: number | null,
    auctionType: string,
    moneyPressure: number = 0.5
  ): boolean {
    // Random bid tendency
    const bidTendency = this.probability.random()

    // Adjust tendency based on factors
    let adjustedTendency = bidTendency

    // Less likely to bid if high bid already exists
    if (currentHighBid && currentHighBid > player.money * 0.5) {
      adjustedTendency -= 0.3
    }

    // More likely to bid in open auctions (they're simpler)
    if (auctionType === 'open') {
      adjustedTendency += 0.2
    }

    // Less likely to bid if low on money
    if (moneyPressure > 0.7) {
      adjustedTendency -= 0.2
    }

    // Easy AI has 40% base bid probability
    return adjustedTendency < 0.4
  }

  /**
   * Generate random bid amount
   */
  generateRandomBid(
    player: Player,
    currentHighBid: number | null,
    auctionType: string
  ): number {
    const { min, max } = this.getRandomBidRange(player, currentHighBid, auctionType)

    if (min > max) {
      return 0 // Can't afford to bid
    }

    // Easy AI uses uniform distribution
    return this.probability.randomInt(min, max)
  }

  /**
   * Generate hidden bid (can be 0)
   */
  generateHiddenBid(player: Player): number {
    // 60% chance to bid 0
    if (this.probability.random() < 0.6) {
      return 0
    }

    // If bidding, choose random amount
    const maxBid = Math.min(player.money, 25)
    return this.probability.randomInt(1, maxBid)
  }

  /**
   * Calculate random fixed price
   */
  generateFixedPrice(player: Player): number {
    // Choose price between 10 and 60% of money
    const minPrice = 10
    const maxPrice = Math.max(minPrice, Math.floor(player.money * 0.6))

    return this.probability.randomInt(minPrice, maxPrice)
  }

  /**
   * Decide to accept fixed price as auctioneer
   */
  shouldAcceptFixedPrice(price: number, player: Player): boolean {
    // Random decision with some logic
    const acceptanceChance = this.probability.random()

    // More likely to accept if price is reasonable
    if (price <= player.money * 0.3) {
      return acceptanceChance < 0.7
    } else if (price <= player.money * 0.5) {
      return acceptanceChance < 0.5
    } else {
      return acceptanceChance < 0.2
    }
  }

  /**
   * Decide timing for bid (human-like delays)
   */
  getBidTiming(): number {
    // Easy AI thinks quickly but with some variation
    const baseTime = 500 + this.probability.random() * 1000 // 0.5-1.5 seconds
    const humanPause = this.probability.random() < 0.3 ? 500 : 0 // Occasional pause
    const variation = (this.probability.random() - 0.5) * 500 // ±250ms variation

    return Math.max(200, baseTime + humanPause + variation)
  }

  /**
   * Generate reasoning for bid decision
   */
  generateBidReasoning(
    action: 'bid' | 'pass',
    amount?: number,
    auctionType?: string
  ): string {
    if (action === 'pass') {
      const passReasons = [
        'Easy AI: Decided not to bid',
        'Easy AI: Saving money for later',
        'Easy AI: Randomly chose to pass',
        'Easy AI: Not interested in this auction',
      ]
      return this.probability.randomChoice(passReasons)
    }

    if (!amount) {
      return 'Easy AI: Made a bid decision'
    }

    const bidReasons = [
      `Easy AI: Bid ${amount} randomly`,
      `Easy AI: Felt like bidding ${amount}`,
      `Easy AI: Chose ${amount} for fun`,
      `Easy AI: Random bid of ${amount}`,
    ]

    return this.probability.randomChoice(bidReasons)
  }

  /**
   * Calculate bid confidence based on randomness
   */
  calculateBidConfidence(
    action: 'bid' | 'pass',
    playerMoney: number,
    bidAmount?: number
  ): number {
    if (action === 'pass') {
      return 0.3 + this.probability.random() * 0.3 // 0.3-0.6
    }

    if (!bidAmount) {
      return 0.4
    }

    // Higher confidence for smaller bids relative to money
    const moneyRatio = bidAmount / playerMoney
    const baseConfidence = 0.4

    if (moneyRatio < 0.2) {
      return baseConfidence + this.probability.random() * 0.3
    } else if (moneyRatio < 0.5) {
      return baseConfidence + this.probability.random() * 0.2
    } else {
      return baseConfidence + this.probability.random() * 0.1
    }
  }
}