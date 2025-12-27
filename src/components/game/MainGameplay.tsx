import React, { useState, useRef, useEffect } from 'react'
import { useGameStore, useCurrentPlayer, useIsCurrentPlayerTurn } from '../../store/gameStore'
import { useTurnManagement } from '../../hooks/useTurnManagement'
import { useRoundTransitionAnimation } from '../../hooks/useRoundTransitionAnimation'
import { isHumanPlayerTurn } from '../../utils/auctionTurnDetection'
import GameHeader from './GameHeader'
import ArtistBoard from './ArtistBoard'
import AuctionCenter from './AuctionCenter'
import OpponentPanel from './OpponentPanel'
import PlayerHand from './PlayerHand'
import GameEndDisplay from './phases/GameEndDisplay'
// PurchaseSaleAnimation removed - replaced with BankExchangeAnimation in AuctionCenter
// ArtistValuationAnimation removed - now rendered in AuctionCenter for selling_to_bank phase
import CardDealingAnimation from './animations/CardDealingAnimation'
// CardDiscardAnimation removed - AuctionCenter now shows FifthCardCeremony instead
// import DoubleAuctionPrompt from './DoubleAuctionPrompt' // Removed - now using card highlighting instead
import { Card as GameCardComponent } from '../Card'
import type { Card } from '../../types'
import { getArtistIndex } from '../../engine/constants'

interface MainGameplayProps {
  onExitToMenu: () => void
}

