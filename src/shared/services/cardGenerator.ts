export const ARTISTS = [
  { name: 'Manuel Carvalho', color: '#F5C846', textColor: '#000000' },
  { name: 'Daniel Melim', color: '#DC2626', textColor: '#FFFFFF' },
  { name: 'Sigrid Thaler', color: '#2DD4BF', textColor: '#000000' },
  { name: 'Ramon Martins', color: '#22C55E', textColor: '#000000' },
  { name: 'Rafael Silveira', color: '#A855F7', textColor: '#FFFFFF' },
]

export type AuctionType = 'open' | 'one_offer' | 'hidden' | 'fixed_price' | 'double'

export interface CardData {
  id: number
  artist: string
  artistIndex: number
  cardIndex: number
  auctionType: AuctionType
}

const AUCTION_TYPES: AuctionType[] = ['open', 'one_offer', 'hidden', 'fixed_price', 'double']
const CARD_DISTRIBUTION = [12, 13, 14, 15, 16] // 70 total cards

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