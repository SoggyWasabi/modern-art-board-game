import type { Player, Card } from '../../types/game'
import type { FixedPriceAuctionState, AuctionResult } from '../../types/auction'

/**
 * Fixed Price Auction Engine
 *
 * Rules:
 * - Auctioneer sets price ≤ own money
 * - Turn order: left of auctioneer → clockwise
 * - First buyer wins at fixed price
 * - All pass → auctioneer MUST buy
 */

export function createFixedPriceAuction(
  card: Card,
  auctioneer: Player,
  players: Player[],
  setPrice: number
): FixedPriceAuctionState {
  // Validate price
  if (setPrice < 0) {
    throw new Error('Price cannot be negative')
  }

  // Auctioneer must be able to afford buying it themselves
  if (setPrice > auctioneer.money) {
    throw new Error(`Auctioneer only has ${auctioneer.money}, cannot set price ${setPrice}`)
  }

  // Determine turn order (left of auctioneer first)
  const auctioneerIndex = players.findIndex(p => p.id === auctioneer.id)
  const turnOrder: string[] = []

  // Add players to the left (clockwise), excluding auctioneer
  for (let i = 1; i < players.length; i++) {
    const index = (auctioneerIndex + i) % players.length
    const player = players[index]
    if (player.id !== auctioneer.id) {
      turnOrder.push(player.id)
    }
  }

  return {
    type: 'fixed_price',
    card,
    auctioneerId: auctioneer.id,
    price: setPrice,
    isActive: true,
    sold: false,
    winnerId: null,
    turnOrder,
    currentTurnIndex: 0,
    passedPlayers: new Set<string>(),
  }
}

export function buyAtPrice(
  state: FixedPriceAuctionState,
  playerId: string,
  players: Player[]
): FixedPriceAuctionState {
  // Validate auction is active and not sold
  if (!state.isActive || state.sold) {
    throw new Error('Cannot buy from inactive or sold auction')
  }

  // Check if it's this player's turn
  if (state.turnOrder[state.currentTurnIndex] !== playerId) {
    throw new Error("Not this player's turn")
  }

  // Find the buyer
  const buyer = players.find(p => p.id === playerId)
  if (!buyer) {
    throw new Error('Player not found')
  }

  // Check if player can afford the price
  if (state.price > buyer.money) {
    throw new Error(`Player only has ${buyer.money}, cannot pay ${state.price}`)
  }

  // Sale complete!
  return {
    ...state,
    sold: true,
    winnerId: playerId,
    isActive: false,
  }
}

export function pass(
  state: FixedPriceAuctionState,
  playerId: string
): FixedPriceAuctionState {
  // Validate auction is active and not sold
  if (!state.isActive || state.sold) {
    throw new Error('Cannot pass on inactive or sold auction')
  }

  // Check if it's this player's turn
  if (state.turnOrder[state.currentTurnIndex] !== playerId) {
    throw new Error("Not this player's turn")
  }

  // Check if already passed
  if (state.passedPlayers.has(playerId)) {
    throw new Error('Player has already passed')
  }

  // Mark as passed
  const passedPlayers = new Set(state.passedPlayers)
  passedPlayers.add(playerId)

  // Move to next turn
  const nextTurnIndex = state.currentTurnIndex + 1

  // Check if all players have passed
  const allPassed = nextTurnIndex >= state.turnOrder.length

  // If all passed, auctioneer must buy
  if (allPassed) {
    return {
      ...state,
      sold: true,
      winnerId: state.auctioneerId,
      isActive: false,
      passedPlayers,
      currentTurnIndex: nextTurnIndex,
    }
  }

  return {
    ...state,
    currentTurnIndex: nextTurnIndex,
    passedPlayers,
  }
}

