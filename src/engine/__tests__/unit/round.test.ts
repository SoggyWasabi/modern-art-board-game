import { describe, it, expect } from 'vitest'
import {
  startRound,
  playCard,
  shouldRoundEnd,
  endRound,
  getCurrentPlayer,
  canPlayerPlayCard,
  getPlayableCards,
  isRoundInAuction,
  getNextAuctioneerIndex,
  getRemainingCards,
  hasPlayerCardsOfArtist
} from '../round'
import { createDeck } from '../deck'
import { createInitialBoard } from '../valuation'
import type { GameState, Player } from '../../types/game'

describe('Round Management', () => {
  // Helper to create test game state
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
        cardsPlayedPerArtist: {
          'Manuel Carvalho': 0,
          'Sigrid Thaler': 0,
          'Daniel Melim': 0,
          'Ramon Martins': 0,
          'Rafael Silveira': 0
        },
        currentAuctioneerIndex: 0,
        phase: { type: 'awaiting_card_play', activePlayerIndex: 0 }
      },
      gamePhase: 'playing',
      winner: null,
      eventLog: []
    }
  }

  describe('startRound', () => {
    it('deals correct number of cards for round 1', () => {
      const gameState = createTestGameState(3)
      const newGameState = startRound(gameState, 1)

      // Each player should get 10 cards in round 1
      newGameState.players.forEach(player => {
        expect(player.hand).toHaveLength(10)
      })

      // Should be in awaiting card play phase
      expect(newGameState.round.phase.type).toBe('awaiting_card_play')
      expect(newGameState.round.roundNumber).toBe(1)
    })

    it('deals correct number of cards for 4 players round 2', () => {
      const gameState = createTestGameState(4)
      gameState.round.roundNumber = 1
      // Give players existing hands
      gameState.players.forEach(player => {
        player.hand = [{ id: 'test', artist: 'Manuel Carvalho' as const, auctionType: 'open', artworkId: 'test' }]
      })

      const newGameState = startRound(gameState, 2)

      // Each player should get 4 additional cards in round 2
      newGameState.players.forEach(player => {
        expect(player.hand).toHaveLength(5) // 1 existing + 4 new
      })
    })

    it('deals no cards for round 4', () => {
      const gameState = createTestGameState(3)
      // Give players existing hands
      gameState.players.forEach(player => {
        player.hand = [{ id: 'test', artist: 'Manuel Carvalho' as const, auctionType: 'open', artworkId: 'test' }]
      })

      const newGameState = startRound(gameState, 4)

      // Players should keep their existing cards
      newGameState.players.forEach(player => {
        expect(player.hand).toHaveLength(1)
      })
    })
  })

  describe('playCard', () => {
    it('removes card from player hand and updates count', () => {
      const gameState = createTestGameState()
      const card = {
        id: 'test_card',
        artist: 'Manuel Carvalho' as const as const,
        auctionType: 'open' as const,
        artworkId: 'test_artwork'
      }

      // Give player a hand with the test card
      gameState.players[0].hand = [card]

      const newGameState = playCard(gameState, 0, 0)

      // Card should be removed from hand
      expect(newGameState.players[0].hand).toHaveLength(0)

      // Artist count should be updated
      expect(newGameState.round.cardsPlayedPerArtist['Manuel Carvalho' as const]).toBe(1)
    })

    it('handles 5th card rule - ends round immediately', () => {
      const gameState = createTestGameState()
      const card = {
        id: 'test_card',
        artist: 'Manuel Carvalho' as const as const,
        auctionType: 'open' as const,
        artworkId: 'test_artwork'
      }

      // Set up 4 cards already played for this artist
      gameState.round.cardsPlayedPerArtist['Manuel Carvalho' as const] = 4
      gameState.players[0].hand = [card]

      const newGameState = playCard(gameState, 0, 0)

      // Should move to round ending phase
      expect(newGameState.round.phase.type).toBe('round_ending')
      expect(newGameState.round.cardsPlayedPerArtist['Manuel Carvalho' as const]).toBe(5)
    })

    it('throws error for invalid card index', () => {
      const gameState = createTestGameState()

      expect(() => playCard(gameState, 0, 0)).toThrow('No card at specified index')
    })
  })

  describe('shouldRoundEnd', () => {
    it('returns true when an artist has 5 cards', () => {
      const gameState = createTestGameState()
      gameState.round.cardsPlayedPerArtist['Manuel Carvalho' as const] = 5

      expect(shouldRoundEnd(gameState)).toBe(true)
    })

    it('returns true when all players are out of cards', () => {
      const gameState = createTestGameState()
      gameState.players.forEach(player => {
        player.hand = []
      })

      expect(shouldRoundEnd(gameState)).toBe(true)
    })

    it('returns false when game can continue', () => {
      const gameState = createTestGameState()
      // Give players cards
      gameState.players.forEach(player => {
        player.hand = [{ id: 'test', artist: 'Manuel Carvalho' as const, auctionType: 'open', artworkId: 'test' }]
      })

      expect(shouldRoundEnd(gameState)).toBe(false)
    })
  })

  describe('endRound', () => {
    it('updates board with correct artist values', () => {
      const gameState = createTestGameState()

      // Set up cards played: Manuel(5), Sigrid(3), Daniel(2), others(1)
      gameState.round.cardsPlayedPerArtist = {
        'Manuel Carvalho': 5,
        'Sigrid Thaler': 3,
        'Daniel Melim': 2,
        'Ramon Martins': 1,
        'Rafael Silveira': 1
      }

      const newGameState = endRound(gameState)

      // Check board values for round 1 (index 0)
      expect(newGameState.board.artistValues['Manuel Carvalho' as const][0]).toBe(30)
      expect(newGameState.board.artistValues['Sigrid Thaler' as const][0]).toBe(20)
      expect(newGameState.board.artistValues['Daniel Melim' as const][0]).toBe(10)
      expect(newGameState.board.artistValues['Ramon Martins' as const][0]).toBe(0)
      expect(newGameState.board.artistValues['Rafael Silveira' as const][0]).toBe(0)

      // Should be in selling phase
      expect(newGameState.round.phase.type).toBe('selling_to_bank')
    })
  })

  describe('getCurrentPlayer', () => {
    it('returns active player during awaiting phase', () => {
      const gameState = createTestGameState()
      gameState.round.phase = { type: 'awaiting_card_play', activePlayerIndex: 2 }

      expect(getCurrentPlayer(gameState)).toBe(2)
    })

    it('returns null during auction phase', () => {
      const gameState = createTestGameState()
      gameState.round.phase = {
        type: 'auction',
        auction: {
          type: 'open' as const,
          auctioneerId: 'player_0',
          currentBid: 10,
          currentBidderId: 'player_1',
          isActive: true,
          playerOrder: ['player_0', 'player_1', 'player_2'],
          currentPlayerIndex: 0,
          passCount: 0
        }
      }

      expect(getCurrentPlayer(gameState)).toBe(null)
    })
  })

  describe('canPlayerPlayCard', () => {
    it('returns true for active player with cards', () => {
      const gameState = createTestGameState()
      gameState.players[0].hand = [{ id: 'test', artist: 'Manuel Carvalho' as const, auctionType: 'open', artworkId: 'test' }]

      expect(canPlayerPlayCard(gameState, 0)).toBe(true)
    })

    it('returns false for inactive player', () => {
      const gameState = createTestGameState()
      gameState.players[1].hand = [{ id: 'test', artist: 'Manuel Carvalho' as const, auctionType: 'open', artworkId: 'test' }]

      expect(canPlayerPlayCard(gameState, 1)).toBe(false)
    })

    it('returns false for player with no cards', () => {
      const gameState = createTestGameState()

      expect(canPlayerPlayCard(gameState, 0)).toBe(false)
    })

    it('returns false during auction phase', () => {
      const gameState = createTestGameState()
      gameState.round.phase = {
        type: 'auction',
        auction: {
          type: 'open' as const,
          auctioneerId: 'player_0',
          currentBid: 0,
          currentBidderId: null,
          isActive: true,
          playerOrder: ['player_0', 'player_1', 'player_2'],
          currentPlayerIndex: 0,
          passCount: 0
        }
      }

      expect(canPlayerPlayCard(gameState, 0)).toBe(false)
    })
  })

  describe('getPlayableCards', () => {
    it('returns cards for active player', () => {
      const gameState = createTestGameState()
      const cards = [
        { id: 'card1', artist: 'Manuel Carvalho' as const as const, auctionType: 'open' as const, artworkId: 'art1' },
        { id: 'card2', artist: 'Sigrid Thaler' as const as const, auctionType: 'hidden' as const, artworkId: 'art2' }
      ]
      gameState.players[0].hand = cards

      const playable = getPlayableCards(gameState, 0)
      expect(playable).toEqual(cards)
    })

    it('returns empty array for inactive player', () => {
      const gameState = createTestGameState()
      gameState.players[1].hand = [{ id: 'test', artist: 'Manuel Carvalho' as const, auctionType: 'open', artworkId: 'test' }]

      expect(getPlayableCards(gameState, 1)).toEqual([])
    })
  })

  describe('isRoundInAuction', () => {
    it('returns true during auction phase', () => {
      const gameState = createTestGameState()
      gameState.round.phase = {
        type: 'auction',
        auction: {
          type: 'open' as const,
          auctioneerId: 'player_0',
          currentBid: 0,
          currentBidderId: null,
          isActive: true,
          playerOrder: ['player_0', 'player_1', 'player_2'],
          currentPlayerIndex: 0,
          passCount: 0
        }
      }

      expect(isRoundInAuction(gameState)).toBe(true)
    })

    it('returns false during other phases', () => {
      const gameState = createTestGameState()

      expect(isRoundInAuction(gameState)).toBe(false)
    })
  })

  describe('getNextAuctioneerIndex', () => {
    it('cycles through players correctly', () => {
      const gameState = createTestGameState(3)
      gameState.round.currentAuctioneerIndex = 1

      expect(getNextAuctioneerIndex(gameState)).toBe(2)

      gameState.round.currentAuctioneerIndex = 2
      expect(getNextAuctioneerIndex(gameState)).toBe(0)
    })
  })

  describe('getRemainingCards', () => {
    it('counts cards across all players', () => {
      const gameState = createTestGameState(3)
      gameState.players[0].hand = [{ id: '1', artist: 'Manuel Carvalho' as const, auctionType: 'open', artworkId: 'a' }]
      gameState.players[1].hand = [
        { id: '2', artist: 'Sigrid Thaler' as const, auctionType: 'hidden', artworkId: 'b' },
        { id: '3', artist: 'Daniel Melim' as const, auctionType: 'fixed_price', artworkId: 'c' }
      ]
      gameState.players[2].hand = []

      expect(getRemainingCards(gameState)).toBe(3)
    })
  })

  describe('hasPlayerCardsOfArtist', () => {
    it('returns true when player has cards of artist', () => {
      const gameState = createTestGameState()
      gameState.players[1].hand = [
        { id: 'test', artist: 'Manuel Carvalho' as const, auctionType: 'open', artworkId: 'test' }
      ]

      expect(hasPlayerCardsOfArtist(gameState, 'Manuel Carvalho' as const)).toBe(true)
    })

    it('returns false when no player has cards of artist', () => {
      const gameState = createTestGameState()
      gameState.players.forEach(player => {
        player.hand = [{ id: 'test', artist: 'Sigrid Thaler' as const, auctionType: 'open', artworkId: 'test' }]
      })

      expect(hasPlayerCardsOfArtist(gameState, 'Manuel Carvalho' as const)).toBe(false)
    })
  })
})