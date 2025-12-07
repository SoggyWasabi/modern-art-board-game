import type { Player, Card } from '../../types/game'
import type { HiddenAuctionState, AuctionResult } from '../../types/auction'

/**
 * Hidden (Sealed Bid) Auction Engine
 *
 * Rules:
 * - All players submit simultaneously
 * - Bids hidden until all submitted
 * - Highest bid wins
 * - Tie-breaker: auctioneer wins if tied
 * - Tie-breaker: closest clockwise from auctioneer
 * - All bid 0 → auctioneer gets free
 */

export function createHiddenAuction(
  card: Card,
  auctioneer: Player,
  players: Player[]
): HiddenAuctionState {
  // Determine tie-breaker order (closest clockwise from auctioneer)
  const auctioneerIndex = players.findIndex(p => p.id === auctioneer.id)
  const tieBreakOrder: string[] = []

  // Start with auctioneer (highest priority)
  tieBreakOrder.push(auctioneer.id)

  // Add others in clockwise order from auctioneer
  for (let i = 1; i < players.length; i++) {
    const index = (auctioneerIndex + i) % players.length
    tieBreakOrder.push(players[index].id)
  }

  return {
    type: 'hidden',
    card,
    auctioneerId: auctioneer.id,
    bids: {},
    isActive: true,
    tieBreakOrder,
    revealedBids: false,
  }
}

export function submitBid(
  state: HiddenAuctionState,
  playerId: string,
  bidAmount: number,
  players: Player[]
): HiddenAuctionState {
  // Validate auction is active and not revealed
  if (!state.isActive || state.revealedBids) {
    throw new Error('Cannot submit bid to inactive or revealed auction')
  }

  // Check if player has already bid
  if (state.bids[playerId] !== undefined) {
    throw new Error('Player has already submitted a bid')
  }

  // Find the player
  const player = players.find(p => p.id === playerId)
  if (!player) {
    throw new Error('Player not found')
  }

  // Check if player has enough money
  if (bidAmount > player.money) {
    throw new Error(`Player only has ${player.money}, cannot bid ${bidAmount}`)
  }

  // Add the bid
  const bids = { ...state.bids, [playerId]: bidAmount }

  // Check if all players have bid
  const allPlayers = [state.auctioneerId, ...players.filter(p => p.id !== state.auctioneerId).map(p => p.id)]
  const allHaveBids = allPlayers.every(id => bids[id] !== undefined)

  // If all have bid, mark as ready to reveal
  return {
    ...state,
    bids,
    readyToReveal: allHaveBids,
  }
}

export function revealBids(state: HiddenAuctionState): HiddenAuctionState {
  if (!state.readyToReveal) {
    throw new Error('Not all players have submitted bids')
  }

  return {
    ...state,
    revealedBids: true,
  }
}

export function concludeAuction(
  state: HiddenAuctionState,
  players: Player[]
): AuctionResult {
  if (!state.revealedBids) {
    throw new Error('Cannot conclude auction before revealing bids')
  }

  // Find highest bid
  let highestBid = 0
  let highestBidders: string[] = []

  for (const [playerId, bid] of Object.entries(state.bids)) {
    const bidAmount = bid as number
    if (bidAmount > highestBid) {
      highestBid = bidAmount
      highestBidders = [playerId]
    } else if (bidAmount === highestBid) {
      highestBidders.push(playerId)
    }
  }

  // All bids are 0 - auctioneer gets card for free
  if (highestBid === 0) {
    return {
      winnerId: state.auctioneerId,
      salePrice: 0,
      card: state.card,
      profit: 0,
      type: 'hidden',
    }
  }

  // Resolve ties using tie-break order
  let winnerId = highestBidders[0]
  for (const playerId of state.tieBreakOrder) {
    if (highestBidders.includes(playerId)) {
      winnerId = playerId
      break
    }
  }

  const winner = players.find(p => p.id === winnerId)
  const auctioneer = players.find(p => p.id === state.auctioneerId)

  if (!winner || !auctioneer) {
    throw new Error('Winner or auctioneer not found')
  }

  // If auctioneer wins, they pay the bank
  if (winner.id === auctioneer.id) {
    return {
      winnerId: winner.id,
      salePrice: highestBid,
      card: state.card,
      profit: 0, // No profit when buying from bank
      type: 'hidden',
    }
  }

  // Another player won - auctioneer gets the money
  return {
    winnerId: winner.id,
    salePrice: highestBid,
    card: state.card,
    profit: highestBid,
    type: 'hidden',
  }
}

/**
 * Check if a bid is valid for the player
 */
export function isValidBid(
  state: HiddenAuctionState,
  playerId: string,
  bidAmount: number,
  players: Player[]
): boolean {
  try {
    submitBid(state, playerId, bidAmount, players)
    return true
  } catch {
    return false
  }
}

/**
 * Get all valid actions for a player in the current auction state
 */
export function getValidActions(
  state: HiddenAuctionState,
  playerId: string,
  players: Player[]
): Array<{ type: 'bid'; min: number; max: number }> {
  const actions: Array<{ type: 'bid'; min: number; max: number }> = []

  // Can't bid if auction is not active or already revealed
  if (!state.isActive || state.revealedBids) {
    return actions
  }

  // Can't bid if already submitted
  if (state.bids[playerId] !== undefined) {
    return actions
  }

  const player = players.find(p => p.id === playerId)
  if (!player) {
    return actions
  }

  // Can bid any amount from 0 to their money
  actions.push({
    type: 'bid',
    min: 0,
    max: player.money,
  })

  return actions
}

/**
 * Get auction status summary
 */
export function getAuctionStatus(state: HiddenAuctionState): {
  submittedBids: number
  totalPlayers: number
  readyToReveal: boolean
  revealed: boolean
} {
  const totalPlayers = Object.keys(state.bids).length
  const submittedBids = Object.values(state.bids).filter(bid => bid !== undefined).length

  return {
    submittedBids,
    totalPlayers,
    readyToReveal: state.readyToReveal || false,
    revealed: state.revealedBids,
  }
}

/**
 * Get bids after reveal (for display purposes)
 */
export function getRevealedBids(state: HiddenAuctionState): Record<string, number> | null {
  if (!state.revealedBids) {
    return null
  }
  return { ...state.bids }
}

/**
 * Check if a player has submitted a bid
 */
export function hasPlayerSubmittedBid(state: HiddenAuctionState, playerId: string): boolean {
  return state.bids[playerId] !== undefined
}