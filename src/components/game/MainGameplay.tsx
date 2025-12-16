import React, { useState } from 'react'
import { useGameStore, useCurrentPlayer, useIsCurrentPlayerTurn } from '../../store/gameStore'
import { useTurnManagement } from '../../hooks/useTurnManagement'
import GameHeader from './GameHeader'
import ArtistBoard from './ArtistBoard'
import AuctionCenter from './AuctionCenter'
import OpponentPanel from './OpponentPanel'
import PlayerHand from './PlayerHand'
import AIThinkingIndicator from './AIThinkingIndicator'
import DoubleAuctionPrompt from './DoubleAuctionPrompt'
import { Card as GameCardComponent } from '../Card'
import { colors } from '../../design/premiumTokens'
import type { Card } from '../../types'

interface MainGameplayProps {
  onExitToMenu: () => void
}

const MainGameplay: React.FC<MainGameplayProps> = ({ onExitToMenu }) => {
  const { gameState, selectedCardId, selectCard, playCard, deselectCard } = useGameStore()
  const currentPlayer = useCurrentPlayer()
  const isPlayerTurn = useIsCurrentPlayerTurn()
  const { turnIndicator, isPlayerTurn: isCurrentPlayerTurn, isAIThinking, turnMessage } = useTurnManagement()
  const [artistBoardCollapsed, setArtistBoardCollapsed] = useState(false)

  // Debug logging
  console.log('MainGameplay render:', {
    gameState: !!gameState,
    currentPlayer: !!currentPlayer,
    players: gameState?.players,
    playerId: currentPlayer?.id,
    isCurrentPlayerTurn,
    isAIThinking,
    turnMessage,
    turnIndicator
  })

  if (!gameState || !currentPlayer) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #1a1c20 0%, #2d3436 100%)',
          color: 'white',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div>Loading game...</div>
        <div style={{ fontSize: '12px', opacity: 0.7 }}>
          {!gameState ? 'No game state' : 'No current player'}
        </div>
      </div>
    )
  }

  const { players, round } = gameState
  const currentPlayerIndex = 0 // Human player is always index 0
  const activePlayerIndex =
    round.phase.type === 'awaiting_card_play'
      ? (round.phase as { type: 'awaiting_card_play'; activePlayerIndex: number }).activePlayerIndex
      : round.currentAuctioneerIndex

  // Get selected card object
  const selectedCard = selectedCardId
    ? currentPlayer.hand.find((c: Card) => c.id === selectedCardId) || null
    : null

  // Handle card selection from hand
  const handleSelectCard = (cardId: string) => {
    if (selectedCardId === cardId) {
      deselectCard()
    } else {
      selectCard(cardId)
    }
  }

  // Handle playing the selected card
  const handlePlayCard = async () => {
    if (selectedCardId && isCurrentPlayerTurn && !isAIThinking) {
      try {
        await playCard(selectedCardId)
        // deselectCard() will be called automatically in the playCard action
      } catch (error) {
        console.error('Failed to play card:', error)
        // Could show user feedback here
      }
    }
  }

  // Handle pass
  const handlePass = () => {
    // For now, just deselect
    deselectCard()
    console.log('Pass turn')
  }

  // Handle Double auction second card
  const handleOfferSecondCard = (cardId: string) => {
    console.log('Offering second card:', cardId)
    // TODO: Implement double auction second card logic
  }

  const handleDeclineSecondCard = () => {
    console.log('Declining to offer second card')
    // TODO: Implement double auction decline logic
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1c20 0%, #2d3436 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Background pattern */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          opacity: 0.02,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <GameHeader onMenuClick={onExitToMenu} />

      {/* Main content area */}
      <div
        className="main-gameplay-grid"
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '320px 1fr 280px',
          gap: '16px',
          padding: '16px',
          minHeight: 0,
          position: 'relative',
        }}
      >
        {/* Left column: Artist Board */}
        <div
          className="left-column"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto',
          }}
        >
          <ArtistBoard
            collapsed={artistBoardCollapsed}
            onToggle={() => setArtistBoardCollapsed(!artistBoardCollapsed)}
          />

          {/* Current player info summary */}
          <div
            style={{
              padding: '16px',
              background: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(12px)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'white',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Your Purchases
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.5)',
                }}
              >
                This Round
              </span>
            </div>

            {currentPlayer.purchasedThisRound.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                {currentPlayer.purchasedThisRound.map((card: Card, idx: number) => (
                  <div key={`${card.id}-${idx}`} style={{ transform: 'scale(0.6)' }}>
                    <GameCardComponent
                      card={{
                        id: card.id,
                        artist: card.artist,
                        artistIndex: ['Manuel Carvalho', 'Daniel Melim', 'Sigrid Thaler', 'Ramon Martins', 'Rafael Silveira'].indexOf(card.artist),
                        cardIndex: idx,
                        auctionType: card.auctionType
                      }}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontStyle: 'italic',
                }}
              >
                No purchases yet
              </div>
            )}
          </div>
        </div>

        {/* Center column: Auction Area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            marginTop: '12px',
          }}
        >
          {/* Turn indicator */}
          <div style={{ marginBottom: '16px' }}>
            {isAIThinking ? (
              <AIThinkingIndicator turnIndicator={turnIndicator} />
            ) : (
              <div
                style={{
                  padding: '8px 20px',
                  background: isCurrentPlayerTurn
                    ? 'rgba(251, 191, 36, 0.2)'
                    : 'rgba(255, 255, 255, 0.1)',
                  border: isCurrentPlayerTurn
                    ? `1px solid ${colors.accent.gold}`
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '20px',
                  animation: isCurrentPlayerTurn ? 'active-turn-pulse 2s ease-in-out infinite' : 'none',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: isCurrentPlayerTurn ? colors.accent.gold : 'rgba(255, 255, 255, 0.6)',
                  }}
                >
                  {turnMessage || (isCurrentPlayerTurn ? "It's Your Turn!" : `Waiting for ${players[activePlayerIndex]?.name || 'opponent'}...`)}
                </span>
              </div>
            )}
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <AuctionCenter
              selectedCard={selectedCard}
              isPlayerTurn={isCurrentPlayerTurn && !isAIThinking}
              onPlayCard={handlePlayCard}
              onPass={handlePass}
            />
          </div>
        </div>

        {/* Right column: Opponents */}
        <div
          className="right-column"
          style={{
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              marginBottom: '12px',
              fontSize: '14px',
              fontWeight: 600,
              color: 'white',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Opponents
          </div>
          <OpponentPanel
            players={players}
            currentPlayerIndex={currentPlayerIndex}
            activePlayerIndex={activePlayerIndex}
          />
        </div>
      </div>

      {/* Bottom: Player Hand */}
      <div className="player-hand">
        <PlayerHand
          cards={currentPlayer.hand}
          selectedCardId={selectedCardId}
          onSelectCard={handleSelectCard}
          money={currentPlayer.money}
          disabled={!isCurrentPlayerTurn || isAIThinking || round.phase.type === 'auction'}
          purchasedThisRound={currentPlayer.purchasedThisRound}
        />
      </div>

      {/* Double Auction Prompt */}
      {gameState.round.phase.type === 'auction' &&
       gameState.round.phase.auction.type === 'double' && (
        <DoubleAuctionPrompt
          auction={gameState.round.phase.auction}
          onOfferCard={handleOfferSecondCard}
          onDecline={handleDeclineSecondCard}
        />
      )}
    </div>
  )
}

export default MainGameplay