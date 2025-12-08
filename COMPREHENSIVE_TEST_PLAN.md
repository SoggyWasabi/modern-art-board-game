# Comprehensive Test Plan

## Overview
This document outlines all test cases needed for the Modern Art Board Game engine, organized by module and test type.

## Test Structure

```
src/engine/__tests__/
├── unit/                      # Isolated module tests
│   ├── deck.test.ts           # Card creation/dealing
│   ├── round.test.ts          # Round flow, card play
│   ├── valuation.test.ts      # Artist ranking/values
│   ├── money.test.ts          # Payment transactions
│   ├── selling.test.ts        # Bank sales
│   ├── endgame.test.ts        # Winner determination
│   ├── game.test.ts           # Game orchestration
│   ├── auction/               # All auction type tests
│   │   ├── open.test.ts       # Open auction logic
│   │   ├── double.test.ts     # Double auction logic
│   │   ├── fixed-price.test.ts # Fixed price auction logic
│   │   ├── hidden.test.ts     # Hidden bid auction logic
│   │   └── one-offer.test.ts  # One offer auction logic
│
├── integration/               # Module interaction tests
│   └── game-flow.test.ts      # Single file: round transitions,
│                              # money flow between modules
│
├── e2e/                       # Full game simulations
│   └── complete-game.test.ts  # ONE clear E2E test with multiple
│                              # scenarios (3/4/5 players, edge cases)
│
└── helpers/                   # Test utilities
    ├── game-builder.ts
    ├── game-invariants.ts
    └── fixtures.ts
```

---

## Unit Tests

### 1. deck.test.ts ✅ (exists, good coverage)
**Functions to test:**
- `createDeck()`
  - Returns 65 cards total
  - 17 cards per artist (5 artists)
  - Card distribution matches constants
- `shuffleDeck()`
  - Randomizes order
  - Deterministic with seed
  - Preserves card count
- `dealCards()`
  - Correct number of cards per player
  - Cards removed from deck
  - Remaining cards correct
- `getCardsToDeal()`
  - Returns correct amounts for player counts/rounds
- `validateDeckConfiguration()`
  - Throws if configuration invalid

### 2. money.test.ts ❌ (missing)
**Functions to test:**
- `transferMoney()`
  - Valid transfers between players
  - Insufficient funds handling
  - Negative amounts rejected
  - Same player transfer
- `payToBank()`
  - Money removed from player
  - Bank balance increases
  - Insufficient funds
- `receiveFromBank()`
  - Money added to player
  - Bank balance decreases
  - Bank insufficient funds
- `processAuctionPayment()`
  - Winner pays bank
  - Other players pay auctioneer
  - Free auction handling
- `processBankSale()`
  - Money added to player
  - Bank balance decreases
- `canAfford()`
  - True/False based on balance
- `getMaxBid()`
  - Returns player's money
- `getPlayerMoney()`
  - Returns correct balance
- `hasBankruptPlayer()`
  - Detects zero balance
- `getPlayersWhoCannotAfford()`
  - Returns list of players
- `getTotalMoney()`
  - Sum of all player + bank money

### 3. selling.test.ts ❌ (missing)
**Functions to test:**
- `sellPlayerPaintingsToBank()`
  - Single painting sale
  - Multiple paintings same artist
  - No paintings to sell
  - Bank pays correct amounts
- `sellAllPaintingsToBank()`
  - All players' paintings sold
  - Game state updated
- `getPlayerSellablePaintings()`
  - Returns paintings in hand
  - Excludes unsold auction cards
- `calculatePlayerSaleEarnings()`
  - Correct value calculation
  - Zero for no paintings
- `hasSellablePaintings()`
  - True/False based on hand
- `getAllPlayersSaleEarnings()`
  - Returns all players' earnings
- `getTotalPaintingValue()`
  - Sum of all painting values
- `getPaintingDistribution()`
  - Count by artist
- `getPlayersMostValuableArtist()`
  - Returns highest value artist per player

### 4. endgame.test.ts ❌ (missing)
**Functions to test:**
- `determineWinner()`
  - Single winner
  - Tie with money
  - Tie breaker (paintings count)
  - All players bankrupt
- `getGameSummary()`
  - Complete game statistics
  - All transactions logged
- `getPlayerFinalStats()`
  - Money earned/spent
  - Paintings sold/bought
  - Final balance
- `checkEarlyEndConditions()`
  - Player bankruptcy
  - Required rounds played
