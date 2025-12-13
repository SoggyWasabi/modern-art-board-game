// Artwork data structure for the 70 Modern Art cards
export interface Artwork {
  id: string
  artist: string
  title: string
  year: number
  auctionType: 'open' | 'one_offer' | 'hidden' | 'fixed_price' | 'double'
  imageUrl: string // For now, we'll use generated patterns
  colorScheme: {
    primary: string
    secondary: string
    accent: string
  }
}

// Artist color schemes
const artistColorSchemes = {
  'Manuel Carvalho': {
    primary: '#ff6b35',
    secondary: '#f7931e',
    accent: '#ff9558',
  },
  'Sigrid Thaler': {
    primary: '#4ecdc4',
    secondary: '#44a08d',
    accent: '#95e1d3',
  },
  'Daniel Melim': {
    primary: '#95e77e',
    secondary: '#68b665',
    accent: '#a8e063',
  },
  'Ramon Martins': {
    primary: '#a8e6cf',
    secondary: '#7fcdbb',
    accent: '#b4f7ce',
  },
  'Rafael Silveira': {
    primary: '#ff8cc3',
    secondary: '#ff6fab',
    accent: '#ffb3d9',
  },
}

// Generate all 70 artworks
export const generateAllArtworks = (): Artwork[] => {
  const artworks: Artwork[] = []

  // Card distribution per artist
  const distribution = {
    'Manuel Carvalho': 12,
    'Sigrid Thaler': 13,
    'Daniel Melim': 14,
    'Ramon Martins': 15,
    'Rafael Silveira': 16,
  }

  const auctionTypes: Artwork['auctionType'][] = ['open', 'one_offer', 'hidden', 'fixed_price', 'double']
  let cardIndex = 0

  for (const [artist, count] of Object.entries(distribution)) {
    for (let i = 0; i < count; i++) {
      const auctionType = auctionTypes[cardIndex % auctionTypes.length]
      artworks.push({
        id: `${artist.toLowerCase().replace(' ', '_')}_${auctionType}_${i + 1}`,
        artist,
        title: `Artwork ${cardIndex + 1}`,
        year: 2020 + (cardIndex % 5),
        auctionType,
        imageUrl: `/api/placeholder-artwork/${artist}/${i}`,
        colorScheme: artistColorSchemes[artist as keyof typeof artistColorSchemes],
      })
      cardIndex++
    }
  }

  return artworks
}

export const allArtworks = generateAllArtworks()