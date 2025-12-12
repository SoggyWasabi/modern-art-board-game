import type { Player, Card } from '../../types/game'
import type { DoubleAuctionState, AuctionResult } from '../../types/auction'

/**
 * Double Auction Engine (Most Complex)
 *
 * Rules:
 * - Auctioneer plays a Double card
 * - Auctioneer can offer second card (same artist, not Double)
 * - If declined, offer passes left clockwise
 * - Another player offers → they become auctioneer, get money
 * - No one offers → original auctioneer gets Double free
 * - Auction type = second card's type
 * - Winner gets both cards
 * - Next turn = left of final auctioneer
 */

export function createDoubleAuction(
  doubleCard: Card,
  auctioneer: Player,
  players: Player[]
): DoubleAuctionState {
  // Validate it's actually a double card
  if (doubleCard.auctionType !== 'double') {
    throw new Error('First card must be a double auction card')
  }

  // Determine turn order
  // Original auctioneer gets first chance to offer
  // Then passes clockwise
  const auctioneerIndex = players.findIndex(p => p.id === auctioneer.id)
  const turnOrder: string[] = []

  // Add original auctioneer first (they get first chance to offer)
  turnOrder.push(auctioneer.id)

  // Then add players to the left (clockwise)
  for (let i = 1; i < players.length; i++) {
    const index = (auctioneerIndex + i) % players.length
    turnOrder.push(players[index].id)
  }

  return {
    type: 'double',
    doubleCard,
    secondCard: null, // To be set when someone offers a second card
    originalAuctioneerId: auctioneer.id,
    currentAuctioneerId: auctioneer.id,
    auctionType: 'double', // Will change based on second card
    isActive: true,
    sold: false,
    turnOrder,
    currentTurnIndex: 0, // Start with original auctioneer
    offers: new Map<string, Card>(), // playerId -> card offered
    phase: 'offering' // 'offering' or 'bidding'
  }
}

export function offerSecondCard(
  state: DoubleAuctionState,
  playerId: string,
  secondCard: Card,
  players: Player[]
): DoubleAuctionState {
  // Validate auction is active and not sold
  if (!state.isActive || state.sold) {
    throw new Error('Cannot offer card in inactive or sold auction')
  }

  // Check if it's this player's turn to offer
  if (state.turnOrder[state.currentTurnIndex] !== playerId) {
    throw new Error("Not this player's turn to offer")
  }

  // Validate second card
  if (secondCard.auctionType === 'double') {
    throw new Error('Second card cannot be a double auction card')
  }

  // Validate second card is same artist as double card
  if (secondCard.artist !== state.doubleCard.artist) {
    throw new Error('Second card must be same artist as double card')
  }

  // Check if player hasn't already offered
  if (state.offers.has(playerId)) {
    throw new Error('Player has already offered a card')
  }

  // Check if player actually has this card (simplified - in real game would check hand)
  const player = players.find(p => p.id === playerId)
  if (!player) {
    throw new Error('Player not found')
  }

  // Record the offer
  const offers = new Map(state.offers)
  offers.set(playerId, secondCard)

  // The player who offered becomes the new auctioneer
  const newState: DoubleAuctionState = {
    ...state,
    secondCard,
    currentAuctioneerId: playerId,
    auctionType: secondCard.auctionType, // Auction type follows second card
    offers,
  }

  return newState
}

export function declineToOffer(
  state: DoubleAuctionState,
  playerId: string
): DoubleAuctionState {
  // Validate auction is active
  if (!state.isActive) {
    throw new Error('Cannot decline in inactive auction')
  }

  // Check if it's this player's turn
  if (state.turnOrder[state.currentTurnIndex] !== playerId) {
    throw new Error("Not this player's turn")
  }

  // Move to next turn
  const nextTurnIndex = state.currentTurnIndex + 1

  // Check if everyone has declined
  if (nextTurnIndex >= state.turnOrder.length) {
    // No one offered - original auctioneer gets double card for free
    return {
      ...state,
      sold: true,
      isActive: false,
      currentTurnIndex: nextTurnIndex,
    }
  }

  return {
    ...state,
    currentTurnIndex: nextTurnIndex,
  }
}

export function acceptOffer(
  state: DoubleAuctionState,
  winnerId: string,
  finalPrice: number,
  players: Player[]
): DoubleAuctionState {
  // Must have a second card offered
  if (!state.secondCard) {
    throw new Error('No second card has been offered')
  }

  // Validate auction is active
  if (!state.isActive) {
    throw new Error('Auction is not active')
  }

  // Check if winner can afford
  const winner = players.find(p => p.id === winnerId)
  if (!winner) {
    throw new Error('Winner not found')
  }

  if (finalPrice > winner.money) {
    throw new Error(`Winner only has ${winner.money}, cannot pay ${finalPrice}`)
  }

  return {
    ...state,
    sold: true,
    winnerId,
    finalPrice,
    isActive: false,
  }
}