- `getPlayerRankings()`
  - Sorted by money
  - Tie positions
- `getGameStatistics()`
  - Total transactions
  - Auctions by type
  - Average prices

### 5. game.test.ts ⚠️ (exists, needs refactoring)
**Functions to test (isolated):**
- `startGame()`
  - Initial state setup
  - Players dealt cards
  - Bank initialized
  - First round started
- `nextRound()`
  - Increment round number
  - Deal new cards
  - Reset auction state
- `shouldEndGameEarly()`
  - Bankruptcy detection
  - Minimum rounds played
- `endGame()`
  - Final state set
  - Winner determined
- `getCurrentGamePhase()`
  - Returns correct phase
- `isGameOver()`
  - True when game ended
- `getCurrentRound()`
  - Returns round number
- `getGameStats()`
  - Current game statistics
- `validateGameState()`
  - State consistency checks

### 6. round.test.ts ✅ (exists, good coverage)
**Functions to test:**
- `startRound()`
  - Round state initialized
  - Cards dealt
- `playCard()`
  - Card moved to auction
  - Round state updated
- `getNextAuctioneerIndex()`
  - Rotates correctly
- `shouldRoundEnd()`
  - All cards played
- `endRound()`
  - Round completed
  - Artist values updated
- `getCurrentPlayer()`
  - Returns active player
- `canPlayerPlayCard()`
  - Valid/Invalid plays
- `getPlayableCards()`
  - Returns available cards
- `isRoundInAuction()`
  - Auction state check
- `getCurrentAuction()`
  - Returns auction details
- `getRemainingCards()`
  - Count of unplayed cards

### 7. valuation.test.ts ✅ (exists, good coverage)
**Functions to test:**
- `rankArtists()`
  - Correct sorting
  - Tie handling
- `getArtistValue()`
  - Returns correct value
  - Based on ranking
- `calculatePaintingValue()`
  - Single painting value
- `updateBoardWithRoundResults()`
  - Board updated correctly
- `createInitialBoard()`
  - All artists start at 0

### 8. Auction Tests (need creation)
#### 8a. auction/open.test.ts
**Functions to test:**
- `createOpenAuction()`
  - State initialized
  - Current player set
- `placeBid()`
  - Valid bid amounts
  - Bid tracking
  - Turn rotation
- `pass()`
  - Player passes
  - Winner determination
- `concludeAuction()`
  - Payment processing
  - Card distribution
- `isValidBid()`
  - Bid validation
- `getValidActions()`
  - Available actions

#### 8b. auction/double.test.ts
**Functions to test:**
- `createDoubleAuction()`
  - Initial state
- `offerSecondCard()`
  - Second card added
- `declineToOffer()`
  - Pass on second card
- `acceptOffer()`
  - Offer acceptance
- `concludeAuction()`
  - Payment and distribution
- `getCurrentPlayer()`
  - Active player
- `isPlayerTurn()`
  - Turn validation
- `hasSecondCardOffered()`
  - State check
- `getCurrentAuctioneer()`
  - Auctioneer info
- `getValidActions()`
  - Available actions
- `getAuctionStatus()`
  - Current status
- `getCardsForWinner()`
  - Winning cards

#### 8c. auction/fixed-price.test.ts
**Functions to test:**
- Fixed price auction creation
- Price setting and validation
- Buyer acceptance/rejection
- Payment processing
- Card distribution

#### 8d. auction/hidden.test.ts
**Functions to test:**
- Hidden bid auction creation
- Secret bid collection
- Bid reveal and comparison
- Winner determination
- Tie-breaking rules
- Payment processing

#### 8e. auction/one-offer.test.ts
**Functions to test:**
- One offer auction creation
- Single offer submission
- Offer acceptance/rejection
- Negotiation flow
- Final agreement handling

---

## Integration Tests

### 1. game-flow.test.ts (single file)
**Round Flow Integration:**
- Complete round execution
- Multiple rounds transition
- Money flow between rounds
- Artist value progression
- Deck depletion handling

**State Transitions:**
- Playing → Auction → Selling
- Round 1 → Round 2 → Round 3
- Early game end scenarios

**Auction with Game State:**
- All auction types affect game state
- Money transfers during auctions
- Card distribution after auctions
- Bankruptcy during auctions

**Complete Money Flow:**
- Auction payments → Bank sales → Player transfers
- Bank balance tracking
- Wealth distribution

---

## E2E Tests

