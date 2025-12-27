import { ARTIST_COLORS } from '../../engine/constants'

export const ARTISTS = ARTIST_COLORS

export type AuctionType = 'open' | 'one_offer' | 'hidden' | 'fixed_price' | 'double'

export interface CardData {
  id: number
  artist: string
  artistIndex: number
  cardIndex: number
  auctionType: AuctionType
}

const AUCTION_TYPES: AuctionType[] = ['open', 'one_offer', 'hidden', 'fixed_price', 'double']
const CARD_DISTRIBUTION = [12, 13, 14, 15, 16] // 70 total cards (Manuel: 12, Sigrid: 13, Daniel: 14, Ramon: 15, Rafael: 16)

// Deterministic shuffle based on seed
export function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array]
  let s = seed
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const j = s % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function generateAllCards(): CardData[] {
  const cards: CardData[] = []
  let globalIndex = 0

  ARTISTS.forEach((artist, artistIndex) => {
    const count = CARD_DISTRIBUTION[artistIndex]
    for (let i = 0; i < count; i++) {
      cards.push({
        id: globalIndex,
        artist: artist.name,
        artistIndex,
        cardIndex: i,
        auctionType: AUCTION_TYPES[globalIndex % 5],
      })
      globalIndex++
    }
  })

  return cards
}

// Pre-generated, deterministically shuffled cards
export const ALL_CARDS = seededShuffle(generateAllCards(), 42)