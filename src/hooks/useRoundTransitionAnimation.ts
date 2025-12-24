import { useEffect, useState, useCallback, useRef } from 'react'
import { useGameStore } from '../store/gameStore'

/**
 * Animation stage controls which visual elements are shown during round transitions
 * This is purely cosmetic and does not affect game state progression
 */
type AnimationStage = 'idle' | 'artist_valuation' | 'purchase_sales' | 'card_dealing'

interface RoundTransitionState {
  stage: AnimationStage
  showArtistValuation: boolean
  showPurchaseSales: boolean
  showCardDealing: boolean
}

/**
 * Hook for managing round transition animations
 *
 * DESIGN: Animation state is decoupled from game state progression.
 * - Game state (Zustand) is authoritative for game logic
 * - Animation state (React) is purely cosmetic for UI
 *
 * This prevents race conditions where animation state updates might lag behind
 * game state, causing the game to get stuck.
 */
export function useRoundTransitionAnimation() {
  const { gameState, completeRound, progressToNextRound } = useGameStore()
  const [animationState, setAnimationState] = useState<RoundTransitionState>({
    stage: 'idle',
    showArtistValuation: false,
    showPurchaseSales: false,
    showCardDealing: false,
  })

  // Track the previous phase to detect phase transitions
  const prevPhaseRef = useRef(gameState?.round.phase.type)

  // Track if we've already started animations for this phase (prevent duplicate triggers)
  const sellingToBankHandledRef = useRef(false)
  const roundCompleteHandledRef = useRef(false)

  /**
   * Main effect: Detect phase transitions and trigger appropriate actions
   *
   * Key change: We ONLY look at game phase, not animation state.
   * Animation runs independently and may be in any state when phase changes.
   */
  useEffect(() => {
    if (!gameState) return

    const phase = gameState.round.phase.type
    const prevPhase = prevPhaseRef.current

    // ============================
    // Transition TO selling_to_bank
    // ============================
    if (phase === 'selling_to_bank' && prevPhase !== 'selling_to_bank' && !sellingToBankHandledRef.current) {
      console.log('[Round Transition] Entering selling_to_bank phase, starting animations')
      sellingToBankHandledRef.current = true
      roundCompleteHandledRef.current = false // Reset for next phase

      // Start animation sequence (cosmetic only, doesn't block game flow)
      startAnimationSequence()
    }

    // ============================
    // Transition TO round_complete
    // ============================
    if (phase === 'round_complete' && prevPhase !== 'round_complete' && !roundCompleteHandledRef.current) {
      console.log('[Round Transition] Entering round_complete phase, starting card dealing')
      roundCompleteHandledRef.current = true
      sellingToBankHandledRef.current = false // Reset for next round

      // Start card dealing animation (cosmetic only)
      setAnimationState({
        stage: 'card_dealing',
        showArtistValuation: false,
        showPurchaseSales: false,
        showCardDealing: true,
      })

      // After card dealing animation, auto-progress to next round
      // This timer is purely for visual effect - game progression happens regardless
      const cardDealTimer = setTimeout(() => {
        console.log('[Round Transition] Card dealing animation complete, progressing to next round')
        progressToNextRound()
        // Reset animation state after progression
        setAnimationState({
          stage: 'idle',
          showArtistValuation: false,
          showPurchaseSales: false,
          showCardDealing: false,
        })
      }, 1500) // Card dealing animation duration

      return () => clearTimeout(cardDealTimer)
    }

    // Reset refs when leaving special phases (in case we loop back)
    if (phase !== 'selling_to_bank' && phase !== 'round_complete') {
      sellingToBankHandledRef.current = false
      roundCompleteHandledRef.current = false
    }

    // Update previous phase ref at the end (after checks)
    prevPhaseRef.current = phase
  }, [gameState?.round.phase.type, completeRound, progressToNextRound])

  /**
   * Start the animation sequence for round ending
   * This is purely cosmetic - game state progresses independently
   */
  const startAnimationSequence = useCallback(() => {
    // Stage 1: Artist valuation animation (2.5 seconds)
    setAnimationState({
      stage: 'artist_valuation',
      showArtistValuation: true,
      showPurchaseSales: false,
      showCardDealing: false,
    })

    // Stage 2: After valuation, show purchase sales (8 seconds)
    const valuationTimer = setTimeout(() => {
      console.log('[Round Transition] Valuation complete, showing purchase sales')
      setAnimationState({
        stage: 'purchase_sales',
        showArtistValuation: false,
        showPurchaseSales: true,
        showCardDealing: false,
      })

      // Stage 3: After sales animation, trigger round completion
      const salesTimer = setTimeout(() => {
        console.log('[Round Transition] Sales animation complete, completing round')
        completeRound() // This updates game state to round_complete
        // Don't set animation state here - the round_complete transition will handle it
      }, 8000) // Purchase sales animation duration (8s to show $$)

      return () => clearTimeout(salesTimer)
    }, 2500) // Artist valuation animation duration

    return () => clearTimeout(valuationTimer)
  }, [completeRound])

  return animationState
}
