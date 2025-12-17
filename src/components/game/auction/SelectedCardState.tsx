import React from 'react'
import { Card as GameCardComponent } from '../../Card'
import type { Card, AuctionType } from '../../../types'

const AUCTION_TYPE_INFO: Record<AuctionType, {
  name: string
  description: string
  icon: string
}> = {
  open: {
    name: 'Open Auction',
    description: 'Players take turns bidding. Highest bid wins.',
    icon: '🔊',
  },
  one_offer: {
    name: 'One Offer',
    description: 'Each player gets one chance to bid.',
    icon: '☝️',
  },
  hidden: {
    name: 'Hidden Auction',
    description: 'All players submit bids secretly.',
    icon: '🙈',
  },
  fixed_price: {
    name: 'Fixed Price',
    description: 'Auctioneer sets a price. First taker gets it.',
    icon: '🏷️',
  },
  double: {
    name: 'Double Auction',
    description: 'Can be combined with another card.',
    icon: '👯',
  },
}

interface SelectedCardStateProps {
  selectedCard: Card
  isPlayerTurn: boolean
  onPlayCard: () => void
  onPass: () => void
}

const SelectedCardState: React.FC<SelectedCardStateProps> = ({
  selectedCard,
  isPlayerTurn,
  onPlayCard,
  onPass,
}) => {
  const auctionInfo = AUCTION_TYPE_INFO[selectedCard.auctionType]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px',
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div
        style={{
          marginBottom: '24px',
          animation: 'scale-in 0.3s ease-out',
        }}
      >
        <GameCardComponent
          card={{
            id: selectedCard.id,
            artist: selectedCard.artist,
            artistIndex: ['Manuel Carvalho', 'Daniel Melim', 'Sigrid Thaler', 'Ramon Martins', 'Rafael Silveira'].indexOf(selectedCard.artist),
            cardIndex: parseInt(selectedCard.id.split('_')[1]) || 0,
            auctionType: selectedCard.auctionType,
            artworkId: selectedCard.artworkId || selectedCard.id
          }}
          size="lg"
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 20px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          marginBottom: '24px',
        }}
      >
        <span style={{ fontSize: '24px' }}>{auctionInfo.icon}</span>
        <div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'white',
            }}
          >
            {auctionInfo.name}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.6)',
              maxWidth: '220px',
            }}
          >
            {auctionInfo.description}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onPlayCard}
          disabled={!isPlayerTurn}
          style={{
            padding: '14px 32px',
            background: '#FBBF24',
            border: 'none',
            borderRadius: '12px',
            color: '#000',
            fontSize: '14px',
            fontWeight: 700,
            cursor: isPlayerTurn ? 'pointer' : 'not-allowed',
            opacity: isPlayerTurn ? 1 : 0.5,
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (isPlayerTurn) {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(251, 191, 36, 0.4)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          Play Card
        </button>
        <button
          onClick={onPass}
          disabled={!isPlayerTurn}
          style={{
            padding: '14px 24px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            color: 'white',
            fontSize: '14px',
            fontWeight: 600,
            cursor: isPlayerTurn ? 'pointer' : 'not-allowed',
            opacity: isPlayerTurn ? 1 : 0.5,
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (isPlayerTurn) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
          }}
        >
          Pass
        </button>
      </div>
    </div>
  )
}

export default SelectedCardState