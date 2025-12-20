interface PlaceholderArtProps {
  artistIndex: number
  cardIndex: number
}

export const PlaceholderArt: React.FC<PlaceholderArtProps> = ({ artistIndex, cardIndex }) => {
  // Generate deterministic "art" based on artist and card index
  const seed = artistIndex * 100 + cardIndex
  const hue = (seed * 137) % 360
  const lightness = 20 + (seed % 30)

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: `linear-gradient(135deg,
          hsl(${hue}, 70%, ${lightness}%) 0%,
          hsl(${(hue + 60) % 360}, 60%, ${lightness - 10}%) 50%,
          hsl(${(hue + 120) % 360}, 50%, ${lightness + 10}%) 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Abstract geometric shapes */}
      <div
        style={{
          position: 'absolute',
          width: '60%',
          height: '60%',
          border: '3px solid rgba(255,255,255,0.2)',
          borderRadius: '50%',
          top: '20%',
          left: '20%',
          transform: `rotate(${seed * 10}deg)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '40%',
          height: '40%',
          background: 'rgba(255,255,255,0.1)',
          clipPath: `polygon(${50 + (seed % 30)}% 0%, 100% ${50 + (seed % 20)}%, ${50 + (seed % 40)}% 100%, 0% ${50 + (seed % 25)}%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          fontSize: '48px',
          fontWeight: 'bold',
          color: 'rgba(255,255,255,0.3)',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}
      >
        {artistIndex + 1}
      </div>
      {/* Decorative lines */}
      <svg
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
        }}
        viewBox="0 0 100 100"
      >
        <path
          d={`M ${10 + (seed % 20)} ${50 - (seed % 30)}
              Q ${50 + (seed % 30)} ${20 + (seed % 40)}
              ${90 - (seed % 20)} ${60 + (seed % 30)}`}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="2"
          fill="none"
        />
        <path
          d={`M ${10 + (seed % 30)} ${60 - (seed % 40)}
              Q ${60 + (seed % 40)} ${80 + (seed % 30)}
              ${85 - (seed % 25)} ${20 + (seed % 35)}`}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="2"
          fill="none"
        />
      </svg>
    </div>
  )
}