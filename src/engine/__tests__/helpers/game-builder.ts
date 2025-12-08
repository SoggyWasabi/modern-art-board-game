import type { GameState, GameSetup, PlayerConfig, Card, Painting } from '../../../types/game'
import { startGame } from '../../game'
import { ARTISTS, CARDS_PER_ARTIST } from '../../constants'
import { createDeck } from '../../deck'

/**
 * Game Builder for creating test game states
 *
 * Provides utilities to create games with specific scenarios,
 * useful for testing edge cases and specific game states.
 */

export interface GameBuilderOptions {
  playerCount: 3 | 4 | 5
  players?: Partial<PlayerConfig>[]
  startingMoney?: number
  round?: number
  phase?: string
  auctioneerIndex?: number
}

/**
 * Create a basic game setup
 */
export function createGameSetup({
  playerCount,
  players = [],
  startingMoney = 100
}: GameBuilderOptions): GameSetup {
  const playerConfigs: PlayerConfig[] = []

  for (let i = 0; i < playerCount; i++) {
    playerConfigs.push({
      id: players[i]?.id || `player_${i}`,
      name: players[i]?.name || `Player ${i + 1}`,
      type: players[i]?.type || 'human',
      aiDifficulty: players[i]?.aiDifficulty || 'medium',
      color: players[i]?.color || `#${i.toString(16).padStart(2, '0')}0000`
    })
  }

  return {
    playerCount,
    players: playerConfigs,
    startingMoney
  }
}

/**
 * Create a game with specific card distribution
 */
export function createGameWithFixedHands(
  setup: GameSetup,
  hands: Card[][]
): GameState {
  const game = startGame(setup)

  // Replace players' hands with fixed hands
  const newPlayers = game.players.map((player, index) => ({
    ...player,
    hand: hands[index] || []
  }))

  // Remove dealt cards from deck
  const dealtCards = hands.flat()
  const dealtCardIds = new Set(dealtCards.map(c => c.id))
  const newDeck = game.deck.filter(card => !dealtCardIds.has(card.id))

  return {
    ...game,
    deck: newDeck,
    players: newPlayers
  }
}

/**
 * Create a game in a specific round and phase
 */
export function createGameInRound(
  setup: GameSetup,
  roundNumber: 1 | 2 | 3 | 4,
  cardsPlayedPerArtist: Record<string, number> = {},
  auctioneerIndex: number = 0
): GameState {
  const game = startGame(setup)

  // Advance to specified round
  let currentGame = game
  for (let r = 1; r < roundNumber; r++) {
    // Simulate round completion (simplified)
    const { endRound } = require('../../round')
    const { nextRound } = require('../../game')

    currentGame = endRound(currentGame)
    currentGame = nextRound(currentGame)
  }

  // Set cards played per artist
  currentGame = {
    ...currentGame,
    round: {
      ...currentGame.round,
      roundNumber,
      currentAuctioneerIndex: auctioneerIndex,
      cardsPlayedPerArtist: {
        ...Object.fromEntries(ARTISTS.map(a => [a, 0])),
        ...cardsPlayedPerArtist
      }
    }
  }

  return currentGame
}

/**
 * Create a game with specific artist valuations
 */
export function createGameWithArtistValues(
  setup: GameSetup,
  artistValues: Record<string, number[]>
): GameState {
  const game = startGame(setup)

  // Create board with specified values
  const board = { ...game.board }
  ARTISTS.forEach(artist => {
    if (artistValues[artist]) {
      board.artistValues[artist] = artistValues[artist]
    }
  })

  return {
    ...game,
    board
  }
}

/**
 * Create a game with players having specific money and paintings
 */
export function createGameWithPlayerState(
  setup: GameSetup,
  playerStates: Array<{
    money?: number
    hand?: Card[]
    purchases?: Painting[]
    purchasedThisRound?: Painting[]
  }>
): GameState {
  const game = startGame(setup)

  // Update players with specified state
  const newPlayers = game.players.map((player, index) => {
    const state = playerStates[index] || {}
    return {
      ...player,
      money: state.money ?? player.money,
      hand: state.hand ?? player.hand,
      purchases: state.purchases ?? player.purchases,
      purchasedThisRound: state.purchasedThisRound ?? player.purchasedThisRound
    }
  })

  return {
    ...game,
    players: newPlayers
  }
}

/**
 * Create a game on the verge of ending a round (5th card scenario)
 */
