import type { Player, Card } from '../../types/game'
import type { OneOfferAuctionState, AuctionResult } from '../../types/auction'

/**
 * One Offer Auction Engine
 *
 * Rules:
 * - Turn order: left of auctioneer → clockwise → auctioneer last
 * - Each player gets one chance to bid or pass
 * - Must bid higher than current
 * - No bids → auctioneer gets free
 */

export function createOneOfferAuction(
  card: Card,
  auctioneer: Player,
  players: Player[]
): OneOfferAuctionState {
  // Determine turn order (left of auctioneer first, auctioneer last)
  const auctioneerIndex = players.findIndex(p => p.id === auctioneer.id)
  const turnOrder: string[] = []

  // Add players to the left (clockwise)
  for (let i = 1; i < players.length; i++) {
    const index = (auctioneerIndex + i) % players.length
    turnOrder.push(players[index].id)
  }

  return {
    type: 'one_offer',
    card,
    auctioneerId: auctioneer.id,
    currentBid: 0,
    currentBidderId: null,
    isActive: true,
    turnOrder,
    currentTurnIndex: 0,
    completedTurns: new Set<string>(),
  }
}

export function makeOffer(
  state: OneOfferAuctionState,
  playerId: string,
  bidAmount: number,
  players: Player[]
): OneOfferAuctionState {
  // Validate auction is active
  if (!state.isActive) {
    throw new Error('Auction is not active')
  }

  // Check if it's this player's turn
  if (state.turnOrder[state.currentTurnIndex] !== playerId) {
    throw new Error("Not this player's turn")
  }

  // Check if player has already taken their turn
  if (state.completedTurns.has(playerId)) {
    throw new Error('Player has already taken their turn')
  }

  // Validate bid amount
  if (bidAmount <= state.currentBid) {
    throw new Error(`Bid must be higher than current bid of ${state.currentBid}`)
  }

  // Find the bidder
  const bidder = players.find(p => p.id === playerId)
  if (!bidder) {
    throw new Error('Player not found')
  }

  // Check if player has enough money
  if (bidAmount > bidder.money) {
    throw new Error(`Player only has ${bidder.money}, cannot bid ${bidAmount}`)
  }

  // Mark this player's turn as completed
  const completedTurns = new Set(state.completedTurns)
  completedTurns.add(playerId)

  // Move to next turn
  const nextTurnIndex = state.currentTurnIndex + 1

  return {
    ...state,
    currentBid: bidAmount,
    currentBidderId: playerId,
    currentTurnIndex: nextTurnIndex,
    completedTurns,
  }
}

export function pass(
  state: OneOfferAuctionState,
  playerId: string
): OneOfferAuctionState {
  // Validate auction is active
  if (!state.isActive) {
    throw new Error('Auction is not active')
  }

  // Check if it's this player's turn
  if (state.turnOrder[state.currentTurnIndex] !== playerId) {
    throw new Error("Not this player's turn")
  }

  // Check if player has already taken their turn
  if (state.completedTurns.has(playerId)) {
    throw new Error('Player has already taken their turn')
  }

  // Mark this player's turn as completed
  const completedTurns = new Set(state.completedTurns)
  completedTurns.add(playerId)

  // Move to next turn
  const nextTurnIndex = state.currentTurnIndex + 1

  // Check if all players have taken their turn
  const isAuctionComplete = nextTurnIndex >= state.turnOrder.length

  return {
    ...state,
    currentTurnIndex: nextTurnIndex,
    completedTurns,
    isActive: !isAuctionComplete,
  }
}

export function concludeAuction(
  state: OneOfferAuctionState,
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
      salePrice: 0,
      card: state.card,
      profit: 0,
      type: 'one_offer',
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
      salePrice: state.currentBid,
      card: state.card,
      profit: 0, // No profit when buying from bank
      type: 'one_offer',
    }
  }

  // Another player won - auctioneer gets the money
  return {
    winnerId: winner.id,
    salePrice: state.currentBid,
    card: state.card,
    profit: state.currentBid,
    type: 'one_offer',
  }
}

/**
 * Get the current player whose turn it is
 */
export function getCurrentPlayer(state: OneOfferAuctionState): string | null {
  if (!state.isActive || state.currentTurnIndex >= state.turnOrder.length) {
    return null
  }
  return state.turnOrder[state.currentTurnIndex]
}

/**
 * Check if it's a player's turn
 */
export function isPlayerTurn(state: OneOfferAuctionState, playerId: string): boolean {
  return getCurrentPlayer(state) === playerId
}

/**
 * Check if a bid is valid in the current auction state
 */
export function isValidBid(
  state: OneOfferAuctionState,
  playerId: string,
  bidAmount: number,
  players: Player[]
): boolean {
  try {
    makeOffer(state, playerId, bidAmount, players)
    return true
  } catch {
    return false
  }
}

/**
 * Get all valid actions for a player in the current auction state
 */
export function getValidActions(
  state: OneOfferAuctionState,
  playerId: string,
  players: Player[]
): Array<{ type: 'bid' | 'pass'; amount?: number }> {
  const actions: Array<{ type: 'bid' | 'pass'; amount?: number }> = []

  // Can't act if auction is not active
  if (!state.isActive) {
    return actions
  }

  // Can't act if it's not this player's turn
  if (!isPlayerTurn(state, playerId)) {
    return actions
  }

  // Can't act if already taken turn
  if (state.completedTurns.has(playerId)) {
    return actions
  }

  // Can always pass
  actions.push({ type: 'pass' })

  // Can bid if have enough money
  const player = players.find(p => p.id === playerId)
  if (player && player.money > state.currentBid) {
    // Minimum valid bid is currentBid + 1
    const minBid = state.currentBid + 1
    const maxBid = player.money

    // Common bid amounts (for UI suggestions)
    for (let amount = minBid; amount <= maxBid && amount <= minBid + 20; amount += 5) {
      actions.push({ type: 'bid' as const, amount })
    }
  }

  return actions
}

/**
 * Get auction status summary
 */
export function getAuctionStatus(state: OneOfferAuctionState): {
  currentPlayer: string | null
  remainingPlayers: number
  completedPlayers: number
} {
  return {
    currentPlayer: getCurrentPlayer(state),
    remainingPlayers: state.turnOrder.length - state.currentTurnIndex,
    completedPlayers: state.completedTurns.size,
  }
}