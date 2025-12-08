# Comprehensive E2E Test Plan for Modern Art Board Game

## Current Test Gaps

The existing `/src/engine/__tests__/game-integration.test.ts` has several limitations:
1. ❌ Skips auction phases entirely
2. ❌ No step-by-step logging or visibility
3. ❌ Forces round ends instead of playing cards
4. ❌ Manual money manipulation, not auction-driven
5. ❌ No testing of different auction types
6. ❌ Missing edge cases (bankruptcy, ties)

## Proposed Solution: Comprehensive E2E Test

### Phase A: Game Logger & Utility System
1. **Create GameLogger class** (`/src/engine/testing/game-logger.ts`)
   - Log every action with timestamps
   - Format money changes, card plays, auctions
   - Human-readable output with player names
   - Summaries after each round

2. **Create Test Helper Functions** (`/src/engine/testing/test-helpers.ts`)
   - `createRealisticGameSetup()` - varied player types
   - `simulateAuction()` - proper auction execution
   - `makeAIDecision()` - simple AI logic for testing
   - `validateGameState()` - check invariants

### Phase B: Core Test Implementation
3. **Create Comprehensive E2E Test** (`/src/engine/__tests__/comprehensive-game.test.ts`)
   - **Test 1: Standard 4-Round Game**
     - 4 players (2 human, 2 AI)
     - Play actual auctions for each card
     - Log every transaction
     - Verify final scores

   - **Test 2: All Auction Types**
     - Dedicated test for each auction type
     - Open auction with competitive bidding
     - Sealed bid with simultaneous reveals
     - Fixed price scenarios
     - Once-around bidding

   - **Test 3: Edge Cases**
     - Player going bankrupt mid-game
     - Tie scenarios with tie-breakers
     - 5th card rule triggering early round end
     - Deck exhaustion before round 4

   - **Test 4: Money Flow Verification**
     - Track every credit/debit
     - Verify bank transactions net out correctly
     - Ensure player-to-player transfers balance

### Phase C: Game Scenario Testing
4. **Create Specific Scenarios** (`/src/engine/__tests__/scenarios.test.ts`)
   - **Aggressive Buyer**: Player overbids, goes bankrupt
   - **Strategic Collector**: Focuses on one artist, wins big
   - **Balanced Approach**: Spreads investments, steady returns
   - **Luck-Based**: Gets bad cards, makes best of it

### Phase D: Visual Validation
5. **Create Game Replay Printer** (`/src/engine/testing/replay-printer.ts`)
   - Takes game state after each action
   - Prints formatted turn-by-turn replay
   - Shows board state, player money, artist values
   - Can be used for debugging

## Expected Test Output Format

```
=== ROUND 1 ===
Turn 1: Player 1 plays Manuel Carvalho (Open Auction)
  - Card: Spring Forest #12
  - Current artist rankings: Manuel(1), others(0)

Auction Phase:
  - Starting bid: $10 (auctioneer: Player 1)
  - Player 2 bids: $15
  - Player 3 bids: $20
  - Player 4 passes
  - Player 1 passes
  - Winner: Player 3 for $20
  - Money transfer: Player 3 → Player 1 ($20)

Money Status:
  - Player 1: $120 (+$20 from auction)
  - Player 2: $100
  - Player 3: $80 (-$20 for painting)
  - Player 4: $100

Turn 2: Player 2 plays Sigrid Thaler (Sealed Bid)
  - Bids placed secretly...
  - Revealed: Player 1($30), Player 3($25), Player 4($35)
  - Winner: Player 4 for $35
  - Money transfer: Player 4 → Player 2 ($35)

[... continues for each card play ...]

=== END OF ROUND 1 ===
Artist Rankings:
  1. Manuel Carvalho: 5 cards → $30 each
  2. Sigrid Thaler: 4 cards → $20 each
  3. Daniel Melim: 3 cards → $10 each
  4. Ramon Martins: 2 cards → $0 each
  5. Rafael Silveira: 1 card → $0 each

Bank Sales:
  - Player 1 sells 2 Manuel paintings → $60
  - Player 1 sells 1 Sigrid painting → $20
  - [... all player sales ...]

Round 1 Final Money:
  - Player 1: $210
  - Player 2: $135
  - Player 3: $95
  - Player 4: $160
```

## Implementation Priority

1. **High Priority** - Core E2E test with proper auctions
2. **Medium Priority** - Game logger and visual output
3. **Low Priority** - Specific scenarios and edge cases

## Success Criteria

1. ✅ All auction types work correctly
2. ✅ Money flow is accurate and traceable
3. ✅ Artist values calculate correctly each round
4. ✅ Bank sales process properly
5. ✅ Game ends with correct winner
6. ✅ Edge cases handled gracefully
7. ✅ Clear output shows exactly what's happening

This comprehensive test will:
- Build confidence the game works
- Help debug issues visually
- Serve as documentation for game flow
- Ensure readiness for UI integration