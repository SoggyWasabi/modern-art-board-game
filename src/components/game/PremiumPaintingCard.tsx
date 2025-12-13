import { useState } from 'react'

interface PaintingCardProps {
  id: string
  artist: string
  auctionType: 'open' | 'one_offer' | 'hidden' | 'fixed_price' | 'double'
  artworkId?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isSelected?: boolean
  onClick?: () => void
  className?: string
}

export const PremiumPaintingCard = ({
  id,
  artist,
  auctionType,
  artworkId,
  size = 'md',
  isSelected = false,
  onClick,
  className = '',
}: PaintingCardProps) => {
  const [isHovered, setIsHovered] = useState(false)

  // Size configurations - realistic playing card proportions
  const sizeConfig = {
    sm: { width: '60px', height: '84px', fontSize: '0.625rem', iconSize: '1.25rem' },
    md: { width: '90px', height: '126px', fontSize: '0.75rem', iconSize: '1.5rem' },
    lg: { width: '120px', height: '168px', fontSize: '0.875rem', iconSize: '1.75rem' },
    xl: { width: '150px', height: '210px', fontSize: '1rem', iconSize: '2rem' },
  }

  // Artist color schemes
  const artistColors = {
    'Manuel Carvalho': {
      gradient: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
      glow: 'rgba(255, 107, 53, 0.4)',
      light: '#ff9558',
    },
    'Sigrid Thaler': {
      gradient: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
      glow: 'rgba(78, 205, 196, 0.4)',
      light: '#95e1d3',
    },
    'Daniel Melim': {
      gradient: 'linear-gradient(135deg, #95e77e 0%, #68b665 100%)',
      glow: 'rgba(149, 231, 126, 0.4)',
      light: '#a8e063',
    },
    'Ramon Martins': {
      gradient: 'linear-gradient(135deg, #a8e6cf 0%, #7fcdbb 100%)',
      glow: 'rgba(168, 230, 207, 0.4)',
      light: '#b4f7ce',
    },
    'Rafael Silveira': {
      gradient: 'linear-gradient(135deg, #ff8cc3 0%, #ff6fab 100%)',
      glow: 'rgba(255, 140, 195, 0.4)',
      light: '#ffb3d9',
    },
  }

  // Auction type configurations
  const auctionConfig = {
    open: {
      icon: '📢',
      gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      label: 'Open',
    },
    one_offer: {
      icon: '👆',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      label: 'One Offer',
    },
    hidden: {
      icon: '🤫',
      gradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
      label: 'Hidden',
    },
    fixed_price: {
      icon: '💰',
      gradient: 'linear-gradient(135deg, #f2994a 0%, #f2c94c 100%)',
      label: 'Fixed Price',
    },
    double: {
      icon: '🎯',
      gradient: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
      label: 'Double',
    },
  }

  const currentArtistColors = artistColors[artist as keyof typeof artistColors] || artistColors['Manuel Carvalho']
  const currentAuctionConfig = auctionConfig[auctionType]

  return (
    <div
      className={`relative group cursor-pointer transition-all duration-300 ${isSelected ? 'scale-110 z-20' : ''} ${className}`}
      style={{
        width: sizeConfig[size].width,
        height: sizeConfig[size].height,
        transform: isHovered && !isSelected ? 'translateY(-8px) scale(1.05)' : isSelected ? 'scale(1.1)' : 'scale(1)',
        filter: isSelected ? `drop-shadow(0 0 20px ${currentArtistColors.glow})` : isHovered ? 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.3))' : 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Card background with glass morphism */}
      <div
        className="absolute inset-0 rounded-2xl backdrop-blur-xl border-2 transition-all duration-300"
        style={{
          background: `linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)`,
          borderColor: isSelected ? currentArtistColors.light : isHovered ? currentArtistColors.glow : 'rgba(255, 255, 255, 0.1)',
          borderWidth: isSelected ? '3px' : '2px',
        }}
      />

      {/* Artist color strip */}
      <div
        className="absolute top-0 left-0 right-0 h-2 rounded-t-2xl"
        style={{ background: currentArtistColors.gradient }}
      />

      {/* Artwork placeholder */}
      <div className="absolute inset-4 rounded-xl overflow-hidden">
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, ${currentArtistColors.glow} 0%, transparent 70%)`,
          }}
        />

        {/* Abstract art pattern */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-3/4 h-3/4 rounded-lg opacity-30"
            style={{
              background: `linear-gradient(45deg, ${currentArtistColors.light} 25%, transparent 25%, transparent 75%, ${currentArtistColors.light} 75%, ${currentArtistColors.light}), linear-gradient(45deg, ${currentArtistColors.light} 25%, transparent 25%, transparent 75%, ${currentArtistColors.light} 75%, ${currentArtistColors.light})`,
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 10px 10px',
            }}
          />
        </div>

        {/* Center piece */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-1/2 h-1/2 rounded-full"
            style={{
              background: `radial-gradient(circle, ${currentArtistColors.light} 0%, transparent 70%)`,
              filter: 'blur(2px)',
            }}
          />
        </div>
      </div>

      {/* Artist name */}
      <div className="absolute bottom-12 left-2 right-2 text-center">
        <div
          className="font-bold text-white"
          style={{ fontSize: sizeConfig[size].fontSize }}
        >
          {artist.split(' ')[0]}
        </div>
      </div>

      {/* Auction type indicator */}
      <div className="absolute bottom-2 left-2 right-2">
        <div
          className="glass-card px-2 py-1 rounded-lg flex items-center justify-center gap-1"
          style={{
            background: `linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)`,
          }}
        >
          <span style={{ fontSize: sizeConfig[size].iconSize }}>
            {currentAuctionConfig.icon}
          </span>
          <span
            className="text-xs font-medium text-white"
            style={{ fontSize: sizeConfig[size].fontSize }}
          >
            {currentAuctionConfig.label}
          </span>
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg animate-pulse">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Hover glow effect */}
      {isHovered && !isSelected && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            boxShadow: `0 0 30px ${currentArtistColors.glow} inset, 0 0 50px ${currentArtistColors.glow}`,
          }}
        />
      )}

      {/* Card shine effect */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, transparent 40%, rgba(255, 255, 255, 0.1) 50%, transparent 60%)',
          transform: 'translateX(-100%)',
        }}
      />
    </div>
  )
}