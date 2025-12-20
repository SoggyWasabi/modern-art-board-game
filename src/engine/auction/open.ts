import type { Player, Card } from '../../types/game'
import type { OpenAuctionState, AuctionResult, BidHistoryItem } from '../../types/auction'

/**
 * Open Auction Engine
 *
 * Rules:
 * - Real-time auction with timer-based ending
 * - Timer resets on each new bid (10 seconds of inactivity ends auction)
 * - Any player can bid anytime (no turns)
 * - Bid must exceed current high bid
 * - Cannot bid more than own money
 * - No bids → auctioneer gets free
 * - Auctioneer wins → pays bank
 */

export function createOpenAuction(
  card: Card,
  auctioneer: Player,
  players: Player[]
): OpenAuctionState {
  return {
    type: 'open',
    card,
    auctioneerId: auctioneer.id,
    currentBid: 0,
    currentBidderId: null,
    isActive: true,

    // NEW: Timer and bid history for real-time auction
    timerEndTime: null, // No timer until first bid
    timerDuration: 10000, // 10 seconds
    bidHistory: [],

    // DEPRECATED: Keeping for compatibility during transition
    playerOrder: players.map(p => p.id),
    currentPlayerIndex: 0,
    passCount: 0,
  }
}

export function placeBid(
  state: OpenAuctionState,
  bidderId: string,
  bidAmount: number,
  players: Player[]
): OpenAuctionState {
  // Validate auction is active
  if (!state.isActive) {
    throw new Error('Auction is not active')
  }

  // Validate bid amount
  if (bidAmount <= state.currentBid) {
    throw new Error(`Bid must be higher than current bid of ${state.currentBid}`)
  }

  // Find the bidder
  const bidder = players.find(p => p.id === bidderId)
  if (!bidder) {
    throw new Error('Player not found')
  }

  // Check if player has enough money
  if (bidAmount > bidder.money) {
    throw new Error(`Player only has ${bidder.money}, cannot bid ${bidAmount}`)
  }

  // Create bid history entry
  const bidHistoryItem: BidHistoryItem = {
    playerId: bidderId,
    amount: bidAmount,
    timestamp: Date.now(),
  }

  // Add to bid history (keep last 10 bids for UI)
  const bidHistory = [...state.bidHistory, bidHistoryItem].slice(-10)

  // Reset timer for new bidding period
  const timerEndTime = Date.now() + state.timerDuration

  return {
    ...state,
    currentBid: bidAmount,
    currentBidderId: bidderId,
    timerEndTime,
    bidHistory,

    // DEPRECATED: Reset pass count for compatibility
    passCount: 0,
  }
}

export function pass(
  state: OpenAuctionState,
  _playerId: string,
  players: Player[]
): OpenAuctionState {
  // Validate auction is active
  if (!state.isActive) {
    throw new Error('Auction is not active')
  }

  // Increment pass count
  const passCount = state.passCount + 1

  // If everyone else has passed (current bidder + others = all other players), auction ends
  const totalPlayers = players.length
  if (passCount >= totalPlayers - 1) {
    // Auction ends
    return {
      ...state,
      isActive: false,
      passCount,
    }
  }

  return {
    ...state,
    passCount,
  }
}

/**
 * Check if auction timer has expired and should end
 */
export function checkTimerExpiration(state: OpenAuctionState): boolean {
  if (!state.timerEndTime || !state.isActive) {
    return false
  }
  return Date.now() >= state.timerEndTime
}

/**
 * End auction due to timer expiration
 */
export function endAuctionByTimer(state: OpenAuctionState): OpenAuctionState {
  if (!state.isActive) {
    return state
  }

  return {
    ...state,
    isActive: false,
    timerEndTime: null, // Clear timer
  }
}

export function concludeAuction(
  state: OpenAuctionState,
  players: Player[]
): AuctionResult {
  if (state.isActive) {
    throw new Error('Cannot conclude active auction')
  }

  // No one bid (currentBid is 0 and no currentBidder)
  if (state.currentBid === 0 || !state.currentBidderId) {
    // Auctioneer gets card for free
    const auctioneer = players.find(p => p.id === state.auctioneerId)
    if (!auctioneer) {
      throw new Error('Auctioneer not found')
    }

    return {
      winnerId: state.auctioneerId,
      auctioneerId: state.auctioneerId,
      salePrice: 0,
      card: state.card,
      profit: 0,
      type: 'open',
    }
  }

  // Someone won the auction
  const winner = players.find(p => p.id === state.currentBidderId)
  const auctioneer = players.find(p => p.id === state.auctioneerId)

  if (!winner || !auctioneer) {
    throw new Error('Winner or auctioneer not found')
  }

  // If auctioneer wins, they pay the bank
  if (winner.id === auctioneer.id) {
    return {
      winnerId: winner.id,
      auctioneerId: state.auctioneerId,
      salePrice: state.currentBid,
      card: state.card,
      profit: 0, // No profit when buying from bank
      type: 'open',
    }
  }

  // Another player won - auctioneer gets the money
  return {
    winnerId: winner.id,
    auctioneerId: state.auctioneerId,
    salePrice: state.currentBid,
    card: state.card,
    profit: state.currentBid,
    type: 'open',
  }
}

/**
 * Check if a bid is valid in the current auction state
 */
export function isValidBid(
  state: OpenAuctionState,
  bidderId: string,
  bidAmount: number,
  players: Player[]
): boolean {
  try {
    placeBid(state, bidderId, bidAmount, players)
    return true
  } catch {
    return false
  }
}

/**
 * Get all valid actions for a player in the current auction state
 */
export function getValidActions(
  state: OpenAuctionState,
  playerId: string,
  players: Player[]
): Array<{ type: 'bid' | 'pass'; amount?: number }> {
  const actions: Array<{ type: 'bid' | 'pass'; amount?: number }> = []

  // Can always pass
  actions.push({ type: 'pass' })

  // Can bid if auction is active
  if (state.isActive) {
    const player = players.find(p => p.id === playerId)
    if (player && player.money > state.currentBid) {
      // Minimum valid bid is currentBid + 1
      const minBid = state.currentBid + 1
      const maxBid = player.money

      // Common bid amounts (for UI suggestions)
      const suggestedBids = []
      for (let amount = minBid; amount <= maxBid && amount <= minBid + 20; amount += 5) {
        suggestedBids.push({ type: 'bid' as const, amount })
      }

      actions.push(...suggestedBids)
    }
  }

  return actions
}