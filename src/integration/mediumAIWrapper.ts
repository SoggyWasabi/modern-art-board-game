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
          console.log(`${player.name} making open auction decision...`)
          const openDecision = await strategy.makeDecision(decisionType as any, minimalContext, { auction })
          console.log(`${player.name} raw strategy decision:`, openDecision)
          const adaptedDecision = this.adaptOpenAuctionDecision(openDecision, player, auction)
          console.log(`${player.name} adapted decision:`, adaptedDecision)
          return adaptedDecision

        case 'hidden':
          decisionType = 'hidden_bid'
          const hiddenDecision = await strategy.makeDecision(decisionType as any, minimalContext, { auction })
          return this.adaptHiddenAuctionDecision(hiddenDecision, player, auction)

        case 'fixed_price':
          if (auction.price === 0) {
            // Price setting phase - auctioneer sets the price
            if (player.id === auction.auctioneerId) {
              decisionType = 'fixed_price'
              const fixedDecision = await strategy.makeDecision(decisionType as any, minimalContext, { auction })
              return this.adaptFixedPriceDecision(fixedDecision, player, auction)
            }
          } else {
            // Buying phase - players decide to buy or pass
            if (auction.turnOrder[auction.currentTurnIndex] === player.id) {
              decisionType = 'buy'
              const buyDecision = await strategy.makeDecision(decisionType as any, minimalContext, { auction })
              return this.adaptFixedPriceDecision(buyDecision, player, auction)
            }
          }
          break

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
    // Hidden bid decisions have 'amount' directly (no 'action' field)
    // The type is 'hidden_bid' from the strategy
    if (decision.amount !== undefined && decision.amount >= 0) {
      return {
        type: 'bid',
        action: 'bid',
        amount: decision.amount
      }
    } else if (decision.action === 'bid' && decision.amount !== undefined) {
      // Also handle cases where action is explicitly set
      return {
        type: 'bid',
        action: 'bid',
        amount: decision.amount
      }
    } else if (decision.action === 'pass') {
      // Pass = bid 0 in hidden auctions
      return {
        type: 'bid',
        action: 'bid',
        amount: 0
      }
    }
    return null
  }

  /**
   * Adapt fixed price decision
   */
  private adaptFixedPriceDecision(decision: any, player: Player, auction: any): AIDecision | null {
    // Handle price setting (from strategy)
    if (decision.action === 'set_price' || decision.price !== undefined) {
      return {
        type: 'bid',
        action: 'set_price',
        amount: decision.price || decision.amount
      }
    }
    // Handle buy/pass decisions (from strategy)
    else if (decision.action === 'buy') {
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
    // Use smarter logic as fallback
    if (auction.type === 'open') {
      const currentBid = auction.currentBid || 0
      const playerMoney = player.money

      console.log(`Open auction fallback for ${player.name}: money=$${playerMoney}k, current bid=$${currentBid}k`)

      // SMART BIDDING LOGIC:

      // 1. Don't bid if you're already the highest bidder
      if (auction.currentBidderId === player.id) {
        console.log(`  Already highest bidder, passing`)
        return {
          type: 'bid',
          action: 'pass',
          confidence: 0.9,
          reasoning: 'Already winning the auction'
        }
      }

      // 2. Calculate maximum reasonable bid (don't overpay)
      // Base value calculation: consider card value and money situation
      const maxReasonableBid = Math.min(
        playerMoney * 0.4,  // Never bid more than 40% of total money
        currentBid + 15,    // Don't increase bid by more than 15k at once
        35                  // Hard cap of 35k for any single card
      )

      // 3. Calculate minimum bid needed
      const minBid = currentBid + 1

      // 4. Decide whether to bid based on value assessment
      let shouldBid = false
      let reasoning = ''

      // Factors that increase likelihood to bid:
      const cardValueScore = this.estimateCardValue(auction.card, player)
      const moneyPressure = playerMoney < 20 ? 0.3 : 1.0  // Less likely if low on money
      const bidPressure = currentBid > 25 ? 0.4 : 1.0      // Less likely if price is already high

      const bidProbability = cardValueScore * moneyPressure * bidPressure

      shouldBid = Math.random() < bidProbability

      if (bidProbability < 0.3) {
        reasoning = 'Card seems overvalued or too expensive'
      } else if (moneyPressure < 0.5) {
        reasoning = 'Low on money, being conservative'
      } else if (bidPressure < 0.5) {
        reasoning = 'Price already too high'
      } else {
        reasoning = 'Good value opportunity'
      }

      console.log(`  Bid probability: ${(bidProbability * 100).toFixed(1)}%, reasoning: ${reasoning}`)

      // 5. Make decision
      if (shouldBid && minBid <= maxReasonableBid && minBid <= playerMoney) {
        // Calculate smart bid amount
        let bidAmount: number

        if (currentBid === 0) {
          // Opening bid - bid conservatively
          bidAmount = Math.min(Math.max(5, Math.floor(playerMoney * 0.1)), 15)
        } else {
          // Counter bid - small increments
          const increment = Math.min(
            Math.floor(Math.random() * 3) + 1,  // 1-3k increment
            Math.floor(maxReasonableBid - currentBid)
          )
          bidAmount = currentBid + increment
        }

        console.log(`  Smart bid: $${bidAmount}k (was considering up to $${maxReasonableBid}k)`)

        return {
          type: 'bid',
          action: 'bid',
          amount: bidAmount,
          confidence: Math.min(0.8, bidProbability),
          reasoning: `${reasoning} - bidding $${bidAmount}k`
        }
      } else {
        console.log(`  Passing: ${minBid > maxReasonableBid ? 'price too high' : 'choosing not to bid'}`)
        return {
          type: 'bid',
          action: 'pass',
          confidence: 0.7,
          reasoning: reasoning
        }
      }
    } else if (auction.type === 'one_offer') {
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
    } else if (auction.type === 'hidden') {
      // Hidden auction fallback - bid a random amount between 0 and 30% of money
      const maxBid = Math.floor(player.money * 0.3)
      const bidAmount = Math.floor(Math.random() * (maxBid + 1))
      return {
        type: 'bid',
        action: 'bid',
        amount: bidAmount
      }
    } else if (auction.type === 'fixed_price') {
      // Fixed price fallback logic
      console.log(`Fixed price auction fallback for ${player.name}: money=$${player.money}k, price=$${auction.price}k`)

      if (auction.price === 0) {
        // Price setting phase - auctioneer sets price
        if (player.id === auction.auctioneerId) {
          // Set price between 10-30% of money, but at least 5k
          const minPrice = Math.min(5, Math.max(1, Math.floor(player.money * 0.1)))
          const maxPrice = Math.min(30, Math.floor(player.money * 0.3))
          const setPrice = Math.floor(Math.random() * (maxPrice - minPrice + 1)) + minPrice

          console.log(`  Auctioneer setting price: $${setPrice}k`)
          return {
            type: 'bid',
            action: 'set_price',
            amount: setPrice
          }
        }
      } else {
        // Buying phase - player decides to buy or pass
        if (auction.turnOrder[auction.currentTurnIndex] === player.id) {
          // Evaluate if price is good value (simple heuristic)
          const cardValue = this.estimateCardValue(auction.card, player)
          const priceReasonable = auction.price <= player.money * 0.4 && auction.price <= cardValue * 1.5

          if (priceReasonable && Math.random() < 0.6) {
            console.log(`  Buying at $${auction.price}k (card value: ${cardValue.toFixed(1)})`)
            return {
              type: 'bid',
              action: 'buy'
            }
          } else {
            console.log(`  Passing on $${auction.price}k`)
            return {
              type: 'bid',
              action: 'pass'
            }
          }
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

  /**
   * Simple card value estimation based on artist and player's hand
   */
  private estimateCardValue(card: any, player: Player): number {
    // Base value by auction type
    const baseValues = {
      'open': 0.7,      // Open auctions can get expensive
      'one_offer': 0.8, // Usually good value
      'hidden': 0.6,    // Risky, unknown others
      'fixed_price': 0.5, // Often overpriced
      'double': 0.4     // Very risky
    }

    let baseValue = baseValues[card.auctionType] || 0.5

    // Adjust based on player's existing cards (collecting sets)
    const sameArtistCards = player.hand.filter(c => c.artist === card.artist).length
    if (sameArtistCards >= 2) {
      baseValue *= 1.3 // Value multiplier for collecting same artist
    }

    // Adjust based on money situation
    if (player.money > 50) {
      baseValue *= 1.2 // Can afford to be more aggressive
    } else if (player.money < 20) {
      baseValue *= 0.7 // Need to be conservative
    }

    return Math.min(1.0, Math.max(0.1, baseValue))
  }
}