import { useEffect, useState, useCallback, useRef } from 'react'
import { useGameStore } from '../store/gameStore'

/**
 * Animation stage controls which visual elements are shown during round transitions
 * This is purely cosmetic and does not affect game state progression
 */
type AnimationStage = 'idle' | 'card_discard' | 'artist_valuation' | 'card_dealing'

interface RoundTransitionState {
  stage: AnimationStage
  showCardDiscard: boolean
  showArtistValuation: boolean
  showCardDealing: boolean
  isFlyingCards: boolean // Cards are flying to center, hide from purchased areas
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
    showCardDiscard: false,
    showArtistValuation: false,
    showCardDealing: false,
    isFlyingCards: false,
  })

  // Track the previous phase to detect phase transitions
  const prevPhaseRef = useRef(gameState?.round.phase.type)

  // Track if we've already started animations for each phase (prevent duplicate triggers)
  const roundEndingHandledRef = useRef(false)
  const sellingToBankHandledRef = useRef(false)
  const roundCompleteHandledRef = useRef(false)

  /**
   * Main effect: Detect phase transitions and trigger appropriate actions
   */
  useEffect(() => {
    if (!gameState) return

    const phase = gameState.round.phase.type
    const prevPhase = prevPhaseRef.current

    // ============================
    // Transition TO round_ending (5th card played)
    // ============================
    if (phase === 'round_ending' && prevPhase !== 'round_ending' && !roundEndingHandledRef.current) {
      console.log('[Round Transition] Entering round_ending phase, starting card discard animation')
      roundEndingHandledRef.current = true

      // Start card discard animation (cosmetic only)
      setAnimationState({
        stage: 'card_discard',
        showCardDiscard: true,
        showArtistValuation: false,
        showCardDealing: false,
        isFlyingCards: false,
      })

      // The game state will auto-transition to selling_to_bank after 4.5s
      // (handled in gameStore.ts handlePhaseTransitionAfterCardPlay)
      // We just need to clear our animation state here
      const clearTimer = setTimeout(() => {
        setAnimationState({
          stage: 'idle',
          showCardDiscard: false,
          showArtistValuation: false,
          showCardDealing: false,
          isFlyingCards: false,
        })
      }, 4500)

      return () => clearTimeout(clearTimer)
    }

    // ============================
    // Transition TO selling_to_bank
    // ============================
    if (phase === 'selling_to_bank' && prevPhase !== 'selling_to_bank' && !sellingToBankHandledRef.current) {
      console.log('[Round Transition] Entering selling_to_bank phase, starting artist valuation')
      sellingToBankHandledRef.current = true
      roundCompleteHandledRef.current = false // Reset for next phase

      // Start artist valuation sequence
      startArtistValuationSequence()
    }

    // ============================
    // Transition TO round_complete
    // ============================
    if (phase === 'round_complete' && prevPhase !== 'round_complete' && !roundCompleteHandledRef.current) {
      console.log('[Round Transition] Entering round_complete phase, starting card dealing')
      roundCompleteHandledRef.current = true
      sellingToBankHandledRef.current = false // Reset for next round
      roundEndingHandledRef.current = false // Reset for next round

      // Clear any previous animations
      setAnimationState({
        stage: 'card_dealing',
        showCardDiscard: false,
        showArtistValuation: false,
        showCardDealing: true,
        isFlyingCards: false,
      })

      // After card dealing animation, auto-progress to next round
      const cardDealTimer = setTimeout(() => {
        console.log('[Round Transition] Card dealing animation complete, progressing to next round')
        progressToNextRound()
        // Reset animation state after progression
        setAnimationState({
          stage: 'idle',
          showCardDiscard: false,
          showArtistValuation: false,
          showCardDealing: false,
          isFlyingCards: false,
        })
      }, 1500)

      return () => clearTimeout(cardDealTimer)
    }

    // Reset refs when leaving special phases (in case we loop back)
    if (phase !== 'round_ending' && phase !== 'selling_to_bank' && phase !== 'round_complete') {
      roundEndingHandledRef.current = false
      sellingToBankHandledRef.current = false
      roundCompleteHandledRef.current = false
    }

    // Update previous phase ref at the end (after checks)
    prevPhaseRef.current = phase
  }, [gameState?.round.phase.type, completeRound, progressToNextRound])

  /**
   * Start the artist valuation animation sequence
   * This includes cards flying to center and player earnings display
   * After 6 seconds, trigger round completion
   */
  const startArtistValuationSequence = useCallback(() => {
    // Phase 1: Show artist valuation, cards NOT flying yet
    setAnimationState({
      stage: 'artist_valuation',
      showCardDiscard: false,
      showArtistValuation: true,
      showCardDealing: false,
      isFlyingCards: false,
    })

    // Phase 2: At 2200ms (when flying cards start), fade out purchased cards
    const flyingTimer = setTimeout(() => {
      console.log('[Round Transition] Cards now flying, fading out purchased cards')
      setAnimationState((prev) => ({
        ...prev,
        isFlyingCards: true,
      }))
    }, 2200)

    // After 6 seconds, trigger round completion
    const valuationTimer = setTimeout(() => {
      console.log('[Round Transition] Artist valuation complete, completing round')
      completeRound()
    }, 6000)

    return () => {
      clearTimeout(flyingTimer)
      clearTimeout(valuationTimer)
    }
  }, [completeRound])

  return animationState
}
