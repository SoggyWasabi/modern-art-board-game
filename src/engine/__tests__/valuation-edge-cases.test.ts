import { describe, it, expect } from 'vitest'
import { rankArtists, getArtistValue, createInitialBoard } from '../valuation'
import type { GameBoard } from '../../types/game'

describe('Artist Valuation - Additional Edge Cases', () => {
  describe('Critical Edge Cases', () => {
    it('handles complete tie (all artists same count)', () => {
      const cardsPlayed = {
        'Manuel Carvalho': 3,
        'Sigrid Thaler': 3,
        'Daniel Melim': 3,
        'Ramon Martins': 3,
        'Rafael Silveira': 3,
      }

      const results = rankArtists(cardsPlayed)

      // Order should follow board position exactly
      expect(results[0]).toEqual({
        artist: 'Manuel Carvalho',
        cardCount: 3,
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
        cardCount: 3,
        rank: 3,
        value: 10,
      })
      expect(results[3]).toEqual({
        artist: 'Ramon Martins',
        cardCount: 3,
        rank: null,
        value: 0,
      })
      expect(results[4]).toEqual({
        artist: 'Rafael Silveira',
        cardCount: 3,
        rank: null,
        value: 0,
      })
    })

    it('handles zero cards played by all artists', () => {
      const cardsPlayed = {
        'Manuel Carvalho': 0,
        'Sigrid Thaler': 0,
        'Daniel Melim': 0,
        'Ramon Martins': 0,
        'Rafael Silveira': 0,
      }

      const results = rankArtists(cardsPlayed)

      // All should have rank null and value 0
      results.forEach(result => {
        expect(result.rank).toBeNull()
        expect(result.value).toBe(0)
        expect(result.cardCount).toBe(0)
      })
    })

    it('handles only one artist with cards', () => {
      const cardsPlayed = {
        'Manuel Carvalho': 5,
        'Sigrid Thaler': 0,
        'Daniel Melim': 0,
        'Ramon Martins': 0,
        'Rafael Silveira': 0,
      }

      const results = rankArtists(cardsPlayed)

      expect(results[0]).toEqual({
        artist: 'Manuel Carvalho',
        cardCount: 5,
        rank: 1,
        value: 30,
      })

      // All others should have rank null
      results.slice(1).forEach(result => {
        expect(result.rank).toBeNull()
        expect(result.value).toBe(0)
      })
    })

    it('handles three-way tie for second place', () => {
      const cardsPlayed = {
        'Manuel Carvalho': 5, // Winner
        'Sigrid Thaler': 2, // Tied for 2nd
        'Daniel Melim': 2, // Tied for 2nd
        'Ramon Martins': 2, // Tied for 2nd
        'Rafael Silveira': 1,
      }

      const results = rankArtists(cardsPlayed)

      expect(results[0].artist).toBe('Manuel Carvalho')
      expect(results[0].rank).toBe(1)

      // 2nd place tie broken by board position
      expect(results[1].artist).toBe('Sigrid Thaler')
      expect(results[2].artist).toBe('Daniel Melim')
      expect(results[3].artist).toBe('Ramon Martins')

      expect(results[1].rank).toBe(2)
      expect(results[2].rank).toBe(3)
      expect(results[3].rank).toBeNull()
    })
  })

  describe('Cumulative Value Edge Cases', () => {
    it('artist value resets to 0 when dropping out of top 3', () => {
      const board: GameBoard = createInitialBoard()

      // Round 0: Artist is 1st (30k)
      board.artistValues['Manuel Carvalho'][0] = 30
      board.artistValues['Sigrid Thaler'][0] = 20
      board.artistValues['Daniel Melim'][0] = 10

      // Round 1: Artist drops to 4th (0k)
      // Round 2: Artist remains 4th (0k)

      expect(getArtistValue(board, 'Manuel Carvalho', 0)).toBe(30) // After round 0
      expect(getArtistValue(board, 'Manuel Carvalho', 1)).toBe(0) // After round 1 - dropped out!
      expect(getArtistValue(board, 'Manuel Carvalho', 2)).toBe(0) // Still out
    })

    it('cumulative value accumulates correctly across consistent performance', () => {
      const board: GameBoard = createInitialBoard()

      // Artist consistently gets 20k each round (always 2nd place)
      board.artistValues['Sigrid Thaler'] = [20, 20, 20, 20]

      expect(getArtistValue(board, 'Sigrid Thaler', 0)).toBe(20) // After round 0
      expect(getArtistValue(board, 'Sigrid Thaler', 1)).toBe(40) // After round 1
      expect(getArtistValue(board, 'Sigrid Thaler', 2)).toBe(60) // After round 2
      expect(getArtistValue(board, 'Sigrid Thaler', 3)).toBe(80) // After round 3
    })

    it('handles artist returning to top 3 after being out', () => {
      const board: GameBoard = createInitialBoard()

      // Round 0: Out of top 3
      board.artistValues['Ramon Martins'] = [0, 0, 0, 0]

      // Round 1: 3rd place (10k)
      board.artistValues['Ramon Martins'][1] = 10

      // Round 2: 1st place (30k) - cumulative should be 40k
      board.artistValues['Ramon Martins'][2] = 30

      expect(getArtistValue(board, 'Ramon Martins', 0)).toBe(0) // Out
      expect(getArtistValue(board, 'Ramon Martins', 1)).toBe(10) // 3rd
      expect(getArtistValue(board, 'Ramon Martins', 2)).toBe(40) // 1st + 3rd
    })

    it('handles artist with perfect game (always 1st)', () => {
      const board: GameBoard = createInitialBoard()

      // Perfect game: 1st place every round
      board.artistValues['Daniel Melim'] = [30, 30, 30, 30]

      expect(getArtistValue(board, 'Daniel Melim', 0)).toBe(30)
      expect(getArtistValue(board, 'Daniel Melim', 1)).toBe(60)
      expect(getArtistValue(board, 'Daniel Melim', 2)).toBe(90)
      expect(getArtistValue(board, 'Daniel Melim', 3)).toBe(120)
    })
  })

  describe('Board Position Tie-Breaking Verification', () => {
    it('verifies complete board order priority', () => {
      // Create a scenario where each position matters
      const testCases = [
        {
          name: 'Manuel vs Rafael tie',
          cards: {
            'Manuel Carvalho': 2,
            'Rafael Silveira': 2,
            'Sigrid Thaler': 1,
            'Daniel Melim': 1,
            'Ramon Martins': 0,
          },
          winner: 'Manuel Carvalho', // Board position 1 beats position 5
        },
        {
          name: 'Sigrid vs Ramon tie',
          cards: {
            'Manuel Carvalho': 3,
            'Sigrid Thaler': 2,
            'Daniel Melim': 1,
            'Ramon Martins': 2,
            'Rafael Silveira': 0,
          },
          winner: 'Sigrid Thaler', // Board position 2 beats position 4
        },
        {
          name: 'Ramon vs Rafael tie',
          cards: {
            'Manuel Carvalho': 3,
            'Sigrid Thaler': 1,
            'Daniel Melim': 1,
            'Ramon Martins': 2,
            'Rafael Silveira': 2,
          },
          winner: 'Ramon Martins', // Board position 4 beats position 5
        },
      ]

      testCases.forEach(testCase => {
        const results = rankArtists(testCase.cards)
        const tiedResults = results.filter(r => r.cardCount === 2)
        expect(tiedResults[0].artist).toBe(testCase.winner)
      })
    })
  })

  describe('Rank Validation', () => {
    it('never assigns rank 4 or 5 to any artist', () => {
      // Test various card distributions
      const testDistributions = [
        [5, 4, 3, 2, 1],
        [1, 1, 1, 1, 1],
        [10, 0, 0, 0, 0],
        [0, 0, 5, 5, 5],
      ]

      testDistributions.forEach(dist => {
        const cardsPlayed = {
          'Manuel Carvalho': dist[0],
          'Sigrid Thaler': dist[1],
          'Daniel Melim': dist[2],
          'Ramon Martins': dist[3],
          'Rafael Silveira': dist[4],
        }

        const results = rankArtists(cardsPlayed)
        results.forEach((result, index) => {
          if (index < 3 && result.cardCount > 0) {
            expect(result.rank).toBeLessThanOrEqual(3)
            expect(result.rank).toBeGreaterThanOrEqual(1)
          } else {
            expect(result.rank).toBeNull()
          }
        })
      })
    })

    it('never assigns value to artists with zero cards', () => {
      const cardsPlayed = {
        'Manuel Carvalho': 5,
        'Sigrid Thaler': 3,
        'Daniel Melim': 0,
        'Ramon Martins': 2,
        'Rafael Silveira': 0,
      }

      const results = rankArtists(cardsPlayed)
      const zeroCardArtists = results.filter(r => r.cardCount === 0)

      zeroCardArtists.forEach(artist => {
        expect(artist.value).toBe(0)
        expect(artist.rank).toBeNull()
      })
    })
  })
})