import React from 'react'

interface NullStateProps {
  isPlayerTurn: boolean
}

const NullState: React.FC<NullStateProps> = ({ isPlayerTurn }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        minHeight: '200px',
      }}
    >
      <div
        style={{
          width: '120px',
          height: '168px',
          border: '2px dashed rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
        }}
      >
        <span style={{ fontSize: '48px', opacity: 0.3 }}>🎨</span>
        <span
          style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.4)',
            marginTop: '8px',
            textAlign: 'center',
          }}
        >
          {isPlayerTurn ? 'Select a card' : 'Waiting...'}
        </span>
      </div>

      <p
        style={{
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.6)',
          textAlign: 'center',
          maxWidth: '280px',
        }}
      >
        {isPlayerTurn
          ? 'Click a card from your hand to start an auction.'
          : 'Wait for the current player to play a card.'}
      </p>
    </div>
  )
}

export default NullState