### 1. complete-game.test.ts (single file)
**Full Game Scenarios:**
- 3-player complete game
- 4-player complete game
- 5-player complete game
- Game ends by bankruptcy
- Game ends by round completion

**Win Conditions:**
- Clear winner
- Tie with money
- Tie breaker by paintings
- All players bankrupt

**Edge Scenarios (included):**
- Multiple bankruptcies
- Maximum card values
- Minimum card values
- All paintings sold
- No paintings sold

---

## Test Utilities

### 1. Game Builder Helpers
- `createGameSetup()` - Basic game creation
- `createGameWithFixedHands()` - Predetermined cards
- `createGameInRound()` - Game in specific round
- `createGameWithArtistValues()` - Set values
- `createGameWithPlayerState()` - Custom player state
- `createGameNearRoundEnd()` - End of round
- `createBankruptcyScenario()` - Bankrupt players
- `createTieScenario()` - Tied games
- `createDeterministicGame()` - Reproducible games

### 2. Game Invariants
- Card count consistency
- Money conservation
- State validity checks
- Turn order verification

### 3. Fixtures
- Standard game setups
- Common scenarios
- Edge case data

---

## Migration Plan

### Files to Delete:
- `comprehensive-game.test.ts` (880-line monster)
- `complete-game-flow.test.ts` (duplicate)
- `game-integration.test.ts` (fold into integration/)
- `game-edge-cases.test.ts` (fold into unit tests)
- `scenarios/` folder (fold into e2e/)
- `integration/full-game-flow.test.ts` (duplicate)

### Files to Refactor:
- `game.test.ts` - Remove integration tests
- `round.test.ts` - Keep as is
- `deck.test.ts` - Keep as is
- `valuation.test.ts` - Keep as is

### Files to Create:
- `unit/money.test.ts`
- `unit/selling.test.ts`
- `unit/endgame.test.ts`
- `unit/auction/` (5 auction type tests)
- `integration/game-flow.test.ts`
- `e2e/complete-game.test.ts`

---

## Test Coverage Goals

### Module Coverage:
- deck.ts: 100% ✅ (achieved)
- round.ts: 100% ✅ (achieved)
- valuation.ts: 100% ✅ (achieved)
- money.ts: 100% ❌ (needs tests)
- selling.ts: 100% ❌ (needs tests)
- endgame.ts: 100% ❌ (needs tests)
- game.ts: 100% ⚠️ (partial)
- auction/*: 100% ✅ (exists in unit/auction-types.test.ts)

### Type Coverage:
- Unit tests: 100%
- Integration tests: 100%
- E2E tests: 80% (focus on main paths)

### Edge Cases:
- All boundary conditions
- Error handling
- Invalid inputs
- Extreme values

---

## Implementation Priority

1. **High Priority** (Core functionality):
   - money.test.ts
   - selling.test.ts
   - endgame.test.ts
   - auction.test.ts

2. **Medium Priority** (Module interaction):
   - integration/game-flow.test.ts
   - integration/auction-integration.test.ts
   - integration/economy.test.ts

3. **Low Priority** (Full scenarios):
   - e2e/complete-game.test.ts
   - e2e/edge-scenarios.test.ts

---

## Test Naming Conventions

### Unit Tests:
`functionName_scenario_expectedResult`

Examples:
- `transferMoney_validTransfer_successfullyMovesMoney`
- `sellPlayerPaintingsToBank_noPaintings_returnsZero`
- `determineWinner_singleWinner_returnsCorrectPlayer`

### Integration Tests:
`moduleInteraction_scenario_expectedResult`

Examples:
- `gameFlow_completeRound_moneyTransfersCorrectly`
- `auctionIntegration_openAuction_gameStateUpdated`

### E2E Tests:
`gameScenario_condition_expectedOutcome`

Examples:
- `completeGame_fourPlayers_gameEndsWithWinner`
- `edgeScenario_multipleBankruptcies_gameEndsEarly`

---

## Test Data Management

### Fixtures:
- Standardized card distributions
- Known game states
- Reproducible scenarios

### Seeds:
- Deterministic shuffling
- Reproducible auctions
- Consistent test runs

### Cleanup:
- Isolated test state
- No shared references
- Memory management

---

## Performance Considerations

### Test Execution:
- Unit tests: < 100ms each
- Integration tests: < 500ms each
- E2E tests: < 2s each

### Parallel Execution:
- Unit tests can run in parallel
- Integration tests need isolation
- E2E tests run sequentially

### Memory Usage:
- Minimal fixtures
- Efficient builders
- Proper cleanup