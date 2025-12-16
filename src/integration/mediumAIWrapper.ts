import type { GameState, Player } from '../types/game'
import type { AuctionState } from '../types/auction'
import type { AIDecision } from '../ai/types'
import { MediumAIStrategy } from '../ai/strategies/medium/strategy'

/**
 * Wrapper for Medium AI Strategy with simplified interface
 * This provides a cleaner interface to use the existing medium AI without complex dependencies
 */
export class MediumAIWrapper {
  private strategies = new Map<string, MediumAIStrategy>()

  /**
   * Get or create a medium AI strategy for a player
   */
  private getStrategy(player: Player): MediumAIStrategy {
    if (!this.strategies.has(player.id)) {
      const strategy = new MediumAIStrategy({
        difficulty: 'medium',
        seed: Date.now() + Math.random() * 1000
      })
      this.strategies.set(player.id, strategy)
    }
    return this.strategies.get(player.id)!
  }

  /**
   * Make a decision for the player in the current auction
   */
  async makeAuctionDecision(
    player: Player,
    auction: AuctionState,
    gameState: GameState
  ): Promise<AIDecision | null> {
    // Simulate thinking time
    const delay = 1000 + Math.random() * 1000
    await new Promise(resolve => setTimeout(resolve, delay))

    const strategy = this.getStrategy(player)

    // Create a minimal context with just what we need
    const minimalContext = {
      roundNumber: gameState.round.roundNumber,
      currentPhase: gameState.round.phase.type,
      players: gameState.players.map(p => ({
        id: p.id,
        name: p.name,
        handCount: p.hand.length,
        money: p.money
      })),
      myHand: player.hand,
      myMoney: player.money,
      myIndex: gameState.players.findIndex(p => p.id === player.id)
    }

    try {
      let decisionType: string

      switch (auction.type) {
        case 'one_offer':
          if (auction.phase === 'bidding') {
            decisionType = 'bid'
            const decision = await strategy.makeDecision(decisionType as any, minimalContext, { auction })
            return this.adaptOneOfferDecision(decision, player, auction)
          } else if (auction.phase === 'auctioneer_decision' && player.id === auction.auctioneerId) {
            return this.makeAuctioneerDecision(player, auction)
          }
          break

        case 'open':
          decisionType = 'bid'
          const openDecision = await strategy.makeDecision(decisionType as any, minimalContext, { auction })
          return this.adaptOpenAuctionDecision(openDecision, player, auction)

        case 'hidden':
          decisionType = 'hidden_bid'
          const hiddenDecision = await strategy.makeDecision(decisionType as any, minimalContext, { auction })
          return this.adaptHiddenAuctionDecision(hiddenDecision, player, auction)

        case 'fixed_price':
          decisionType = 'bid'
          const fixedDecision = await strategy.makeDecision(decisionType as any, minimalContext, { auction })
          return this.adaptFixedPriceDecision(fixedDecision, player, auction)

        case 'double':
          if (!auction.secondCard && auction.currentAuctioneerId === player.id) {
            return this.makeDoubleOfferDecision(player, auction)
          }
          break

        default:
          return null
      }
    } catch (error) {
      console.error(`Medium AI error for ${player.name}:`, error)
      // Fall back to simple decision if AI fails
      return this.makeFallbackDecision(player, auction)
    }

    return null
  }

  /**
   * Adapt One Offer bidding decision from medium AI format
   */
  private adaptOneOfferDecision(decision: any, player: Player, auction: any): AIDecision | null {
    if (decision.action === 'bid' && decision.amount) {
      return {
        type: 'bid',
        action: 'bid',
        amount: decision.amount
      }
    } else if (decision.action === 'pass') {
      return {
        type: 'bid',
        action: 'pass'
      }
    }
    return null
  }

