// ===================
// AI GAME CONTROLLER
// ===================

import React, { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useAIGame } from '../../hooks/useAIGame'
import { executeAuction } from '../../engine/auction/executor'

interface AIGameControllerProps {
  children: React.ReactNode
}

/**
 * AI Game Controller Component
 *
 * This component:
 * - Manages AI turn processing in the background
 * - Updates game state when AI actions complete
 * - Provides visual feedback for AI thinking
 * - Handles game flow between human and AI players
 */
export const AIGameController: React.FC<AIGameControllerProps> = ({ children }) => {
  const { gameState, isAITurn, isProcessingAITurn } = useAIGame()
  const [isAIThinking, setIsAIThinking] = useState(false)
  const processingRef = useRef(false)

  // Process AI turns when it's their turn
  useEffect(() => {
    if (!gameState || isAITurn === false || processingRef.current) {
      return
    }

    const processTurn = async () => {
      if (processingRef.current) return

      processingRef.current = true
      setIsAIThinking(true)

      try {
        console.log('Processing AI turn...')
        // This would integrate with the game engine to actually process AI turns
        // For now, we'll simulate the delay
        await new Promise(resolve => setTimeout(resolve, 2000))

        console.log('AI turn completed')
      } catch (error) {
        console.error('Error processing AI turn:', error)
      } finally {
        processingRef.current = false
        setIsAIThinking(false)
      }
    }

    // Add a small delay to show the "AI thinking" state
    const timeoutId = setTimeout(processTurn, 500)

    return () => {
      clearTimeout(timeoutId)
      processingRef.current = false
      setIsAIThinking(false)
    }
  }, [gameState, isAITurn])

  // Auto-progress auction if all humans have passed
  useEffect(() => {
    if (!gameState || gameState.round.phase.type !== 'auction') {
      return
    }

    const auction = gameState.round.phase.auction

    // Check if auction should be concluded
    if (auction && 'isActive' in auction && !auction.isActive) {
      // Conclude the auction and proceed to next turn
      const auctionResult = {
        winnerId: (auction as any).currentBidderId || (auction as any).auctioneerId,
        auctioneerId: (auction as any).auctioneerId,
        salePrice: (auction as any).currentBid || 0,
        card: (auction as any).card,
        profit: (auction as any).currentBid || 0,
        type: auction.type
      }

      // Apply auction result
      const newState = executeAuction(gameState, auctionResult, (auction as any).card)

      // Update store state
      // This would need to be integrated with the store
      console.log('Auction concluded:', auctionResult)
    }
  }, [gameState])

  // Don't render anything if game hasn't started
  if (!gameState) {
    return <>{children}</>
  }

  return (
    <div className="ai-game-controller" style={{ position: 'relative' }}>
      {/* AI Thinking Indicator */}
      {isAIThinking && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '20px 30px',
            borderRadius: '12px',
            zIndex: 1000,
            fontSize: '16px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Animated thinking dots */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#3b82f6',
                  animation: `thinking-dot 1.4s ease-in-out infinite ${i * 0.2}s`,
                }}
              />
            ))}
          </div>
          <span>AI is thinking...</span>
        </div>
      )}

      {/* AI Turn Indicator in header */}
      {isAITurn && !isAIThinking && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(251, 191, 36, 0.9)',
            color: 'black',
            padding: '8px 20px',
            borderRadius: '20px',
            zIndex: 999,
            fontSize: '14px',
            fontWeight: 600,
            boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)',
          }}
        >
          AI Turn in Progress
        </div>
      )}

      {/* Main content */}
      {children}

      {/* CSS for animation */}
      <style>{`
        @keyframes thinking-dot {
          0%, 60%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          30% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}