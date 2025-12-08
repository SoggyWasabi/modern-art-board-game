import { describe, it, expect } from 'vitest'
import {
  rankArtists,
  getArtistValue,
  calculatePaintingValue,
  updateBoardWithRoundResults,
  createInitialBoard,
} from '../../valuation'
import { getAllPlayersSaleEarnings } from '../../selling'
import type { GameBoard, ArtistRoundResult, GameState, Player } from '../../types/game'
import { ARTISTS } from '../../constants'

describe('Valuation Edge Cases', () => {
  describe('Artist Re-entry into Top 3', () => {
    it('allows artist to regain value after re-entering top 3', () => {
      const board = createInitialBoard()

      // Round 0: Manuel is 1st
      board.artistValues[ARTISTS[0]] = [30, 0, 0, 0]
      expect(getArtistValue(board, ARTISTS[0], 0)).toBe(30)

      // Round 1: Manuel drops to 4th (value 0)
      board.artistValues[ARTISTS[0]] = [30, 0, 0, 0]
      expect(getArtistValue(board, ARTISTS[0], 1)).toBe(0)

      // Round 2: Manuel re-enters as 2nd (value 20)
      board.artistValues[ARTISTS[0]] = [30, 0, 20, 0]
      expect(getArtistValue(board, ARTISTS[0], 2)).toBe(50) // 30 (round 0) + 20 (round 2)

      // Round 3: Manuel is 1st again (value 30)
      board.artistValues[ARTISTS[0]] = [30, 0, 20, 30]
      expect(getArtistValue(board, ARTISTS[0], 3)).toBe(80) // 30 + 0 + 20 + 30
    })
  })

  describe('All Artists Tie', () => {
    it('breaks 5-way tie correctly by board position', () => {
      const cardsPlayed = {
        [ARTISTS[0]]: 3, // Manuel
        [ARTISTS[1]]: 3, // Sigrid
        [ARTISTS[2]]: 3, // Daniel
        [ARTISTS[3]]: 3, // Ramon
        [ARTISTS[4]]: 3, // Rafael
      }

      const results = rankArtists(cardsPlayed)

      expect(results).toHaveLength(5)
      // Order should be: Manuel, Sigrid, Daniel, Ramon, Rafael (board position)
      expect(results[0].artist).toBe(ARTISTS[0])
      expect(results[0].rank).toBe(1)
      expect(results[0].value).toBe(30)

      expect(results[1].artist).toBe(ARTISTS[1])
      expect(results[1].rank).toBe(2)
      expect(results[1].value).toBe(20)

      expect(results[2].artist).toBe(ARTISTS[2])
      expect(results[2].rank).toBe(3)
      expect(results[2].value).toBe(10)

      // Last two get 0
      expect(results[3].value).toBe(0)
      expect(results[4].value).toBe(0)
    })
  })

  describe('No Cards Played', () => {
    it('handles round where no cards played for some artists', () => {
      const cardsPlayed = {
        [ARTISTS[0]]: 5,  // Manuel - many cards
        [ARTISTS[1]]: 2,  // Sigrid - some cards
        [ARTISTS[2]]: 1,  // Daniel - one card
        [ARTISTS[3]]: 0,  // Ramon - no cards
        [ARTISTS[4]]: 0,  // Rafael - no cards
      }

      const results = rankArtists(cardsPlayed)

      // Top 3 should get values, even if some have 0 cards
      expect(results[0].value).toBe(30)
      expect(results[1].value).toBe(20)
      expect(results[2].value).toBe(10)
      expect(results[3].value).toBe(0)
      expect(results[4].value).toBe(0)
    })
  })

  describe('Painting Value with Artist Dropout', () => {
    it('calculates zero value when artist drops out in selling round', () => {
      const board: GameBoard = {
        artistValues: {
          [ARTISTS[0]]: [30, 20, 0, 0], // Manuel was top 3, now out
          [ARTISTS[1]]: [20, 30, 10, 20],
          [ARTISTS[2]]: [10, 0, 30, 10],
          [ARTISTS[3]]: [0, 10, 0, 30],
          [ARTISTS[4]]: [0, 0, 0, 0],
        }
      }

      // Round 2 results - Manuel is not in top 3
      const roundResults: ArtistRoundResult[] = [
        { artist: ARTISTS[1], cardCount: 4, rank: 1, value: 10 },
        { artist: ARTISTS[2], cardCount: 3, rank: 2, value: 30 },
        { artist: ARTISTS[3], cardCount: 2, rank: 3, value: 0 },
        { artist: ARTISTS[0], cardCount: 1, rank: 4, value: 0 }, // Out of top 3
        { artist: ARTISTS[4], cardCount: 0, rank: 5, value: 0 },
      ]

      // Despite historical value, Manuel's paintings are worth 0 this round
      expect(calculatePaintingValue(board, ARTISTS[0], 2, roundResults)).toBe(0)
    })
  })

  describe('Selling Integration with Artist Dropout', () => {
    it('player retains unsold paintings when artist drops out', () => {
      const players: Player[] = [
        {
          id: 'p1',
          name: 'Alice',
          money: 100,
          color: '#ff0000',
          purchases: [
            {
              card: { id: 'card1', artist: ARTISTS[0], auctionType: 'open', artworkId: 'art1' },
              artist: ARTISTS[0],
              purchasePrice: 30,
              purchasedRound: 0
            }
          ]
        }
      ]

      // Round 0: Manuel is top 3
      const round0Results: ArtistRoundResult[] = [
        { artist: ARTISTS[0], cardCount: 3, rank: 1, value: 30 },
        { artist: ARTISTS[1], cardCount: 2, rank: 2, value: 20 },
        { artist: ARTISTS[2], cardCount: 1, rank: 3, value: 10 },
        { artist: ARTISTS[3], cardCount: 0, rank: null, value: 0 },
        { artist: ARTISTS[4], cardCount: 0, rank: null, value: 0 }
      ]

      // Round 1: Manuel drops out
      const round1Results: ArtistRoundResult[] = [
        { artist: ARTISTS[1], cardCount: 4, rank: 1, value: 30 },
        { artist: ARTISTS[2], cardCount: 3, rank: 2, value: 20 },
        { artist: ARTISTS[3], cardCount: 2, rank: 3, value: 10 },
        { artist: ARTISTS[0], cardCount: 0, rank: 4, value: 0 },
        { artist: ARTISTS[4], cardCount: 0, rank: 5, value: 0 }
      ]

      const gameState1: GameState = {
        players,
        round: {
          roundNumber: 1,
          phase: { type: 'selling_to_bank', results: round0Results },
          auctioneerIndex: 0,
          cardsPlayedPerArtist: { [ARTISTS[0]]: 3 }
        },
        board: {
          artistValues: {
            [ARTISTS[0]]: [30, 0, 0, 0],
            [ARTISTS[1]]: [0, 30, 0, 0],
            [ARTISTS[2]]: [0, 20, 0, 0],
            [ARTISTS[3]]: [0, 10, 0, 0],
            [ARTISTS[4]]: [0, 0, 0, 0]
          }
        },
        deck: [],
        discardPile: [],
        eventLog: []
      }

      // Round 1 selling - Alice's Manuel painting has value
      const earnings1 = getAllPlayersSaleEarnings(gameState1)
      expect(earnings1[0].earnings).toBe(30)

      // Round 2 selling - Manuel still out, no earnings
      const gameState2: GameState = {
        ...gameState1,
        round: {
          roundNumber: 2,
          phase: { type: 'selling_to_bank', results: round1Results },
          auctioneerIndex: 1,
          cardsPlayedPerArtist: { [ARTISTS[0]]: 3, [ARTISTS[1]]: 4 }
        },
        board: {
          artistValues: {
            [ARTISTS[0]]: [30, 0, 0, 0],
            [ARTISTS[1]]: [0, 30, 30, 0],
            [ARTISTS[2]]: [0, 20, 20, 0],
            [ARTISTS[3]]: [0, 10, 10, 0],
            [ARTISTS[4]]: [0, 0, 0, 0]
          }
        }
      }

      const earnings2 = getAllPlayersSaleEarnings(gameState2)
      expect(earnings2[0].earnings).toBe(0) // No value as Manuel is out of top 3
    })
  })

  describe('Maximum Edge Cases', () => {
    it('handles maximum cards for single artist', () => {
      // In a 5-player game, max cards could be very high for one artist
      const cardsPlayed = {
        [ARTISTS[0]]: 30,  // Very high count
        [ARTISTS[1]]: 0,
        [ARTISTS[2]]: 0,
        [ARTISTS[3]]: 0,
        [ARTISTS[4]]: 0,
      }

      const results = rankArtists(cardsPlayed)

      expect(results[0]).toEqual({
        artist: ARTISTS[0],
        cardCount: 30,
        rank: 1,
        value: 30
      })
      // All others should have value 0
      expect(results.slice(1).every(r => r.value === 0)).toBe(true)
    })
  })
})