import type { GameState, Card, Player } from '../types/game'
import { createDeck, shuffleDeck } from './deck'
import { createInitialBoard } from './valuation'
import { ARTISTS, CARD_DISTRIBUTION, STARTING_MONEY, getTurnOrder } from './constants'

let cardIdCounter = 1000 // Start from 1000 to avoid conflicts with real deck cards

function generateTestCardId(): string {
  return `test_card_${cardIdCounter++}`
}

/**
 * Simulated auction result for test scenario generation
 */
interface SimulatedAuction {
  card: Card
  sold: boolean
  winnerIndex: number | null
  salePrice: number | null
}

/**
 * Simulate an auction with realistic bidding behavior
 */
function simulateAuction(
  card: Card,
  bidders: number[],
  startingMoney: Record<number, number>
): SimulatedAuction {
  // Different auction types have different sale patterns
  const auctionType = card.auctionType

  // For fixed price, always sells at random price between 10-30
  if (auctionType === 'fixed_price') {
    const price = Math.floor(Math.random() * 3) * 10 + 10 // 10, 20, or 30
    // Random bidder who can afford it
    const eligibleBidders = bidders.filter(i => startingMoney[i] >= price)
    if (eligibleBidders.length === 0) {
      return { card, sold: false, winnerIndex: null, salePrice: null }
    }
    const winner = eligibleBidders[Math.floor(Math.random() * eligibleBidders.length)]
    return { card, sold: true, winnerIndex: winner, salePrice: price }
  }

  // For one offer, single sealed bid
  if (auctionType === 'one_offer') {
    const eligibleBidders = bidders.filter(i => startingMoney[i] >= 10)
    if (eligibleBidders.length === 0) {
      return { card, sold: false, winnerIndex: null, salePrice: null }
    }
    // Pick a random bidder, they bid random amount
    const bidder = eligibleBidders[Math.floor(Math.random() * eligibleBidders.length)]
    const maxBid = Math.min(startingMoney[bidder], 50)
    const bid = Math.floor(Math.random() * (maxBid / 10)) * 10 + 10
    return { card, sold: true, winnerIndex: bidder, salePrice: bid }
  }

  // For hidden auction, pick highest of random sealed bids
  if (auctionType === 'hidden') {
    const bids = bidders
      .filter(i => startingMoney[i] >= 10)
      .map(i => {
        const maxBid = Math.min(startingMoney[i], 60)
        return {
          playerIndex: i,
          bid: Math.floor(Math.random() * (maxBid / 10)) * 10 + 10
        }
      })
      .filter(b => b.bid > 0)

    if (bids.length === 0) {
      return { card, sold: false, winnerIndex: null, salePrice: null }
    }

    bids.sort((a, b) => b.bid - a.bid)
    const winner = bids[0]
    return { card, sold: true, winnerIndex: winner.playerIndex, salePrice: winner.bid }
  }

  // For open auction, simulate competitive bidding
  if (auctionType === 'open' || auctionType === 'double') {
    const bids = bidders
      .filter(i => startingMoney[i] >= 10)
      .map(i => {
        const maxBid = Math.min(startingMoney[i], auctionType === 'double' ? 70 : 60)
        return {
          playerIndex: i,
          maxBid: Math.floor(Math.random() * (maxBid / 10)) * 10 + 10
        }
      })

    if (bids.length === 0) {
      return { card, sold: false, winnerIndex: null, salePrice: null }
    }

    // Simulate bidding war - final price near second-highest max bid
    bids.sort((a, b) => b.maxBid - a.maxBid)

    if (bids.length === 1) {
      // Only one bidder, they get it cheap
      return { card, sold: true, winnerIndex: bids[0].playerIndex, salePrice: 10 }
    }

    const winner = bids[0]
    const runnerUp = bids[1]
    // Final price is slightly above runner-up's max, or minimum increment
    const finalPrice = Math.min(
      runnerUp.maxBid + 10,
      winner.maxBid
    )

    return { card, sold: true, winnerIndex: winner.playerIndex, salePrice: finalPrice }
  }

  return { card, sold: false, winnerIndex: null, salePrice: null }
}

/**
 * Create a test card with specific properties
 */
function createTestCard(
  artist: string,
  auctionType: string,
  artworkId: string
): Card {
  return {
    id: generateTestCardId(),
    artist: artist as any,
    auctionType: auctionType as any,
    artworkId
  }
}