const MainGameplay: React.FC<MainGameplayProps> = ({ onExitToMenu }) => {
  const { gameState, selectedCardId, selectCard, playCard, deselectCard, placeBid, passBid, offerSecondCardForDouble, declineSecondCardForDouble, processAITurn, sellAllPaintings } = useGameStore()
  const currentPlayer = useCurrentPlayer()
  const isPlayerTurn = useIsCurrentPlayerTurn()
  const { turnIndicator, isPlayerTurn: isCurrentPlayerTurn, isAIThinking, turnMessage } = useTurnManagement()
  const animationState = useRoundTransitionAnimation()
  const [artistBoardCollapsed, setArtistBoardCollapsed] = useState(false)

  // Track purchased card positions for Bank Exchange Animation
  const purchasedCardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [purchasedCardsPositions, setPurchasedCardsPositions] = useState<Array<{
    card: Card
    playerId: string
    position: { x: number; y: number } | null
  }>>([])

  // Update positions when artist valuation animation triggers (before cards fly)
  useEffect(() => {
    if (animationState.showArtistValuation && gameState) {
      // Small delay to ensure DOM is settled after phase transition
      const timer = setTimeout(() => {
        const positions: Array<{
          card: Card
          playerId: string
          position: { x: number; y: number } | null
        }> = []

        // Collect all players' purchased cards
        gameState.players.forEach((player) => {
          player.purchasedThisRound.forEach((card) => {
            const ref = purchasedCardRefs.current.get(card.id)
            if (ref) {
              const rect = ref.getBoundingClientRect()
              positions.push({
                card,
                playerId: player.id,
                position: {
                  x: rect.left + rect.width / 2,
                  y: rect.top + rect.height / 2,
                },
              })
            } else {
              // Card ref not found, add with null position
              positions.push({
                card,
                playerId: player.id,
                position: null,
              })
            }
          })
        })

        setPurchasedCardsPositions(positions)
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [animationState.showArtistValuation, gameState])

  // Clear positions when animation ends
  useEffect(() => {
    if (!animationState.showArtistValuation) {
      setPurchasedCardsPositions([])
    }
  }, [animationState.showArtistValuation])

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

  // Handle card selection from hand (will be overridden below for double auction)

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

  // Double auction detection logic
  const isDoubleAuctionPhase = gameState.round.phase.type === 'auction' &&
    gameState.round.phase.auction.type === 'double' &&
    !gameState.round.phase.auction.secondCard && // Still in offering phase
    gameState.round.phase.auction.isActive

  // Check if it's the player's turn to offer a second card
  const isPlayerTurnToOffer = isDoubleAuctionPhase &&
    gameState.round.phase.auction.turnOrder[gameState.round.phase.auction.currentTurnIndex] === currentPlayer.id

  // Get the target artist for matching cards
  const targetArtist = isDoubleAuctionPhase ? gameState.round.phase.auction.doubleCard.artist : null

  // Determine which cards should be highlighted/disabled for double auction
  const getCardHighlightStatus = (card: Card) => {
    if (!isDoubleAuctionPhase || !isPlayerTurnToOffer || !targetArtist) {
      return { isHighlighted: false, isDisabled: false, isPartiallyHighlighted: false }
    }

    const isMatchingCard = card.artist === targetArtist && card.auctionType !== 'double'
    const isSelected = selectedDoubleCard?.id === card.id

    return {
      isHighlighted: isSelected, // Only selected card gets full highlight
      isDisabled: !isMatchingCard,
      isPartiallyHighlighted: isMatchingCard && !isSelected // Other eligible cards get partial highlight
    }
  }

  // Handle Double auction second card selection
  const handleOfferSecondCard = (cardId: string) => {
    if (isDoubleAuctionPhase && isPlayerTurnToOffer) {
      offerSecondCardForDouble(cardId)
    }
  }

  const handleDeclineSecondCard = () => {
    if (isDoubleAuctionPhase && isPlayerTurnToOffer) {
      declineSecondCardForDouble()
    }
  }

  // State to track selected card for double auction preview
  const [selectedDoubleCard, setSelectedDoubleCard] = useState<Card | null>(null)

  // Handle card selection from hand with double auction support
  const handleSelectCard = (cardId: string) => {
    // In double auction offering phase, use different logic
    if (isDoubleAuctionPhase && isPlayerTurnToOffer) {
      const card = currentPlayer.hand.find(c => c.id === cardId)
      const highlightStatus = getCardHighlightStatus(card)
      if (card && (highlightStatus.isHighlighted || highlightStatus.isPartiallyHighlighted)) {
        // Set the selected card for preview mode instead of immediately offering
        setSelectedDoubleCard(card)
      }
      return
    }

    // Normal card selection logic
    if (selectedCardId === cardId) {
      deselectCard()
    } else {
      selectCard(cardId)
    }
  }

  // Reset double card selection when leaving double auction phase
  React.useEffect(() => {
    if (!isDoubleAuctionPhase) {
      setSelectedDoubleCard(null)
    }
  }, [isDoubleAuctionPhase])


  // Process AI turns when it's an AI player's turn
  React.useEffect(() => {
    if (!gameState) {
      return
    }

    const phase = gameState.round.phase

    // Only process AI turns during awaiting_card_play phase
    if (phase.type !== 'awaiting_card_play') {
      return
    }

    const activePlayerIndex = phase.activePlayerIndex
    const activePlayer = gameState.players[activePlayerIndex]

    // Check if it's an AI player's turn
    if (activePlayer && activePlayer.isAI) {
      console.log(`[AI Turn] Detected AI player's turn: ${activePlayer.name}`)

      // Small delay for UI to update, then trigger AI turn
      const timeoutId = setTimeout(() => {
        console.log(`[AI Turn] Triggering AI turn for ${activePlayer.name}`)
        processAITurn()
      }, 1000)

      return () => clearTimeout(timeoutId)
    }
  }, [gameState, processAITurn])

  // Render phase overlays
  if (gameState) {
    const phase = gameState.round.phase

    // Game ended
    if (gameState.gamePhase === 'ended') {
      return <GameEndDisplay gameState={gameState} onReturnToMenu={onExitToMenu} />
    }

    // Selling phase and round complete will be handled by animations on the main board
    // No full-screen overlays needed
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

            {currentPlayer.purchasedThisRound.length > 0 && !animationState.isFlyingCards ? (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                {currentPlayer.purchasedThisRound.map((card: Card, idx: number) => (
                  <div
                    key={`${card.id}-${idx}`}
                    ref={(el) => {
                      if (el) purchasedCardRefs.current.set(card.id, el)
                      else purchasedCardRefs.current.delete(card.id)
                    }}
                    style={{ transform: 'scale(0.6)' }}
                  >
                    <GameCardComponent
                      card={{
                        id: card.id,
                        artist: card.artist,
                        artistIndex: getArtistIndex(card.artist),
                        cardIndex: card.cardIndex,
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
            marginTop: '0px',
          }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              maxWidth: '650px',
            }}
          >
            <AuctionCenter
              selectedCard={selectedCard}
              selectedDoubleCard={selectedDoubleCard}
              isPlayerTurn={isCurrentPlayerTurn}
              onPlayCard={handlePlayCard}
              onPass={handlePass}
              onClearSelectedDoubleCard={() => setSelectedDoubleCard(null)}
              purchasedCardsPositions={purchasedCardsPositions}
              showArtistValuation={animationState.showArtistValuation}
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
            isFlyingCards={animationState.isFlyingCards}
            registerCardRef={(cardId, el) => {
              if (el) purchasedCardRefs.current.set(cardId, el)
              else purchasedCardRefs.current.delete(cardId)
            }}
          />
        </div>
      </div>

      {/* Double Auction Helper - REMOVED */}
      {/* Helper prompt removed - now using card highlighting in hand instead */}

      {/* Bottom: Player Hand */}
      <div className="player-hand">
        <PlayerHand
          cards={currentPlayer.hand}
          selectedCardId={selectedCardId}
          onSelectCard={handleSelectCard}
          money={currentPlayer.money}
          disabled={!isCurrentPlayerTurn || isAIThinking || (round.phase.type === 'auction' && !isDoubleAuctionPhase)}
          purchasedThisRound={currentPlayer.purchasedThisRound}
          getCardHighlightStatus={getCardHighlightStatus}
        />
      </div>

      {/* Double Auction Prompt - REMOVED */}
      {/* Popup removed to improve UX - now using card highlighting in hand instead */}

      {/* Round Transition Animations */}
      {/* FifthCardCeremony, ArtistValuationAnimation, and BankExchangeAnimation now render in AuctionCenter */}
      <CardDealingAnimation show={animationState.showCardDealing} />
    </div>
  )
}

export default MainGameplay