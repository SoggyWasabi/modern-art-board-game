import type { Player, Card } from '../../types/game'
import type { OneOfferAuctionState, AuctionResult } from '../../types/auction'

/**
 * One Offer Auction Engine
 *
 * Rules (matching official Modern Art game):
 * - Turn order: left of auctioneer → clockwise → auctioneer LAST
 * - Each player gets one chance to bid or pass
 * - Must bid higher than current bid
 * - After all others act, auctioneer enters decision phase:
 *   - Accept highest bid (gets paid by winner)
 *   - OR outbid to keep painting (pays bank)
 * - No bids → auctioneer gets painting FREE
 */

export function createOneOfferAuction(
  card: Card,
  auctioneer: Player,
  players: Player[]
): OneOfferAuctionState {
  // Determine turn order (left of auctioneer first, auctioneer LAST)
  const auctioneerIndex = players.findIndex(p => p.id === auctioneer.id)
  const turnOrder: string[] = []

  // Add players to the left (clockwise), excluding auctioneer
  for (let i = 1; i < players.length; i++) {
    const index = (auctioneerIndex + i) % players.length
    turnOrder.push(players[index].id)
  }

  // Add auctioneer LAST
  turnOrder.push(auctioneer.id)

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
    phase: 'bidding',
    bidHistory: {},
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

  // Check phase - regular bidding only in 'bidding' phase
  if (state.phase !== 'bidding') {
    throw new Error('Bidding phase has ended')
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

  // Track the bid in history
  const bidHistory = { ...state.bidHistory, [playerId]: bidAmount }

  // Move to next turn
  const nextTurnIndex = state.currentTurnIndex + 1

  // Check if we've reached the auctioneer (last in turn order)
  const isAuctioneerNext = nextTurnIndex === state.turnOrder.length - 1

  return {
    ...state,
    currentBid: bidAmount,
    currentBidderId: playerId,
    currentTurnIndex: nextTurnIndex,
    completedTurns,
    bidHistory,
    // If auctioneer is next, switch to decision phase
    phase: isAuctioneerNext ? 'auctioneer_decision' : 'bidding',
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

  // Check phase - passing only in 'bidding' phase
  if (state.phase !== 'bidding') {
    throw new Error('Cannot pass during auctioneer decision phase')
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

  // Track the pass in history (bid amount of 0)
  const bidHistory = { ...state.bidHistory, [playerId]: 0 }

  // Move to next turn
  const nextTurnIndex = state.currentTurnIndex + 1

  // Check if we've reached the auctioneer (last in turn order)
  const isAuctioneerNext = nextTurnIndex === state.turnOrder.length - 1

  return {
    ...state,
    currentTurnIndex: nextTurnIndex,
    completedTurns,
    bidHistory,
    // If auctioneer is next, switch to decision phase
    phase: isAuctioneerNext ? 'auctioneer_decision' : 'bidding',
  }
}

/**
 * Auctioneer accepts the highest bid
 * The highest bidder wins and pays the auctioneer
 */
export function acceptHighestBid(
  state: OneOfferAuctionState
): OneOfferAuctionState {
  // Validate auction is active
  if (!state.isActive) {
    throw new Error('Auction is not active')
  }

  // Must be in auctioneer decision phase
  if (state.phase !== 'auctioneer_decision') {
    throw new Error('Can only accept bid during auctioneer decision phase')
  }

  // Must have a bid to accept
  if (state.currentBid === 0 || !state.currentBidderId) {
    throw new Error('No bid to accept')
  }

  // Mark auctioneer's turn as completed
  const completedTurns = new Set(state.completedTurns)
  completedTurns.add(state.auctioneerId)

  return {
    ...state,
    isActive: false,
    completedTurns,
    bidHistory: state.bidHistory,
  }
}

/**
 * Auctioneer outbids to keep the painting (pays bank)
 */
export function auctioneerOutbid(
  state: OneOfferAuctionState,
  bidAmount: number,
  players: Player[]
): OneOfferAuctionState {
  // Validate auction is active
  if (!state.isActive) {
    throw new Error('Auction is not active')
  }

  // Must be in auctioneer decision phase
  if (state.phase !== 'auctioneer_decision') {
    throw new Error('Can only outbid during auctioneer decision phase')
  }

  // Find the auctioneer
  const auctioneer = players.find(p => p.id === state.auctioneerId)
  if (!auctioneer) {
    throw new Error('Auctioneer not found')
  }

  // Must bid higher than current bid
  if (bidAmount <= state.currentBid) {
    throw new Error(`Bid must be higher than current bid of ${state.currentBid}`)
  }

  // Check if auctioneer has enough money
  if (bidAmount > auctioneer.money) {
    throw new Error(`Auctioneer only has ${auctioneer.money}, cannot bid ${bidAmount}`)
  }

  // Mark auctioneer's turn as completed
  const completedTurns = new Set(state.completedTurns)
  completedTurns.add(state.auctioneerId)

  return {
    ...state,
    currentBid: bidAmount,
    currentBidderId: state.auctioneerId,
    isActive: false,
    completedTurns,
    bidHistory: { ...state.bidHistory, [state.auctioneerId]: bidAmount },
  }
}

/**
 * Auctioneer takes the painting for free (when no one bid)
 */
export function auctioneerTakesFree(
  state: OneOfferAuctionState
): OneOfferAuctionState {
  // Validate auction is active
  if (!state.isActive) {
    throw new Error('Auction is not active')
  }

  // Must be in auctioneer decision phase
  if (state.phase !== 'auctioneer_decision') {
    throw new Error('Can only take free during auctioneer decision phase')
  }

  // Can only take free if no one bid
  if (state.currentBid > 0 || state.currentBidderId) {
    throw new Error('Cannot take free when there are bids')
  }

  // Mark auctioneer's turn as completed
  const completedTurns = new Set(state.completedTurns)
  completedTurns.add(state.auctioneerId)

  return {
    ...state,
    currentBidderId: state.auctioneerId,
    isActive: false,
    completedTurns,
    bidHistory: state.bidHistory,
  }
}

export function concludeAuction(
  state: OneOfferAuctionState,
  players: Player[]
): AuctionResult {
  if (state.isActive) {
    throw new Error('Cannot conclude active auction')
  }

  // No winner (auctioneer passed on sale)
  if (state.currentBidderId === null && state.currentBid === 0) {
    return {
      winnerId: null, // No one gets the card
      auctioneerId: state.auctioneerId,
      salePrice: 0,
      card: state.card,
      profit: 0,
      type: 'one_offer',
    }
  }

  // No one bid - auctioneer gets card for free
  if (state.currentBid === 0 && state.currentBidderId === state.auctioneerId) {
    return {
      winnerId: state.auctioneerId,
      auctioneerId: state.auctioneerId,
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

  // If auctioneer wins (outbid everyone), they pay the bank
  if (winner.id === auctioneer.id) {
    return {
      winnerId: winner.id,
      auctioneerId: state.auctioneerId,
      salePrice: state.currentBid,
      card: state.card,
      profit: 0, // No profit when buying from bank
      type: 'one_offer',
    }
  }

  // Another player won - auctioneer gets the money
  return {
    winnerId: winner.id,
    auctioneerId: state.auctioneerId,
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
  if (!state.isActive) {
    return null
  }
  if (state.currentTurnIndex >= state.turnOrder.length) {
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
 * Check if it's the auctioneer's decision phase
 */
export function isAuctioneerDecisionPhase(state: OneOfferAuctionState): boolean {
  return state.isActive && state.phase === 'auctioneer_decision'
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
    if (state.phase === 'auctioneer_decision' && playerId === state.auctioneerId) {
      auctioneerOutbid(state, bidAmount, players)
    } else {
      makeOffer(state, playerId, bidAmount, players)
    }
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
): Array<{ type: 'bid' | 'pass' | 'accept' | 'take_free'; amount?: number }> {
  const actions: Array<{ type: 'bid' | 'pass' | 'accept' | 'take_free'; amount?: number }> = []

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

  const player = players.find(p => p.id === playerId)
  if (!player) {
    return actions
  }

  // Auctioneer decision phase
  if (state.phase === 'auctioneer_decision' && playerId === state.auctioneerId) {
    // If there are bids, can accept
    if (state.currentBid > 0 && state.currentBidderId) {
      actions.push({ type: 'accept' })

      // Can also outbid if has enough money
      if (player.money > state.currentBid) {
        const minBid = state.currentBid + 1
        const maxBid = player.money
        for (let amount = minBid; amount <= maxBid && amount <= minBid + 20; amount += 5) {
          actions.push({ type: 'bid', amount })
        }
      }
    } else {
      // No bids - can only take free
      actions.push({ type: 'take_free' })
    }
    return actions
  }

  // Regular bidding phase
  if (state.phase === 'bidding') {
    // Can always pass
    actions.push({ type: 'pass' })

    // Can bid if have enough money
    if (player.money > state.currentBid) {
      const minBid = state.currentBid + 1
      const maxBid = player.money
      for (let amount = minBid; amount <= maxBid && amount <= minBid + 20; amount += 5) {
        actions.push({ type: 'bid', amount })
      }
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
  phase: 'bidding' | 'auctioneer_decision'
  highestBid: number
  highestBidder: string | null
} {
  return {
    currentPlayer: getCurrentPlayer(state),
    remainingPlayers: state.turnOrder.length - state.currentTurnIndex,
    completedPlayers: state.completedTurns.size,
    phase: state.phase,
    highestBid: state.currentBid,
    highestBidder: state.currentBidderId,
  }
}
