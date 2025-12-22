import type { GameState, Player } from '../types/game'
import type { OpenAuctionState, AuctionState } from '../types/auction'
import { MediumAIWrapper } from './mediumAIWrapper'
import { placeBid, checkTimerExpiration } from '../engine/auction/open'

/**
 * Helper to get the effective auction for double auctions
 * When a double auction is in bidding phase with an embedded auction,
 * we delegate to the embedded auction for all mechanics
 */
function getEffectiveAuction(auction: AuctionState): AuctionState {
  if (auction.type === 'double' && auction.embeddedAuction) {
    return auction.embeddedAuction
  }
  return auction
}

/**
 * Manages concurrent AI bidding for open auctions
 * Each AI player gets their own "thread" using setTimeout
 */
export class OpenAuctionAIManager {
  private decisionMaker: MediumAIWrapper
  private aiTimers = new Map<string, NodeJS.Timeout>() // playerId -> timer
  private isRunning = false
  private currentGameState: GameState | null = null
  private placeBidCallback: ((playerId: string, amount: number) => void) | null = null

  constructor() {
    this.decisionMaker = new MediumAIWrapper()
  }

  /**
   * Set callback for placing bids through the game store
   */
  setPlaceBidCallback(callback: (playerId: string, amount: number) => void): void {
    this.placeBidCallback = callback
  }

  /**
   * Start managing AI bidding for an open auction
   * This spawns concurrent "threads" for each AI player
   */
  startManaging(gameState: GameState): void {
    if (this.isRunning) {
      this.stopManaging()
    }

    this.isRunning = true
    this.currentGameState = gameState

    const auction = getEffectiveAuction(gameState.round.phase.auction)
    if (auction.type !== 'open') {
      return
    }

    console.log('Starting OpenAuctionAIManager for auction:', auction.card.artist)

    // Start a bidding "thread" for each AI player
    const aiPlayers = gameState.players.filter(p => p.isAI && p.id !== auction.auctioneerId)

    for (const player of aiPlayers) {
      this.startAIBiddingThread(player, auction)
    }
  }

  /**
   * Update the game state for AI decision making
   * This should be called whenever the auction state changes (new bids, etc.)
   */
  updateGameState(gameState: GameState): void {
    if (!this.isRunning) {
      return
    }
    this.currentGameState = gameState
    const auction = getEffectiveAuction(gameState.round.phase.auction)
    console.log('OpenAuctionAIManager: Updated game state, current bid:',
      gameState.round.phase.type === 'auction' && auction.type === 'open'
        ? auction.currentBid
        : 'N/A')
  }

  /**
   * Stop all AI bidding threads
   */
  stopManaging(): void {
    this.isRunning = false
    this.currentGameState = null

    // Clear all timers
    for (const [playerId, timer] of this.aiTimers.entries()) {
      clearTimeout(timer)
    }
    this.aiTimers.clear()

    console.log('OpenAuctionAIManager stopped')
  }

  /**
   * Start an individual AI bidding thread
   * This will make the AI consider bidding at random intervals
   */
  private startAIBiddingThread(player: Player, auction: OpenAuctionState): void {
    if (!this.isRunning || !this.currentGameState) {
      return
    }

    console.log(`Starting AI bidding thread for ${player.name}`)

    // Recursive function to keep the AI "thinking" about bids
    const scheduleNextThink = () => {
      if (!this.isRunning || !this.currentGameState) {
        return
      }

      // Check if auction is still active and we haven't exceeded timer
      const currentAuction = getEffectiveAuction(this.currentGameState.round.phase.auction)
      if (currentAuction.type !== 'open' || !currentAuction.isActive || checkTimerExpiration(currentAuction)) {
        return
      }

      // Random thinking time: 2-6 seconds
      const thinkTime = 2000 + Math.random() * 4000

      const timer = setTimeout(async () => {
        if (!this.isRunning || !this.currentGameState) {
          return
        }

        // Check if auction is still valid
        const currentAuction = getEffectiveAuction(this.currentGameState.round.phase.auction)
        if (currentAuction.type !== 'open' || !currentAuction.isActive || checkTimerExpiration(currentAuction)) {
          return
        }

        // Get AI decision
        try {
          const decision = await this.decisionMaker.makeAuctionDecision(
            player,
            currentAuction,
            this.currentGameState
          )

          if (decision) {
            console.log(`${player.name} made decision:`, {
              type: decision.type,
              action: decision.action,
              amount: decision.amount,
              confidence: decision.confidence
            })

            if (decision.type === 'bid' && decision.action === 'bid' && decision.amount) {
              console.log(`${player.name} decided to bid ${decision.amount}k`)

              // Actually place the bid through the callback
              if (this.placeBidCallback) {
                this.placeBidCallback(player.id, decision.amount)
              } else {
                console.error('No placeBid callback set for AI manager')
              }
            } else if (decision.type === 'bid' && decision.action === 'pass') {
              console.log(`${player.name} decided to pass`)
              // In open auctions, passes don't do anything - just don't bid
            } else {
              console.log(`${player.name} made unexpected decision:`, decision)
            }
          } else {
            console.log(`${player.name} returned no decision`)
          }
        } catch (error) {
          console.error(`Error getting AI decision for ${player.name}:`, error)
        }

        // Schedule next thinking session
        scheduleNextThink()

      }, thinkTime)

      // Store the timer so we can cancel it
      this.aiTimers.set(player.id, timer)
    }

    // Start the thinking loop
    scheduleNextThink()
  }

  /**
   * Get current AI decisions for UI hints
   * This can be used to show what AI players are "thinking"
   */
  getAIBiddingIntentions(): Map<string, 'thinking' | 'likely-bid' | 'unlikely-bid'> {
    const intentions = new Map<string, 'thinking' | 'likely-bid' | 'unlikely-bid'>()

    for (const playerId of this.aiTimers.keys()) {
      // Random intention based on current game state
      const random = Math.random()
      if (random > 0.7) {
        intentions.set(playerId, 'likely-bid')
      } else if (random > 0.3) {
        intentions.set(playerId, 'thinking')
      } else {
        intentions.set(playerId, 'unlikely-bid')
      }
    }

    return intentions
  }

  /**
   * Check if AI manager is currently running
   */
  isActive(): boolean {
    return this.isRunning
  }
}

// Singleton instance
let aiManagerInstance: OpenAuctionAIManager | null = null

export function getOpenAuctionAIManager(): OpenAuctionAIManager {
  if (!aiManagerInstance) {
    aiManagerInstance = new OpenAuctionAIManager()
  }
  return aiManagerInstance
}