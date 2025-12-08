import { describe, it, expect } from 'vitest'
import {
  rankArtists,
  getArtistValue,
  calculatePaintingValue,
  updateBoardWithRoundResults,
  createInitialBoard,
} from '../valuation'
import type { GameBoard, ArtistRoundResult } from '../../types/game'
import type { Artist } from '../../types/game'

describe('Artist Valuation', () => {
  describe('rankArtists', () => {
    it('rings clear winner correctly', () => {
      const cardsPlayed = {
        'Manuel Carvalho': 5,
        'Sigrid Thaler': 3,
        'Daniel Melim': 2,
        'Ramon Martins': 1,
        'Rafael Silveira': 0,
      }

      const results = rankArtists(cardsPlayed)

      expect(results).toHaveLength(5)
      expect(results[0]).toEqual({
        artist: 'Manuel Carvalho',
        cardCount: 5,
        rank: 1,
        value: 30,
      })
      expect(results[1]).toEqual({
        artist: 'Sigrid Thaler',
        cardCount: 3,
        rank: 2,
        value: 20,
      })
      expect(results[2]).toEqual({
        artist: 'Daniel Melim',
        cardCount: 2,
        rank: 3,
        value: 10,
      })
    })

    it('breaks ties by board position (Manuel > Rafael)', () => {
      const cardsPlayed = {
        'Manuel Carvalho': 4,
        'Sigrid Thaler': 2,
        'Daniel Melim': 4, // Tie with Manuel
        'Ramon Martins': 1,
        'Rafael Silveira': 3,
      }

      const results = rankArtists(cardsPlayed)

      // Manuel should win due to board position
      expect(results[0]).toEqual({
        artist: 'Manuel Carvalho',
        cardCount: 4,
        rank: 1,
        value: 30,
      })

      // Daniel should be second despite same count
      expect(results[1]).toEqual({
        artist: 'Daniel Melim',
        cardCount: 4,
        rank: 2,
        value: 20,
      })
    })

    it('handles multiple-way tie correctly', () => {
      const cardsPlayed = {
        'Manuel Carvalho': 3,
        'Sigrid Thaler': 3, // Tie with Manuel
        'Daniel Melim': 3, // Tie with Manuel and Sigrid
        'Ramon Martins': 1,
        'Rafael Silveira': 0,
      }

      const results = rankArtists(cardsPlayed)

      // Order should be Manuel, Sigrid, Daniel (by board position)
      expect(results[0].artist).toBe('Manuel Carvalho')
      expect(results[1].artist).toBe('Sigrid Thaler')
      expect(results[2].artist).toBe('Daniel Melim')

      expect(results[0].rank).toBe(1)
      expect(results[1].rank).toBe(2)
      expect(results[2].rank).toBe(3)
    })

    it('assigns 0 value to artists not in top 3', () => {
      const cardsPlayed = {
        'Manuel Carvalho': 5,
        'Sigrid Thaler': 4,
        'Daniel Melim': 3,
        'Ramon Martins': 2,
        'Rafael Silveira': 1,
      }

      const results = rankArtists(cardsPlayed)

      // First three get values
      expect(results.slice(0, 3).every(r => r.value > 0)).toBe(true)

      // Last two get 0
      expect(results[3].value).toBe(0)
      expect(results[4].value).toBe(0)
    })

    it('handles empty counts', () => {
      const cardsPlayed = {
        'Manuel Carvalho': 0,
        'Sigrid Thaler': 0,
        'Daniel Melim': 0,
        'Ramon Martins': 0,
        'Rafael Silveira': 0,
      }

      const results = rankArtists(cardsPlayed)

      // All should have rank null and value 0
      expect(results.every(r => r.rank === null && r.value === 0)).toBe(true)
    })
  })

  describe('getArtistValue', () => {
    it('returns 0 if artist not in top 3 this round', () => {
      const board: GameBoard = {
        artistValues: {
          'Manuel Carvalho': [30, 0, 0, 0], // Was 1st in round 0, not in top 3 in round 1
          'Sigrid Thaler': [20, 10, 0, 0],
          'Daniel Melim': [10, 20, 0, 0],
          'Ramon Martins': [0, 30, 0, 0],
          'Rafael Silveira': [0, 0, 0, 0],
        },
      }

      // Manuel was not in top 3 in round 1
      expect(getArtistValue(board, 'Manuel Carvalho', 1)).toBe(0)

      // Rafael was never in top 3
      expect(getArtistValue(board, 'Rafael Silveira', 2)).toBe(0)
    })

    it('sums cumulative values when artist is consistently in top 3', () => {
      const board: GameBoard = {
        artistValues: {
          'Manuel Carvalho': [30, 30, 20, 30], // 1st, 1st, 2nd, 1st
          'Sigrid Thaler': [20, 0, 10, 0],
          'Daniel Melim': [10, 20, 30, 10],
          'Ramon Martins': [0, 10, 0, 20],
          'Rafael Silveira': [0, 0, 0, 0],
        },
      }

      // Cumulative values for Manuel
      expect(getArtistValue(board, 'Manuel Carvalho', 0)).toBe(30) // Round 0: 30
      expect(getArtistValue(board, 'Manuel Carvalho', 1)).toBe(60) // Round 1: 30 + 30
      expect(getArtistValue(board, 'Manuel Carvalho', 2)).toBe(80) // Round 2: 30 + 30 + 20
      expect(getArtistValue(board, 'Manuel Carvalho', 3)).toBe(110) // Round 3: 30 + 30 + 20 + 30
    })

    it('handles artist dropping out of top 3 after being in it', () => {
      const board: GameBoard = {
        artistValues: {
          'Manuel Carvalho': [30, 30, 0, 0], // 1st, 1st, then out
          'Sigrid Thaler': [20, 20, 30, 30],
          'Daniel Melim': [10, 10, 20, 20],
          'Ramon Martins': [0, 0, 10, 10],
          'Rafael Silveira': [0, 0, 0, 0],
        },
      }

      // Manuel drops out after round 1
      expect(getArtistValue(board, 'Manuel Carvalho', 0)).toBe(30)
      expect(getArtistValue(board, 'Manuel Carvalho', 1)).toBe(60)
      expect(getArtistValue(board, 'Manuel Carvalho', 2)).toBe(0) // Out of top 3
      expect(getArtistValue(board, 'Manuel Carvalho', 3)).toBe(0) // Still out
    })
  })

  describe('calculatePaintingValue', () => {
    it('returns cumulative value for paintings sold when artist is in top 3', () => {
      const board: GameBoard = {
        artistValues: {
          'Manuel Carvalho': [30, 20, 0, 0],
          'Sigrid Thaler': [20, 30, 10, 0],
          'Daniel Melim': [10, 0, 30, 0],
          'Ramon Martins': [0, 10, 0, 30],
          'Rafael Silveira': [0, 0, 0, 0],
        },
      }

      const roundResults: ArtistRoundResult[] = [
        { artist: 'Manuel Carvalho', cardCount: 3, rank: 2, value: 20 },
        { artist: 'Sigrid Thaler', cardCount: 4, rank: 1, value: 30 },
        { artist: 'Daniel Melim', cardCount: 2, rank: 3, value: 10 },
        { artist: 'Ramon Martins', cardCount: 1, rank: null, value: 0 },
        { artist: 'Rafael Silveira', cardCount: 0, rank: null, value: 0 },
      ]

      // Selling Manuel paintings in round 1
      expect(calculatePaintingValue(board, 'Manuel Carvalho', 1, roundResults)).toBe(50) // 30 + 20

      // Selling Sigrid paintings in round 1
      expect(calculatePaintingValue(board, 'Sigrid Thaler', 1, roundResults)).toBe(50) // 20 + 30
    })

    it('returns 0 when artist is not in top 3 this round', () => {
      const board: GameBoard = {
        artistValues: {
          'Manuel Carvalho': [30, 20, 0, 0],
          'Sigrid Thaler': [20, 30, 10, 0],
          'Daniel Melim': [10, 0, 30, 0],
          'Ramon Martins': [0, 10, 0, 30],
          'Rafael Silveira': [0, 0, 0, 0],
        },
      }

      const roundResults: ArtistRoundResult[] = [
        { artist: 'Manuel Carvalho', cardCount: 3, rank: 2, value: 20 },
        { artist: 'Sigrid Thaler', cardCount: 4, rank: 1, value: 30 },
        { artist: 'Daniel Melim', cardCount: 2, rank: 3, value: 10 },
        { artist: 'Ramon Martins', cardCount: 1, rank: null, value: 0 },
        { artist: 'Rafael Silveira', cardCount: 0, rank: null, value: 0 },
      ]

      // Ramon and Rafael not in top 3 this round
      expect(calculatePaintingValue(board, 'Ramon Martins', 1, roundResults)).toBe(0)
      expect(calculatePaintingValue(board, 'Rafael Silveira', 1, roundResults)).toBe(0)
    })
  })

  describe('updateBoardWithRoundResults', () => {
    it('updates board with round results correctly', () => {
      const board: GameBoard = {
        artistValues: {
          'Manuel Carvalho': [30, 0, 0, 0],
          'Sigrid Thaler': [20, 0, 0, 0],
          'Daniel Melim': [10, 0, 0, 0],
          'Ramon Martins': [0, 0, 0, 0],
          'Rafael Silveira': [0, 0, 0, 0],
        },
      }

      const roundResults: ArtistRoundResult[] = [
        { artist: 'Manuel Carvalho', cardCount: 3, rank: 2, value: 20 },
        { artist: 'Sigrid Thaler', cardCount: 4, rank: 1, value: 30 },
        { artist: 'Daniel Melim', cardCount: 2, rank: 3, value: 10 },
        { artist: 'Ramon Martins', cardCount: 1, rank: null, value: 0 },
        { artist: 'Rafael Silveira', cardCount: 0, rank: null, value: 0 },
      ]

      const updatedBoard = updateBoardWithRoundResults(board, 1, roundResults)

      // Check round 1 values
      expect(updatedBoard.artistValues['Manuel Carvalho'][1]).toBe(20)
      expect(updatedBoard.artistValues['Sigrid Thaler'][1]).toBe(30)
      expect(updatedBoard.artistValues['Daniel Melim'][1]).toBe(10)
      expect(updatedBoard.artistValues['Ramon Martins'][1]).toBe(0)
      expect(updatedBoard.artistValues['Rafael Silveira'][1]).toBe(0)

      // Round 0 values should be unchanged
      expect(updatedBoard.artistValues['Manuel Carvalho'][0]).toBe(30)
      expect(updatedBoard.artistValues['Sigrid Thaler'][0]).toBe(20)
    })
  })

  describe('createInitialBoard', () => {
    it('creates board with all zeros', () => {
      const board = createInitialBoard()

      const artists: Artist[] = [
        'Manuel Carvalho',
        'Sigrid Thaler',
        'Daniel Melim',
        'Ramon Martins',
        'Rafael Silveira',
      ]

      for (const artist of artists) {
        expect(board.artistValues[artist]).toEqual([0, 0, 0, 0])
      }
    })
  })

  // Test rulebook examples
  describe('Rulebook Examples', () => {
    it('matches cumulative value example', () => {
      // Example: Rafael's cumulative values across rounds
      const board: GameBoard = {
        artistValues: {
          'Manuel Carvalho': [30, 20, 0, 30],
          'Sigrid Thaler': [10, 0, 20, 0],
          'Daniel Melim': [0, 30, 10, 20],
          'Ramon Martins': [20, 10, 30, 10],
          'Rafael Silveira': [0, 0, 0, 0],
        },
      }

      // After each round, Rafael's paintings would be worth:
      // Round 0: 0k (not in top 3)
      // Round 1: 0k (not in top 3)
      // Round 2: 0k (not in top 3)
      // Round 3: 0k (not in top 3)

      expect(getArtistValue(board, 'Rafael Silveira', 0)).toBe(0)
      expect(getArtistValue(board, 'Rafael Silveira', 1)).toBe(0)
      expect(getArtistValue(board, 'Rafael Silveira', 2)).toBe(0)
      expect(getArtistValue(board, 'Rafael Silveira', 3)).toBe(0)
    })
  })
})