export function concludeAuction(
  state: FixedPriceAuctionState,
  players: Player[]
): AuctionResult {
  if (state.isActive || !state.sold) {
    throw new Error('Cannot conclude incomplete auction')
  }

  if (!state.winnerId) {
    throw new Error('No winner determined')
  }

  const winner = players.find(p => p.id === state.winnerId)
  const auctioneer = players.find(p => p.id === state.auctioneerId)

  if (!winner || !auctioneer) {
    throw new Error('Winner or auctioneer not found')
  }

  // If auctioneer wins, they pay the bank
  if (winner.id === auctioneer.id) {
    return {
      winnerId: winner.id,
      auctioneerId: state.auctioneerId,
      salePrice: state.price,
      card: state.card,
      profit: 0, // No profit when buying from bank
      type: 'fixed_price',
    }
  }

  // Another player won - auctioneer gets the money
  return {
    winnerId: winner.id,
    auctioneerId: state.auctioneerId,
    salePrice: state.price,
    card: state.card,
    profit: state.price,
    type: 'fixed_price',
  }
}

/**
 * Get the current player whose turn it is
 */
export function getCurrentPlayer(state: FixedPriceAuctionState): string | null {
  if (!state.isActive || state.sold) {
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
export function isPlayerTurn(state: FixedPriceAuctionState, playerId: string): boolean {
  return getCurrentPlayer(state) === playerId
}

/**
 * Check if a player can buy at the current price
 */
export function canPlayerBuy(state: FixedPriceAuctionState, playerId: string, players: Player[]): boolean {
  const player = players.find(p => p.id === playerId)
  if (!player || !state.isActive || state.sold) {
    return false
  }
  return player.money >= state.price && isPlayerTurn(state, playerId)
}

/**
 * Get all valid actions for a player in the current auction state
 */
export function getValidActions(
  state: FixedPriceAuctionState,
  playerId: string,
  players: Player[]
): Array<{ type: 'buy' | 'pass' }> {
  const actions: Array<{ type: 'buy' | 'pass' }> = []

  // Can't act if auction is not active or already sold
  if (!state.isActive || state.sold) {
    return actions
  }

  // Can't act if it's not this player's turn
  if (!isPlayerTurn(state, playerId)) {
    return actions
  }

  // Can always pass
  actions.push({ type: 'pass' })

  // Can buy if can afford the price
  if (canPlayerBuy(state, playerId, players)) {
    actions.push({ type: 'buy' })
  }

  return actions
}

/**
 * Get auction status summary
 */
export function getAuctionStatus(state: FixedPriceAuctionState): {
  currentPlayer: string | null
  price: number
  sold: boolean
  passedCount: number
  remainingPlayers: number
} {
  return {
    currentPlayer: getCurrentPlayer(state),
    price: state.price,
    sold: state.sold,
    passedCount: state.passedPlayers.size,
    remainingPlayers: state.turnOrder.length - state.currentTurnIndex,
  }
}

/**
 * Set the price for a fixed price auction (only callable by auctioneer)
 */
export function setPrice(
  state: FixedPriceAuctionState,
  auctioneerId: string,
  price: number,
  players: Player[]
): FixedPriceAuctionState {
  // Validate auctioneer
  if (auctioneerId !== state.auctioneerId) {
    throw new Error('Only the auctioneer can set the price')
  }

  // Validate price
  if (price <= 0) {
    throw new Error('Price must be greater than 0')
  }

  // Check if auctioneer can afford the price (might need to buy it themselves)
  const auctioneer = players.find(p => p.id === auctioneerId)
  if (!auctioneer) {
    throw new Error('Auctioneer not found')
  }

  if (price > auctioneer.money) {
    throw new Error(`Auctioneer only has ${auctioneer.money}, cannot set price ${price}`)
  }

  return {
    ...state,
    price,
  }
}

/**
 * Check if auctioneer will be forced to buy (all others passed)
 */
export function isAuctioneerForcedToBuy(state: FixedPriceAuctionState): boolean {
  return state.currentTurnIndex >= state.turnOrder.length && !state.sold
}

/**
 * Check if auction is in price setting phase
 */
export function isPriceSettingPhase(state: FixedPriceAuctionState): boolean {
  return state.price === 0 && !state.sold
}