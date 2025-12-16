import type { GameState, Player } from '../types/game'
import type { AuctionState } from '../types/auction'
import type { AIDecision } from '../ai/types'

/**
 * Simplified AI Decision Maker for immediate use
 * This bypasses the complex AI framework and provides basic but functional AI decisions
 */
export class SimpleAIDecisionMaker {
  /**
   * Make a basic AI decision for auction participation
   */
  async makeAuctionDecision(
    player: Player,
    auction: AuctionState,
    gameState: GameState
  ): Promise<AIDecision | null> {
    // Simulate thinking time
    await this.simulateThinking()

    switch (auction.type) {
      case 'one_offer':
        return this.makeOneOfferDecision(player, auction, gameState)

      case 'open':
        return this.makeOpenAuctionDecision(player, auction, gameState)

      case 'hidden':
        return this.makeHiddenAuctionDecision(player, auction, gameState)

      case 'fixed_price':
        return this.makeFixedPriceDecision(player, auction, gameState)

      case 'double':
        return this.makeDoubleAuctionDecision(player, auction, gameState)

      default:
        return null
    }
  }

  private async simulateThinking(): Promise<void> {
    // Random thinking time between 1-2 seconds
    const delay = 1000 + Math.random() * 1000
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  private makeOneOfferDecision(
    player: Player,
    auction: any,
    gameState: GameState
  ): AIDecision | null {
    if (auction.phase === 'bidding') {
      // Only bid if we're the auctioneer and no one has bid yet
      // OR if we're a regular player and it seems worth it
      const isAuctioneer = player.id === auction.auctioneerId

      // Regular players: bid based on card value and current price
      if (!isAuctioneer) {
        const shouldBid = Math.random() < 0.4 // 40% chance to bid

        if (shouldBid && auction.currentBid < Math.min(player.money * 0.2, 25)) {
          const minBid = (auction.currentBid || 0) + 2
          const maxBid = Math.min(player.money * 0.3, 30)

          if (minBid <= maxBid) {
            const bidAmount = Math.floor(minBid + Math.random() * (maxBid - minBid))
            return {
              type: 'bid',
              action: 'bid',
              amount: bidAmount
            }
          }
        }

        // Pass if not bidding
        return {
          type: 'bid',
          action: 'pass'
        }
      }

      // Auctioneer doesn't bid during regular phase
      return null

    } else if (auction.phase === 'auctioneer_decision' && player.id === auction.auctioneerId) {
      // Auctioneer decision phase
      if (auction.currentBid === 0 || !auction.currentBidderId) {
        // No bids - take for free
        return {
          type: 'bid',
          action: 'take_free'
        }
      }

      // There's a bid - decide whether to accept or outbid
      const bidValue = auction.currentBid

      // Simple AI: accept if bid is reasonable, outbid if it's too low
      if (bidValue > player.money * 0.25) {
        // Bid is too high - accept it
        return {
          type: 'bid',
          action: 'accept'
        }
      }

      // Bid seems low - outbid by the minimum amount
      const outbidAmount = bidValue + 1
      if (outbidAmount <= player.money) {
        return {
          type: 'bid',
          action: 'outbid',
          amount: outbidAmount
        }
      }

      // Can't afford to outbid, have to accept
      return {
        type: 'bid',
        action: 'accept'
      }
    }

    return null
  }

  private makeOpenAuctionDecision(
    player: Player,
    auction: any,
    gameState: GameState
  ): AIDecision | null {
    // Simple open auction strategy
    const currentBid = auction.currentBid || 0
    const maxBid = Math.min(player.money * 0.25, 40)

    // Bid if current bid is reasonable and below our max
    if (currentBid < maxBid && Math.random() < 0.4) {
      const increment = Math.ceil(currentBid * 0.1) + 1
      const bidAmount = Math.min(currentBid + increment, maxBid)

      return {
        type: 'bid',
        action: 'bid',
        amount: bidAmount
      }
    }

    // Pass if not interested or bid too high
    return {
      type: 'bid',
      action: 'pass'
    }
  }

  private makeHiddenAuctionDecision(
    player: Player,
    auction: any,
    gameState: GameState
  ): AIDecision | null {
    // Hidden auction: bid randomly between 5-30
    const maxBid = Math.min(player.money * 0.3, 30)
    const minBid = 5

    if (Math.random() < 0.5 && minBid <= maxBid) {
      const bidAmount = Math.floor(minBid + Math.random() * (maxBid - minBid))
      return {
        type: 'hidden_bid',
        amount: bidAmount
      }
    }

    return null
  }

  private makeFixedPriceDecision(
    player: Player,
    auction: any,
    gameState: GameState
  ): AIDecision | null {
    // Buy at fixed price if reasonable
    const pricePercentage = auction.price / player.money

    if (pricePercentage < 0.3 && Math.random() < 0.5) {
      return {
        type: 'bid',
        action: 'buy'
      }
    }

    return {
      type: 'bid',
      action: 'pass'
    }
  }

  private makeDoubleAuctionDecision(
    player: Player,
    auction: any,
    gameState: GameState
  ): AIDecision | null {
    // Double auction logic
    if (!auction.secondCard && auction.currentAuctioneerId === player.id) {
      // Decide whether to offer second card
      const matchingCards = player.hand.filter(
        card => card.artist === auction.doubleCard.artist && card.auctionType !== 'double'
      )

      if (matchingCards.length > 0 && Math.random() < 0.6) {
        return {
          type: 'bid',
          action: 'offer',
          cardId: matchingCards[0].id
        }
      }
    } else if (auction.secondCard) {
      // Use sub-auction type logic
      const subAuction = { ...auction, type: auction.auctionType }
      return this.makeAuctionDecision(player, subAuction, gameState)
    }

    return null
  }
}