/**
 * Create a round-end test scenario for debugging round transitions
 *
 * This creates a realistic game state where:
 * - One random artist has 4 cards played (one away from ending the round)
 * - Several auctions have been simulated with realistic bidding
 * - Players have purchases with appropriate prices and money deducted
 * - Human player has the 5th card of that artist in hand
 * - It's the human player's turn to play
 */
export function createRoundEndTestScenario(
  playerCount: 3 | 4 | 5,
  humanPlayerIndex: number = 0
): GameState {
  // Create a fresh deck for remaining cards
  const fullDeck = createDeck()
  const usedCardIds = new Set<string>()

  // Initialize players with starting money
  const players: Player[] = Array.from({ length: playerCount }, (_, i) => ({
    id: i === humanPlayerIndex ? 'human_player' : `ai_player_${i}`,
    name: i === humanPlayerIndex ? 'You' : `AI ${i + 1}`,
    money: STARTING_MONEY,
    hand: [],
    purchasedThisRound: [],
    purchases: [],
    isAI: i !== humanPlayerIndex,
    aiDifficulty: i !== humanPlayerIndex ? 'medium' : undefined
  }))

  // Pick a random artist to be close to ending the round (4 cards played)
  const nearEndArtistIndex = Math.floor(Math.random() * ARTISTS.length)
  const nearEndArtist = ARTISTS[nearEndArtistIndex]

  // Track player money as auctions happen
  const playerMoney: Record<number, number> = {}
  players.forEach((_, i) => playerMoney[i] = STARTING_MONEY)

  // Simulate some auctions to create realistic game state
  const playedCards: Card[] = []
  const discardPile: Card[] = []
  const board = createInitialBoard()
  const cardsPlayedPerArtist: Record<string, number> = {}
  ARTISTS.forEach(a => cardsPlayedPerArtist[a] = 0)

  // Simulate 3-6 random auctions before the test scenario
  const auctionCount = 3 + Math.floor(Math.random() * 4)
  const playerIndexes = Array.from({ length: playerCount }, (_, i) => i)

  for (let i = 0; i < auctionCount; i++) {
    const auctioneerIndex = i % playerCount
    const turnOrder = getTurnOrder(auctioneerIndex, playerCount)

    // Pick a random card (not the near-end artist if we already have 4)
    let artistForCard = ARTISTS[Math.floor(Math.random() * ARTISTS.length)]
    const currentNearEndCount = cardsPlayedPerArtist[nearEndArtist]

    // Don't play more than 4 of the near-end artist
    if (artistForCard === nearEndArtist && currentNearEndCount >= 4) {
      artistForCard = ARTISTS.find(a => a !== nearEndArtist && cardsPlayedPerArtist[a] < 4) || nearEndArtist
    }

    // Pick auction type
    const auctionTypes = ['open', 'one_offer', 'hidden', 'fixed_price']
    const auctionType = auctionTypes[Math.floor(Math.random() * auctionTypes.length)]

    const card = createTestCard(artistForCard, auctionType, `test_${artistForCard}_${i}`)

    // Simulate the auction
    const result = simulateAuction(card, turnOrder, playerMoney)

    if (result.sold && result.winnerIndex !== null && result.salePrice !== null) {
      // Card was sold - add to winner's purchasedThisRound and deduct money
      const soldCard: Card = {
        ...result.card,
        purchasePrice: result.salePrice,
        purchasedRound: 1
      }

      players[result.winnerIndex].purchasedThisRound.push(soldCard)
      playerMoney[result.winnerIndex] -= result.salePrice

      // Add to discard pile with sale info
      discardPile.push(soldCard)
    } else {
      // Card wasn't sold - goes to auctioneer for free
      const auctioneerCard: Card = {
        ...result.card,
        purchasePrice: 0,
        purchasedRound: 1
      }

      players[auctioneerIndex].purchasedThisRound.push(auctioneerCard)
      discardPile.push(auctioneerCard)
    }

    // Card counts as played
    playedCards.push(result.card)
    cardsPlayedPerArtist[result.card.artist] = (cardsPlayedPerArtist[result.card.artist] || 0) + 1
    usedCardIds.add(result.card.id)
  }

  // Now ensure near-end artist has exactly 4 cards played
  while (cardsPlayedPerArtist[nearEndArtist] < 4) {
    const auctionTypes = ['open', 'one_offer', 'hidden', 'fixed_price']
    const auctionType = auctionTypes[Math.floor(Math.random() * auctionTypes.length)]
    const card = createTestCard(nearEndArtist, auctionType, `test_${nearEndArtist}_${playedCards.length}`)

    const auctioneerIndex = playedCards.length % playerCount
    const turnOrder = getTurnOrder(auctioneerIndex, playerCount)
    const result = simulateAuction(card, turnOrder, playerMoney)

    if (result.sold && result.winnerIndex !== null && result.salePrice !== null) {
      const soldCard: Card = {
        ...result.card,
        purchasePrice: result.salePrice,
        purchasedRound: 1
      }
      players[result.winnerIndex].purchasedThisRound.push(soldCard)
      playerMoney[result.winnerIndex] -= result.salePrice
      discardPile.push(soldCard)
    } else {
      const auctioneerCard: Card = {
        ...result.card,
        purchasePrice: 0,
        purchasedRound: 1
      }
      players[auctioneerIndex].purchasedThisRound.push(auctioneerCard)
      discardPile.push(auctioneerCard)
    }

    playedCards.push(result.card)
    cardsPlayedPerArtist[nearEndArtist]++
    usedCardIds.add(result.card.id)
  }

  // Update player money to reflect auction results
  players.forEach((player, i) => {
    player.money = playerMoney[i]
  })

  // Create the 5th card for human player (the trigger card)
  const triggerCard = createTestCard(
    nearEndArtist,
    'open',
    `trigger_${nearEndArtist}`
  )

  // Add to human player's hand
  players[humanPlayerIndex].hand.push(triggerCard)
  usedCardIds.add(triggerCard.id)

  // Give other players some cards from the deck
  const remainingDeck = shuffleDeck(
    fullDeck.filter(c => !usedCardIds.has(c.id))
  )

  // Deal cards to all players
  const cardsPerPlayer = playerCount === 3 ? 6 : playerCount === 4 ? 4 : 3
  players.forEach((player, i) => {
    if (i !== humanPlayerIndex) {
      const cardsNeeded = cardsPerPlayer
      player.hand.push(...remainingDeck.splice(0, cardsNeeded))
    } else {
      // Human player gets a few more cards
      const extraCards = cardsPerPlayer - 1 // Already has trigger card
      player.hand.push(...remainingDeck.splice(0, extraCards))
    }
  })

  // Update board with played cards
  playedCards.forEach(card => {
    board.playedCards[card.artist].push(card)
  })

  // Create the game state
  const gameState: GameState = {
    players,
    deck: remainingDeck,
    discardPile,
    board,
    round: {
      roundNumber: 1,
      cardsPlayedPerArtist,
      currentAuctioneerIndex: humanPlayerIndex,
      phase: {
        type: 'awaiting_card_play',
        activePlayerIndex: humanPlayerIndex
      }
    },
    gamePhase: 'playing',
    winner: null,
    eventLog: []
  }

  console.log('[createRoundEndTestScenario] Created test scenario:', {
    playerCount,
    humanPlayerIndex,
    nearEndArtist,
    cardsPlayedPerArtist,
    humanHand: players[humanPlayerIndex].hand.map(c => ({
      id: c.id,
      artist: c.artist,
      auctionType: c.auctionType
    })),
    playerMoney: players.map(p => ({ name: p.name, money: p.money })),
    purchasedThisRound: players.map(p => ({ name: p.name, count: p.purchasedThisRound.length }))
  })

  return gameState
}

/**
 * Create a test scenario for round 2 → 3 transition
 */
export function createRound2To3TestScenario(
  playerCount: 3 | 4 | 5,
  humanPlayerIndex: number = 0
): GameState {
  // Start with round 1 scenario, advance through rounds
  let gameState = createRoundEndTestScenario(playerCount, humanPlayerIndex)

  // Simulate round 1 completion
  // TODO: Implement proper round progression simulation

  return gameState
}

/**
 * Create a test scenario for round 3 → 4 transition
 */
export function createRound3To4TestScenario(
  playerCount: 3 | 4 | 5,
  humanPlayerIndex: number = 0
): GameState {
  // Start with round 2 scenario, advance
  const gameState = createRound2To3TestScenario(playerCount, humanPlayerIndex)

  // TODO: Implement proper round progression simulation

  return gameState
}
