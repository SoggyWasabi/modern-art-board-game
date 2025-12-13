import type { Artwork } from '../data/artworks'

interface ArtworkPatternProps {
  artwork: Artwork
  size?: number
}

export const ArtworkPattern = ({ artwork, size = 200 }: ArtworkPatternProps) => {
  // Generate unique pattern based on artwork ID
  const parts = artwork.id.split('_')
  const patternIndex = parts.length > 2 ? parseInt(parts[2]) % 5 : 0

  const generatePattern = () => {
    switch (patternIndex) {
      case 0: // Circles pattern
        return (
          <>
            <circle cx="20%" cy="20%" r="15%" fill={artwork.colorScheme.accent} opacity="0.7"/>
            <circle cx="60%" cy="40%" r="10%" fill={artwork.colorScheme.primary} opacity="0.5"/>
            <circle cx="80%" cy="70%" r="12%" fill={artwork.colorScheme.secondary} opacity="0.6"/>
            <circle cx="30%" cy="80%" r="8%" fill={artwork.colorScheme.accent} opacity="0.4"/>
          </>
        )
      case 1: // Stripes pattern
        return (
          <>
            <rect x="0" y="10%" width="100%" height="8%" fill={artwork.colorScheme.primary} opacity="0.6"/>
            <rect x="0" y="30%" width="100%" height="8%" fill={artwork.colorScheme.secondary} opacity="0.5"/>
            <rect x="0" y="50%" width="100%" height="8%" fill={artwork.colorScheme.accent} opacity="0.6"/>
            <rect x="0" y="70%" width="100%" height="8%" fill={artwork.colorScheme.primary} opacity="0.4"/>
          </>
        )
      case 2: // Triangles pattern
        return (
          <>
            <polygon points="50,20 80,70 20,70" fill={artwork.colorScheme.primary} opacity="0.6"/>
            <polygon points="30,40 60,90 0,90" fill={artwork.colorScheme.secondary} opacity="0.5"/>
            <polygon points="70,30 100,80 40,80" fill={artwork.colorScheme.accent} opacity="0.4"/>
          </>
        )
      case 3: // Dots grid pattern
        const dots = []
        for (let i = 0; i < 6; i++) {
          for (let j = 0; j < 6; j++) {
            dots.push(
              <circle
                key={`${i}-${j}`}
                cx={`${15 + j * 15}%`}
                cy={`${15 + i * 15}%`}
                r="4%"
                fill={i % 2 === j % 2 ? artwork.colorScheme.primary : artwork.colorScheme.secondary}
                opacity="0.6"
              />
            )
          }
          }
        return <>{dots}</>
      case 4: // Wave pattern
        return (
          <>
            <path d="M0,40 Q25,20 50,40 T100,40 L100,60 Q75,80 50,60 T0,60 Z" fill={artwork.colorScheme.primary} opacity="0.5"/>
            <path d="M0,60 Q25,40 50,60 T100,60 L100,80 Q75,100 50,80 T0,80 Z" fill={artwork.colorScheme.secondary} opacity="0.4"/>
          </>
        )
      default:
        return null
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="w-full h-full"
    >
      {/* Background */}
      <rect width="100" height="100" fill={artwork.colorScheme.primary} opacity="0.1"/>

      {/* Pattern */}
      {generatePattern()}

      {/* Artist signature */}
      <text x="50" y="95" textAnchor="middle" fontSize="3" fill={artwork.colorScheme.primary}>
        {artwork.artist.split(' ')[0]}
      </text>
    </svg>
  )
}