  /**
   * Make auctioneer decision in One Offer auction
   */
  private async makeAuctioneerDecision(player: Player, auction: any): Promise<AIDecision | null> {
    // Simple logic for now - can be enhanced
    if (auction.currentBid === 0 || !auction.currentBidderId) {
      // No bids - take for free
      return {
        type: 'bid',
        action: 'take_free'
      }
    }

    const bidValue = auction.currentBid

    // Use medium AI's evaluation logic
    const card = auction.card
    const cardValue = this.estimateCardValue(card, player)

    // More intelligent auctioneer logic
    const profitMargin = cardValue - bidValue

    // Accept if good profit or can't afford to outbid by much
    if (profitMargin > cardValue * 0.3 || bidValue > player.money * 0.85) {
      // Good profit or bid is too high relative to our money
      return {
        type: 'bid',
        action: 'accept'
      }
    }

    // Outbid by minimum if we think card is worth more
    const outbidAmount = bidValue + 1
    if (outbidAmount <= player.money && profitMargin > -cardValue * 0.2) {
      return {
        type: 'bid',
        action: 'outbid',
        amount: outbidAmount
      }
    }

    // Default to accept
    return {
      type: 'bid',
      action: 'accept'
    }
  }

  /**
   * Adapt open auction decision
   */
  private adaptOpenAuctionDecision(decision: any, player: Player, auction: any): AIDecision | null {
    if (decision.action === 'bid' && decision.amount) {
      return {
        type: 'bid',
        action: 'bid',
        amount: decision.amount
      }
    } else if (decision.action === 'pass') {
      return {
        type: 'bid',
        action: 'pass'
      }
    }
    return null
  }

  /**
   * Adapt hidden auction decision
   */
  private adaptHiddenAuctionDecision(decision: any, player: Player, auction: any): AIDecision | null {
    if (decision.action === 'bid' && decision.amount) {
      return {
        type: 'hidden_bid',
        amount: decision.amount
      }
    }
    return null
  }

  /**
   * Adapt fixed price decision
   */
  private adaptFixedPriceDecision(decision: any, player: Player, auction: any): AIDecision | null {
    if (decision.action === 'buy') {
      return {
        type: 'bid',
        action: 'buy'
      }
    } else if (decision.action === 'pass') {
      return {
        type: 'bid',
        action: 'pass'
      }
    }
    return null
  }

  /**
   * Make double auction offer decision
   */
  private makeDoubleOfferDecision(player: Player, auction: any): AIDecision | null {
    const matchingCards = player.hand.filter(
      card => card.artist === auction.doubleCard.artist && card.auctionType !== 'double'
    )

    if (matchingCards.length > 0) {
      return {
        type: 'bid',
        action: 'offer',
        cardId: matchingCards[0].id
      }
    }

    return null
  }

  /**
   * Fallback simple decision when medium AI fails
   */
  private makeFallbackDecision(player: Player, auction: any): AIDecision | null {
    // Use simple logic as fallback
    if (auction.type === 'one_offer') {
      if (auction.phase === 'bidding' && player.id !== auction.auctioneerId) {
        // Increased from 0.3 to 0.5 - more likely to bid
        const shouldBid = Math.random() < 0.5
        if (shouldBid && player.money > 10) {
          // Increased money limit from 0.25 to 0.4
          const maxBid = Math.min(player.money * 0.4, 30) // Cap at 30 for sanity
          const minBid = (auction.currentBid || 0) + 1

          if (minBid <= maxBid) {
            const bidAmount = Math.floor(Math.random() * (maxBid - minBid + 1)) + minBid
            return {
              type: 'bid',
              action: 'bid',
              amount: bidAmount
            }
          }
        }
        return {
          type: 'bid',
          action: 'pass'
        }
      }
    }
    return null
  }

  /**
   * Estimate card value for decision making
   */
  private estimateCardValue(card: any, player: Player): number {
    // Simple valuation based on auction type
    const baseValues = {
      'open': 20,
      'one_offer': 25,
      'hidden': 15,
      'fixed_price': 18,
      'double': 30
    }
    return baseValues[card.auctionType] || 20
  }
}