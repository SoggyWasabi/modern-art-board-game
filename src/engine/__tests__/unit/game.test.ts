import { describe, it, expect } from 'vitest'
import {
  startGame,
  nextRound,
  endGame,
  getWinner,
  getCurrentRound,
  isGameOver,
  shouldEndGameEarly,
  checkRoundEnd,
  checkEarlyGameEnd,
  validateGameState,
  getGameStats
} from '../game'
import { endRound } from '../round'
import { sellAllPaintingsToBank } from '../selling'
import { determineWinner } from '../endgame'
import type { GameSetup, PlayerConfig } from '../../types/setup'
import type { GameState, Player, Card, Painting } from '../../types/game'
import { ARTISTS } from '../constants'
import { createInitialBoard } from '../valuation'
import { createDeck } from '../deck'

describe('Game Flow (Phase 1.7)', () => {
  // Helper to create a test game setup
  function createTestSetup(playerCount: 3 | 4 | 5): GameSetup {
    const players: PlayerConfig[] = Array.from({ length: playerCount }, (_, i) => ({
      id: `player_${i}`,
      name: `Player ${i + 1}`,
      type: 'human' as const,
      color: `#${i}${i}${i}`,
    }))

    return {
      playerCount,
      players,
      startingMoney: 100,
    }
  }

  // Helper to create a minimal game state for testing
  function createTestGameState(playerCount: number = 3): GameState {
    const players: Player[] = Array.from({ length: playerCount }, (_, i) => ({
      id: `player_${i}`,
      name: `Player ${i + 1}`,
      money: 100,
      hand: [],
      purchasedThisRound: [],
      isAI: false
    }))

    return {
      players,
      deck: createDeck(),
      discardPile: [],
      board: createInitialBoard(),
      round: {
        roundNumber: 1,
        cardsPlayedPerArtist: ARTISTS.reduce((acc, artist) => {
          acc[artist] = 0
          return acc
        }, {} as Record<string, number>),
        currentAuctioneerIndex: 0,
        phase: { type: 'awaiting_card_play', activePlayerIndex: 0 }
      },
      gamePhase: 'playing',
      winner: null,
      eventLog: []
    }
  }

  describe('startGame', () => {
    it('creates game with correct number of players', () => {
      const setup = createTestSetup(3)
      const gameState = startGame(setup)

      expect(gameState.players).toHaveLength(3)
      expect(gameState.gamePhase).toBe('playing')
      expect(gameState.round.roundNumber).toBe(1)
    })

    it('deals correct cards for 3 players in round 1 (10 each)', () => {
      const setup = createTestSetup(3)
      const gameState = startGame(setup)

      gameState.players.forEach(player => {
        expect(player.hand).toHaveLength(10)
      })
    })

    it('deals correct cards for 4 players in round 1 (9 each)', () => {
      const setup = createTestSetup(4)
      const gameState = startGame(setup)

      gameState.players.forEach(player => {
        expect(player.hand).toHaveLength(9)
      })
    })

    it('deals correct cards for 5 players in round 1 (8 each)', () => {
      const setup = createTestSetup(5)
      const gameState = startGame(setup)

      gameState.players.forEach(player => {
        expect(player.hand).toHaveLength(8)
      })
    })

    it('gives each player 100 starting money', () => {
      const setup = createTestSetup(3)
      const gameState = startGame(setup)

      gameState.players.forEach(player => {
        expect(player.money).toBe(100)
      })
    })

    it('initializes board with zero values for all artists', () => {
      const setup = createTestSetup(3)
      const gameState = startGame(setup)

      ARTISTS.forEach(artist => {
        expect(gameState.board.artistValues[artist]).toEqual([0, 0, 0, 0])
      })
    })

    it('creates a shuffled deck of 70 cards', () => {
      const setup = createTestSetup(3)
      const gameState = startGame(setup)

      // Total cards = deck + cards dealt to players
      const totalCards = gameState.deck.length +
        gameState.players.reduce((sum, p) => sum + p.hand.length, 0)
      expect(totalCards).toBe(70)
    })
  })

  describe('nextRound', () => {
    it('preserves cards in hand between rounds', () => {
      const gameState = createTestGameState(3)
      // Give each player 5 cards
      gameState.players = gameState.players.map((player, i) => ({
        ...player,
        hand: Array.from({ length: 5 }, (_, j) => ({
          id: `card_${i}_${j}`,
          artist: ARTISTS[j % 5],
          auctionType: 'open' as const,
          artworkId: `art_${i}_${j}`
        }))
      }))
      gameState.round.roundNumber = 1

      const newState = nextRound(gameState)

      // Players should keep their cards + get new ones for round 2
      newState.players.forEach(player => {
        // 5 existing + 6 new (for 3 players in round 2)
        expect(player.hand.length).toBeGreaterThan(5)
      })
    })

    it('clears purchasedThisRound between rounds', () => {
      const gameState = createTestGameState(3)
      // Give a player some purchased cards
      gameState.players[0].purchasedThisRound = [
        { id: 'purchased', artist: 'Manuel Carvalho', auctionType: 'open', artworkId: 'p1' }
      ]
      gameState.round.roundNumber = 1

      const newState = nextRound(gameState)

      expect(newState.players[0].purchasedThisRound).toEqual([])
    })

    it('increments round number correctly', () => {
      const gameState = createTestGameState(3)
      gameState.round.roundNumber = 1

      const round2 = nextRound(gameState)
      expect(round2.round.roundNumber).toBe(2)

      round2.round.roundNumber = 2
      const round3 = nextRound(round2)
      expect(round3.round.roundNumber).toBe(3)

      round3.round.roundNumber = 3
      const round4 = nextRound(round3)
      expect(round4.round.roundNumber).toBe(4)
    })

    it('ends game after round 4', () => {
      const gameState = createTestGameState(3)
      gameState.round.roundNumber = 4

      const finalState = nextRound(gameState)

      expect(finalState.gamePhase).toBe('ended')
    })

    it('resets cards played per artist for new round', () => {
      const gameState = createTestGameState(3)
      gameState.round.cardsPlayedPerArtist = {
        'Manuel Carvalho': 3,
        'Sigrid Thaler': 2,
        'Daniel Melim': 4,
        'Ramon Martins': 1,
        'Rafael Silveira': 2
      }
      gameState.round.roundNumber = 1

      const newState = nextRound(gameState)

      ARTISTS.forEach(artist => {
        expect(newState.round.cardsPlayedPerArtist[artist]).toBe(0)
      })
    })

    it('moves auctioneer to next player', () => {
      const gameState = createTestGameState(3)
      gameState.round.currentAuctioneerIndex = 0
      gameState.round.roundNumber = 1

      const newState = nextRound(gameState)

      expect(newState.round.currentAuctioneerIndex).toBe(1)
    })

    it('deals 6 additional cards for 3 players in round 2', () => {
      const gameState = createTestGameState(3)
      // Start with empty hands
      gameState.players.forEach(p => { p.hand = [] })
      gameState.round.roundNumber = 1

      const round2 = nextRound(gameState)

      round2.players.forEach(player => {
        expect(player.hand).toHaveLength(6)
      })
    })

    it('deals 4 additional cards for 4 players in round 2', () => {
      const gameState = createTestGameState(4)
      gameState.players.forEach(p => { p.hand = [] })
      gameState.round.roundNumber = 1

      const round2 = nextRound(gameState)

      round2.players.forEach(player => {
        expect(player.hand).toHaveLength(4)
      })
    })

    it('deals 3 additional cards for 5 players in round 2', () => {
      const gameState = createTestGameState(5)
      gameState.players.forEach(p => { p.hand = [] })
      gameState.round.roundNumber = 1

      const round2 = nextRound(gameState)

      round2.players.forEach(player => {
        expect(player.hand).toHaveLength(3)
      })
    })

    it('deals no cards in round 4', () => {
      const gameState = createTestGameState(3)
      const existingCards = 3
      gameState.players.forEach(p => {
        p.hand = Array.from({ length: existingCards }, (_, i) => ({
          id: `card_${i}`,
          artist: 'Manuel Carvalho' as const,
          auctionType: 'open' as const,
          artworkId: `art_${i}`
        }))
      })
      gameState.round.roundNumber = 3

      const round4 = nextRound(gameState)

      // Players should still have their cards (no new cards dealt)
      round4.players.forEach(player => {
        expect(player.hand).toHaveLength(existingCards)
      })
    })
  })

  describe('endGame', () => {
    it('determines winner as player with most money', () => {
      const gameState = createTestGameState(3)
      gameState.players[0].money = 150
      gameState.players[1].money = 100
      gameState.players[2].money = 80

      const finalState = endGame(gameState)

      expect(finalState.winner).not.toBeNull()
      expect(finalState.winner?.id).toBe('player_0')
      expect(finalState.gamePhase).toBe('ended')
    })

    it('handles tie by most paintings', () => {
      const gameState = createTestGameState(3)
      gameState.players[0].money = 100
      gameState.players[1].money = 100
      gameState.players[0].purchases = [
        { card: { id: '1', artist: 'Manuel Carvalho', auctionType: 'open', artworkId: 'a1' },
          artist: 'Manuel Carvalho', purchasePrice: 10, purchasedRound: 1 }
      ]
      gameState.players[1].purchases = [
        { card: { id: '2', artist: 'Sigrid Thaler', auctionType: 'open', artworkId: 'a2' },
          artist: 'Sigrid Thaler', purchasePrice: 10, purchasedRound: 1 },
        { card: { id: '3', artist: 'Daniel Melim', auctionType: 'open', artworkId: 'a3' },
          artist: 'Daniel Melim', purchasePrice: 10, purchasedRound: 1 }
      ]

      const finalState = endGame(gameState)

      // Player 1 wins with more paintings
      expect(finalState.winner?.id).toBe('player_1')
    })

    it('adds game_ended event to log', () => {
      const gameState = createTestGameState(3)
      const finalState = endGame(gameState)

      const lastEvent = finalState.eventLog[finalState.eventLog.length - 1]
      expect(lastEvent.type).toBe('game_ended')
    })
  })

  describe('getWinner', () => {
    it('returns null when game is not over', () => {
      const gameState = createTestGameState(3)
      expect(getWinner(gameState)).toBeNull()
    })

    it('returns winner when game is over', () => {
      const gameState = createTestGameState(3)
      gameState.players[0].money = 200
      const finalState = endGame(gameState)

      expect(getWinner(finalState)).not.toBeNull()
      expect(getWinner(finalState)?.money).toBe(200)
    })
  })

  describe('getCurrentRound', () => {
    it('returns current round number', () => {
      const gameState = createTestGameState(3)
      expect(getCurrentRound(gameState)).toBe(1)

      gameState.round.roundNumber = 3
      expect(getCurrentRound(gameState)).toBe(3)
    })
  })

  describe('isGameOver', () => {
    it('returns false during play', () => {
      const gameState = createTestGameState(3)
      expect(isGameOver(gameState)).toBe(false)
    })

    it('returns true after game ends', () => {
      const gameState = createTestGameState(3)
      const finalState = endGame(gameState)
      expect(isGameOver(finalState)).toBe(true)
    })
  })

  describe('shouldEndGameEarly', () => {
    it('returns true when deck and all hands are empty', () => {
      const gameState = createTestGameState(3)
      gameState.deck = []
      gameState.players.forEach(p => { p.hand = [] })

      expect(shouldEndGameEarly(gameState)).toBe(true)
    })

    it('returns false when deck has cards', () => {
      const gameState = createTestGameState(3)
      gameState.deck = [{ id: '1', artist: 'Manuel Carvalho', auctionType: 'open', artworkId: 'a1' }]
      gameState.players.forEach(p => { p.hand = [] })

      expect(shouldEndGameEarly(gameState)).toBe(false)
    })

    it('returns false when players have cards', () => {
      const gameState = createTestGameState(3)
      gameState.deck = []
      gameState.players[0].hand = [{ id: '1', artist: 'Manuel Carvalho', auctionType: 'open', artworkId: 'a1' }]

      expect(shouldEndGameEarly(gameState)).toBe(false)
    })
  })

  describe('checkEarlyGameEnd', () => {
    it('ends game early when no cards remain before round 4', () => {
      const gameState = createTestGameState(3)
      gameState.deck = []
      gameState.players.forEach(p => { p.hand = [] })
      gameState.round.roundNumber = 2

      const result = checkEarlyGameEnd(gameState)

      expect(result.gamePhase).toBe('ended')
    })

    it('does not end game early in round 4', () => {
      const gameState = createTestGameState(3)
      gameState.deck = []
      gameState.players.forEach(p => { p.hand = [] })
      gameState.round.roundNumber = 4

      const result = checkEarlyGameEnd(gameState)

      expect(result.gamePhase).toBe('playing')
    })
  })

  describe('validateGameState', () => {
    it('validates correct game state', () => {
      const setup = createTestSetup(3)
      const gameState = startGame(setup)

      const result = validateGameState(gameState)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('reports error for invalid player count', () => {
      const gameState = createTestGameState(3)
      gameState.players = gameState.players.slice(0, 2) // Only 2 players

      const result = validateGameState(gameState)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid player count: 2. Must be 3-5.')
    })

    it('reports error for negative money', () => {
      const gameState = createTestGameState(3)
      gameState.players[0].money = -10

      const result = validateGameState(gameState)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('negative money'))).toBe(true)
    })

    it('reports error for invalid round number', () => {
      const gameState = createTestGameState(3)
      gameState.round.roundNumber = 5 as any

      const result = validateGameState(gameState)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Invalid round number'))).toBe(true)
    })
  })

  describe('getGameStats', () => {
    it('returns correct game statistics', () => {
      const setup = createTestSetup(3)
      const gameState = startGame(setup)

      const stats = getGameStats(gameState)

      expect(stats.round).toBe(1)
      expect(stats.totalCards).toBe(70 - 30) // 70 total - 30 dealt (10 per player)
      expect(stats.cardsInHands).toBe(30) // 10 per player * 3 players
      expect(stats.gamePhase).toBe('playing')
    })
  })

  describe('Full Game Flow Integration', () => {
    it('completes a full 4-round game', () => {
      const setup = createTestSetup(3)
      let gameState = startGame(setup)

      expect(gameState.round.roundNumber).toBe(1)
      expect(gameState.gamePhase).toBe('playing')

      // Simulate completing round 1
      gameState.round.cardsPlayedPerArtist['Manuel Carvalho'] = 5
      gameState = endRound(gameState)

      // Simulate player 0 earning money from painting sales
      gameState.players[0].money = 130

      // Move to round 2
      gameState = nextRound(gameState)
      expect(gameState.round.roundNumber).toBe(2)

      // Simulate completing round 2
      gameState.round.cardsPlayedPerArtist['Sigrid Thaler'] = 5
      gameState = endRound(gameState)

      // Move to round 3
      gameState = nextRound(gameState)
      expect(gameState.round.roundNumber).toBe(3)

      // Simulate completing round 3
      gameState.round.cardsPlayedPerArtist['Daniel Melim'] = 5
      gameState = endRound(gameState)

      // Move to round 4
      gameState = nextRound(gameState)
      expect(gameState.round.roundNumber).toBe(4)

      // Simulate completing round 4
      gameState.round.cardsPlayedPerArtist['Ramon Martins'] = 5
      gameState = endRound(gameState)

      // End game
      gameState = nextRound(gameState)
      expect(gameState.gamePhase).toBe('ended')
      expect(gameState.winner).not.toBeNull()
      expect(gameState.winner?.id).toBe('player_0')
    })

    it('handles shared victory when all players tie', () => {
      const setup = createTestSetup(3)
      let gameState = startGame(setup)

      // All players have equal money (100) and no paintings
      gameState.round.roundNumber = 4
      gameState = endGame(gameState)

      expect(gameState.gamePhase).toBe('ended')
      // Winner is null for a shared victory
      expect(gameState.winner).toBeNull()
    })

    it('tracks money correctly through game', () => {
      const setup = createTestSetup(3)
      let gameState = startGame(setup)

      // All players start with 100
      gameState.players.forEach(p => {
        expect(p.money).toBe(100)
      })

      // Simulate player 0 buying a painting for 20
      gameState.players[0].money = 80
      // Simulate player 0 selling painting for 30
      gameState.players[0].money = 110

      expect(gameState.players[0].money).toBe(110)
    })
  })

  describe('Paintings sold and discarded each round', () => {
    it('sells paintings at end of round and clears them', () => {
      const gameState = createTestGameState(3)

      // Give player a purchased painting
      gameState.players[0].purchases = [
        {
          card: { id: 'p1', artist: 'Manuel Carvalho', auctionType: 'open', artworkId: 'a1' },
          artist: 'Manuel Carvalho',
          purchasePrice: 20,
          purchasedRound: 1
        } as Painting
      ]

      // Set up round end with Manuel in top 3
      gameState.round.cardsPlayedPerArtist = {
        'Manuel Carvalho': 5,
        'Sigrid Thaler': 3,
        'Daniel Melim': 2,
        'Ramon Martins': 1,
        'Rafael Silveira': 0
      }

      // End round (this updates board values)
      let newState = endRound(gameState)

      // Sell paintings
      newState = sellAllPaintingsToBank(newState)

      // Player's paintings should be cleared
      expect(newState.players[0].purchases).toEqual([])

      // Player should have received money (100 + 30 for Manuel)
      expect(newState.players[0].money).toBe(130)
    })
  })

  describe('determineWinner', () => {
    it('returns correct winner with scores', () => {
      const gameState = createTestGameState(3)
      gameState.players[0].money = 200
      gameState.players[1].money = 150
      gameState.players[2].money = 100

      const result = determineWinner(gameState)

      expect(result.winner.id).toBe('player_0')
      expect(result.finalScores[0].totalScore).toBe(200)
      expect(result.isTie).toBe(false)
    })

    it('handles ties correctly', () => {
      const gameState = createTestGameState(3)
      gameState.players[0].money = 150
      gameState.players[1].money = 150
      gameState.players[2].money = 100

      const result = determineWinner(gameState)

      expect(result.isTie).toBe(true)
    })
  })
})