export function createGameNearRoundEnd(
  setup: GameSetup,
  artist: string,
  currentCards: number = 4,
  nextPlayerIndex: number = 0
): GameState {
  const game = startGame(setup)

  // Set up 4 cards of the specified artist
  const cardsPlayed = { ...game.round.cardsPlayedPerArtist }
  cardsPlayed[artist] = currentCards

  // Give next player a card of that artist
  const fifthCard: Card = {
    id: `fifth_card_${artist}`,
    artist: artist as any,
    auctionType: 'open',
    artworkId: `${artist.toLowerCase()}_fifth`
  }

  const newPlayers = [...game.players]
  newPlayers[nextPlayerIndex] = {
    ...newPlayers[nextPlayerIndex],
    hand: [fifthCard]
  }

  return {
    ...game,
    round: {
      ...game.round,
      cardsPlayedPerArtist: cardsPlayed,
      phase: { type: 'awaiting_card_play', activePlayerIndex: nextPlayerIndex }
    },
    players: newPlayers
  }
}

/**
 * Create a game with bankruptcy scenario
 */
export function createBankruptcyScenario(
  setup: GameSetup,
  bankruptPlayerIndex: number = 0
): GameState {
  const game = startGame(setup)

  // Make one player nearly broke
  const newPlayers = [...game.players]
  newPlayers[bankruptPlayerIndex] = {
    ...newPlayers[bankruptPlayerIndex],
    money: 5  // Very low money
  }

  // Give them a hand with expensive cards
  const expensiveCards: Card[] = [
    {
      id: 'expensive_card_1',
      artist: ARTISTS[0],
      auctionType: 'open',
      artworkId: 'expensive_1'
    },
    {
      id: 'expensive_card_2',
      artist: ARTISTS[1],
      auctionType: 'sealed',
      artworkId: 'expensive_2'
    }
  ]

  newPlayers[bankruptPlayerIndex].hand = expensiveCards

  return {
    ...game,
    players: newPlayers
  }
}

/**
 * Create a game with tie scenario
 */
export function createTieScenario(
  setup: GameSetup,
  tiedPlayerIndices: number[] = [0, 1]
): GameState {
  const game = startGame(setup)

  // Give tied players same money
  const tieMoney = 200
  const newPlayers = [...game.players]

  tiedPlayerIndices.forEach(index => {
    newPlayers[index] = {
      ...newPlayers[index],
      money: tieMoney
    }
  })

  // Give first tied player more paintings (for tie-breaker)
  if (tiedPlayerIndices.length > 1) {
    const paintings: Painting[] = [
      {
        card: { id: 'painting_1', artist: ARTISTS[0], auctionType: 'open', artworkId: 'art1' },
        artist: ARTISTS[0],
        purchasePrice: 10,
        purchasedRound: 1
      },
      {
        card: { id: 'painting_2', artist: ARTISTS[1], auctionType: 'open', artworkId: 'art2' },
        artist: ARTISTS[1],
        purchasePrice: 10,
        purchasedRound: 1
      }
    ]

    newPlayers[tiedPlayerIndices[0]].purchases = paintings
  }

  // Set to final round
  newPlayers.forEach((player, index) => {
    if (!tiedPlayerIndices.includes(index)) {
      player.money = 100  // Lower money for other players
    }
  })

  return {
    ...game,
    round: {
      ...game.round,
      roundNumber: 4
    },
    players: newPlayers
  }
}

/**
 * Create a deterministic game from a seed
 */
export function createDeterministicGame(seed: number, playerCount: 3 | 4 | 5 = 4): GameState {
  // Simple seeded random number generator
  let rng = seed

  function random(): number {
    rng = (rng * 9301 + 49297) % 233280
    return rng / 233280
  }

  function shuffle<T>(array: T[]): T[] {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  // Create deck with specific order
  const deck = createDeck()
  const shuffledDeck = shuffle(deck)

  // Create game
  const setup = createGameSetup({ playerCount })
  let game = startGame(setup)

  // Replace deck with deterministic one
  game = {
    ...game,
    deck: shuffledDeck
  }

  return game
}

/**
 * Validate a created game state
 */
export function validateCreatedGame(game: GameState, options: GameBuilderOptions): void {
  // Basic validations
  expect(game.players.length).toBe(options.playerCount)
  expect(game.players.every(p => p.money >= 0)).toBe(true)
  expect(game.round.roundNumber).toBeGreaterThanOrEqual(1)
  expect(game.round.roundNumber).toBeLessThanOrEqual(4)

  // Player names should be unique
  const playerNames = game.players.map(p => p.name)
  const uniqueNames = new Set(playerNames)
  expect(uniqueNames.size).toBe(playerNames.length)

  // Deck should be valid subset of full deck
  const totalCards = 70
  const accountedCards =
    game.deck.length +
    game.discardPile.length +
    game.players.reduce((sum, p) => sum + (p.hand?.length || 0), 0) +
    game.players.reduce((sum, p) => sum + (p.purchases?.length || 0), 0)

  expect(accountedCards).toBeLessThanOrEqual(totalCards)
}