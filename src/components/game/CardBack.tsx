import React from 'react'

interface CardBackProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  style?: React.CSSProperties
}

const SIZES = {
  sm: { width: 40, height: 56 },
  md: { width: 60, height: 84 },
  lg: { width: 80, height: 112 },
}

const CardBack: React.FC<CardBackProps> = ({ size = 'md', className, style }) => {
  const { width, height } = SIZES[size]

  return (
    <div
      className={className}
      style={{
        width,
        height,
        background: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
        border: '2px solid rgba(255,255,255,0.15)',
        borderRadius: '6px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        flexShrink: 0,
        ...style,
      }}
    >
      {/* Inner border */}
      <div
        style={{
          position: 'absolute',
          inset: size === 'sm' ? '3px' : '6px',
          border: '1px solid rgba(251, 191, 36, 0.2)',
          borderRadius: '3px',
        }}
      />

      {/* Diagonal pattern */}
      <div
        style={{
          position: 'absolute',
          inset: size === 'sm' ? '6px' : '10px',
          background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(251,191,36,0.06) 4px, rgba(251,191,36,0.06) 8px)',
        }}
      />

      {/* Center logo/mark */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: size === 'sm' ? '16px' : size === 'md' ? '24px' : '32px',
          height: size === 'sm' ? '16px' : size === 'md' ? '24px' : '32px',
          borderRadius: '50%',
          background: 'rgba(251, 191, 36, 0.15)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize: size === 'sm' ? '8px' : size === 'md' ? '12px' : '16px',
            color: 'rgba(251, 191, 36, 0.6)',
            fontWeight: 700,
          }}
        >
          MA
        </span>
      </div>
    </div>
  )
}

export default CardBack