export function concludeAuction(
  state: DoubleAuctionState,
  players: Player[]
): AuctionResult {
  if (state.isActive || !state.sold) {
    throw new Error('Cannot conclude incomplete auction')
  }

  // No one offered a second card - original auctioneer gets double card for free
  if (!state.secondCard) {
    return {
      winnerId: state.originalAuctioneerId,
      auctioneerId: state.originalAuctioneerId,
      salePrice: 0,
      card: state.doubleCard, // Only gets the double card
      profit: 0,
      type: 'double',
    }
  }

  // Someone offered and auction concluded
  if (!state.winnerId || state.finalPrice === undefined) {
    throw new Error('Auction incomplete - missing winner or final price')
  }

  const winner = players.find(p => p.id === state.winnerId)
  const currentAuctioneer = players.find(p => p.id === state.currentAuctioneerId)

  if (!winner || !currentAuctioneer) {
    throw new Error('Winner or current auctioneer not found')
  }

  // If winner is the current auctioneer (who offered the card), they pay bank
  if (winner.id === currentAuctioneer.id) {
    return {
      winnerId: winner.id,
      auctioneerId: state.currentAuctioneerId,
      salePrice: state.finalPrice,
      card: state.doubleCard, // Winner gets both cards, but we return the double card as primary
      profit: 0, // No profit when buying from bank
      type: 'double',
    }
  }

  // Another player won - current auctioneer gets the money
  return {
    winnerId: winner.id,
    auctioneerId: state.currentAuctioneerId,
    salePrice: state.finalPrice,
    card: state.doubleCard, // Winner gets both cards
    profit: state.finalPrice,
    type: 'double',
  }
}

/**
 * Get the current player whose turn it is to offer
 */
export function getCurrentPlayer(state: DoubleAuctionState): string | null {
  if (!state.isActive || state.sold) {
    return null
  }
  if (state.currentTurnIndex >= state.turnOrder.length) {
    return null
  }
  return state.turnOrder[state.currentTurnIndex]
}

/**
 * Check if it's a player's turn to offer
 */
export function isPlayerTurn(state: DoubleAuctionState, playerId: string): boolean {
  return getCurrentPlayer(state) === playerId
}

/**
 * Check if a second card has been offered
 */
export function hasSecondCardOffered(state: DoubleAuctionState): boolean {
  return state.secondCard !== null
}

/**
 * Get the current auctioneer (player who offered second card)
 */
export function getCurrentAuctioneer(state: DoubleAuctionState): string | null {
  if (!hasSecondCardOffered(state)) {
    return state.originalAuctioneerId
  }
  return state.currentAuctioneerId
}

/**
 * Get all valid actions for a player in the current auction state
 */
export function getValidActions(
  state: DoubleAuctionState,
  playerId: string,
  players: Player[]
): Array<{ type: 'offer' | 'decline' | 'bid'; amount?: number }> {
  const actions: Array<{ type: 'offer' | 'decline' | 'bid'; amount?: number }> = []

  // Can't act if auction is not active or already sold
  if (!state.isActive || state.sold) {
    return actions
  }

  // If no second card offered yet, players can offer or decline
  if (!state.secondCard) {
    // Can only act if it's this player's turn
    if (isPlayerTurn(state, playerId)) {
      actions.push({ type: 'decline' })
      actions.push({ type: 'offer' }) // In real game, would check player's hand for valid cards
    }
  } else {
    // Second card has been offered - this becomes a regular auction of that type
    const currentAuctioneer = getCurrentAuctioneer(state)
    if (currentAuctioneer && playerId !== currentAuctioneer) {
      // Can bid (simplified - would depend on auction type)
      const player = players.find(p => p.id === playerId)
      if (player && player.money > 0) {
        actions.push({ type: 'bid', amount: 1 })
      }
    }
  }

  return actions
}

/**
 * Get auction status summary
 */
export function getAuctionStatus(state: DoubleAuctionState): {
  currentPlayer: string | null
  originalAuctioneer: string
  currentAuctioneer: string | null
  hasSecondCard: boolean
  auctionType: string
  sold: boolean
  passedCount: number
} {
  return {
    currentPlayer: getCurrentPlayer(state),
    originalAuctioneer: state.originalAuctioneerId,
    currentAuctioneer: getCurrentAuctioneer(state),
    hasSecondCard: hasSecondCardOffered(state),
    auctionType: state.auctionType,
    sold: state.sold,
    passedCount: state.currentTurnIndex,
  }
}

/**
 * Get both cards that will be awarded to winner
 */
export function getCardsForWinner(state: DoubleAuctionState): Card[] {
  const cards: Card[] = [state.doubleCard]

  if (state.secondCard) {
    cards.push(state.secondCard)
  }

  return cards
}

/**
 * Check if player has a card of the same artist (for offering in double auction)
 * In real implementation, this would check the player's hand
 */
export function hasMatchingCard(
  playerId: string,
  doubleCard: Card,
  playerHand: Card[]
): boolean {
  return playerHand.some(card =>
    card.artist === doubleCard.artist &&
    card.auctionType !== 'double'
  )
}

/**
 * Get all possible second cards a player can offer
 */
export function getPossibleSecondCards(
  playerId: string,
  doubleCard: Card,
  playerHand: Card[]
): Card[] {
  return playerHand.filter(card =>
    card.artist === doubleCard.artist &&
    card.auctionType !== 'double'
  )
}

/**
 * Start the bidding phase after a second card has been offered
 */
export function startBiddingPhase(
  state: DoubleAuctionState,
  secondCard: Card,
  auctioneerId: string
): DoubleAuctionState {
  return {
    ...state,
    secondCard,
    currentAuctioneerId: auctioneerId,
    auctionType: secondCard.auctionType,
    phase: 'bidding',
    currentTurnIndex: 0 // Reset for bidding phase
  }
}