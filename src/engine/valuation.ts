import type { Artist, GameBoard, ArtistRoundResult } from '../types/game'
import { ARTISTS } from './constants'

// ===================
// ARTIST VALUATION ENGINE
// ===================

/**
 * Rank artists based on cards played this round
 * Critical Rules:
 * 1. Highest card count wins
 * 2. Tie-breaker: Board position (Manuel > Rafael)
 * 3. Top 3 get 30/20/10, others get 0
 */
export function rankArtists(
  cardsPlayedPerArtist: Record<Artist, number>
): ArtistRoundResult[] {
  // Create list of artists with their counts and board positions
  const artistCounts = ARTISTS.map((artist, index) => ({
    artist,
    cardCount: cardsPlayedPerArtist[artist],
    boardPosition: index, // Lower = higher priority in ties (0 = Manuel)
  }))

  // Sort by:
  // 1. Card count (descending)
  // 2. Board position (ascending) - leftmost wins ties
  artistCounts.sort((a, b) => {
    if (b.cardCount !== a.cardCount) {
      return b.cardCount - a.cardCount
    }
    return a.boardPosition - b.boardPosition // Lower position wins
  })

  // Assign ranks to top 3 (if they have at least 1 card)
  const results: ArtistRoundResult[] = []
  const values: (0 | 10 | 20 | 30)[] = [30, 20, 10]

  for (let i = 0; i < artistCounts.length; i++) {
    const { artist, cardCount } = artistCounts[i]

    if (i < 3 && cardCount > 0) {
      results.push({
        artist,
        cardCount,
        rank: (i + 1) as 1 | 2 | 3,
        value: values[i],
      })
    } else {
      results.push({
        artist,
        cardCount,
        rank: null,
        value: 0,
      })
    }
  }

  return results
}

/**
 * Get cumulative value for an artist
 * CRITICAL RULE: Artist must be in top 3 THIS round to have any value
 */
export function getArtistValue(
  board: GameBoard,
  artist: Artist,
  round: number // 0-indexed
): number {
  // Check if artist was in top 3 this round
  const currentRoundValue = board.artistValues[artist][round]
  if (currentRoundValue === 0) {
    return 0 // Not top 3 this round = worth nothing
  }

  // Sum all historical values (0 to current round inclusive)
  let totalValue = 0
  for (let r = 0; r <= round; r++) {
    totalValue += board.artistValues[artist][r]
  }

  return totalValue
}

/**
 * Calculate painting value based on round results
 * Used when selling paintings at end of round
 */
export function calculatePaintingValue(
  board: GameBoard,
  artist: Artist,
  currentRound: number, // 0-indexed
  roundResults: ArtistRoundResult[]
): number {
  // Find this artist's result for the current round
  const artistResult = roundResults.find(r => r.artist === artist)
  if (!artistResult) {
    return 0
  }

  // If not in top 3 THIS round, painting is worthless
  if (artistResult.rank === null) {
    return 0
  }

  // Sum all values from round 0 to current round
  return getArtistValue(board, artist, currentRound)
}

/**
 * Update the game board with new round results
 */
export function updateBoardWithRoundResults(
  board: GameBoard,
  round: number, // 0-indexed
  results: ArtistRoundResult[]
): GameBoard {
  const newBoard = { ...board }

  // Update each artist's value for this round
  for (const result of results) {
    newBoard.artistValues[result.artist][round] = result.value
  }

  return newBoard
}

/**
 * Initialize a new game board with zero values
 */
export function createInitialBoard(): GameBoard {
  const artistValues = {} as Record<Artist, [number, number, number, number]>

  for (const artist of ARTISTS) {
    artistValues[artist] = [0, 0, 0, 0]
  }

  return {
    artistValues,
  }
}