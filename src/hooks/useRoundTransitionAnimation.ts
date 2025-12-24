import { useEffect, useState, useCallback } from 'react'
import { useGameStore } from '../store/gameStore'
import type { GameState } from '../types'

type AnimationStage = 'idle' | 'artist_valuation' | 'purchase_sales' | 'card_dealing' | 'complete'

interface RoundTransitionState {
  stage: AnimationStage
  showArtistValuation: boolean
  showPurchaseSales: boolean
  showCardDealing: boolean
}

/**
 * Hook for managing round transition animations
 * Orchestrates the sequence of animations when a round ends
 */
export function useRoundTransitionAnimation() {
  const { gameState, completeRound, progressToNextRound } = useGameStore()
  const [animationState, setAnimationState] = useState<RoundTransitionState>({
    stage: 'idle',
    showArtistValuation: false,
    showPurchaseSales: false,
    showCardDealing: false,
  })

  // Detect when we enter selling_to_bank phase and start animation sequence
  useEffect(() => {
    if (!gameState) return

    const phase = gameState.round.phase

    // Start animation sequence when round ends and selling begins
    if (phase.type === 'selling_to_bank' && animationState.stage === 'idle') {
      console.log('[Round Transition] Starting animation sequence')
      startAnimationSequence()
    }

    // When we reach round_complete, start card dealing animation
    if (phase.type === 'round_complete' && animationState.stage !== 'card_dealing' && animationState.stage !== 'complete') {
      console.log('[Round Transition] Starting card dealing animation')
      setAnimationState({
        stage: 'card_dealing',
        showArtistValuation: false,
        showPurchaseSales: false,
        showCardDealing: true,
      })

      // After card dealing animation, auto-progress to next round
      const cardDealTimer = setTimeout(() => {
        console.log('[Round Transition] Card dealing complete, progressing to next round')
        progressToNextRound()
        setAnimationState({
          stage: 'idle',
          showArtistValuation: false,
          showPurchaseSales: false,
          showCardDealing: false,
        })
      }, 2000) // Card dealing animation duration

      return () => clearTimeout(cardDealTimer)
    }
  }, [gameState?.round.phase.type, animationState.stage])

  const startAnimationSequence = useCallback(() => {
    // Stage 1: Artist valuation animation (2-3 seconds)
    setAnimationState({
      stage: 'artist_valuation',
      showArtistValuation: true,
      showPurchaseSales: false,
      showCardDealing: false,
    })

    // Stage 2: After valuation, show purchase sales (10 seconds)
    const valuationTimer = setTimeout(() => {
      console.log('[Round Transition] Valuation complete, starting purchase sales')
      setAnimationState({
        stage: 'purchase_sales',
        showArtistValuation: false,
        showPurchaseSales: true,
        showCardDealing: false,
      })

      // Stage 3: After sales animation, transition to round_complete
      const salesTimer = setTimeout(() => {
        console.log('[Round Transition] Sales complete, transitioning to round_complete')
        completeRound()
        setAnimationState({
          stage: 'complete',
          showArtistValuation: false,
          showPurchaseSales: false,
          showCardDealing: false,
        })
      }, 10000) // Purchase sales animation duration (10s to show $$)

      return () => clearTimeout(salesTimer)
    }, 2500) // Artist valuation animation duration

    return () => clearTimeout(valuationTimer)
  }, [completeRound])

  return animationState
}
