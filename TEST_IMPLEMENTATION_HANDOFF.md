# Test Implementation Handoff Document

## Overview

This document provides a comprehensive guide for implementing the integration and E2E tests for the Modern Art Board Game engine. The test scaffolding is complete - all test cases are defined with `it.todo()` and detailed documentation. The implementation work is to fill in the actual test logic.

---

## File Locations

| File | Type | Test Count | Status |
|------|------|------------|--------|
| `src/engine/__tests__/integration/game-flow.test.ts` | Integration | 51 tests | Scaffolded |
| `src/engine/__tests__/e2e/complete-game.test.ts` | E2E | 47 tests | Scaffolded |
| `src/engine/__tests__/integration/auction-execution.test.ts` | Integration | ~15 tests | **Already Implemented** |

---

## Design Philosophy

### Integration Tests vs E2E Tests

| Aspect | Integration Tests | E2E Tests |
|--------|-------------------|-----------|
| **Purpose** | Verify modules work together | Simulate complete real games |
| **Scope** | 2-4 modules interacting | Entire game engine |
| **Granularity** | Test specific interactions | Test full game narratives |
| **State Setup** | Minimal, targeted scenarios | Complete game with exact hands |
| **Assertions** | After each interaction | After every single action |
| **Length** | 10-30 lines per test | 50-200+ lines per test |
| **Readability** | Technical verification | Game transcript narrative |

### Core Principle: No Duplication

- **Unit tests** (already done): Test individual functions in isolation
- **Integration tests**: Test that modules correctly pass data to each other
- **E2E tests**: Test that a full game plays correctly from start to finish

**Do NOT re-test unit logic.** For example:
- Unit test already verifies `transferMoney()` handles negative amounts
- Integration test verifies that after an auction, money + card + event log all update together
- E2E test verifies that in a real game scenario, Bob wins auction for $25 and state is correct

---

## Integration Tests: `game-flow.test.ts`

### Section Structure

```
1. Round Lifecycle (12 tests)
   - Round start → card play → round end flow
   - 5th card rule
   - Artist valuation at round end
   - Selling phase integration

2. Multi-Round Progression (8 tests)
   - State preservation between rounds
   - Card dealing per round
   - Auctioneer rotation
   - Board value accumulation
   - Deck depletion

3. Auction → Game State Integration (9 tests)
   - Card ownership after auction
   - Money flow after auction
   - Event logging

4. Complete Round Money Flow (6 tests)
   - Money conservation
   - Wealth distribution

5. State Transitions (7 tests)
   - Phase transitions (awaiting_card_play → auction → selling_to_bank)
   - Game phase transitions (playing → ended)

6. Game State Validation (4 tests)
   - State validity after operations

7. Edge Cases (7 tests)
   - Ties, bankruptcies, unusual scenarios

8. Regression Tests (placeholder)
```

### Key Modules Being Integrated

```
game.ts ←→ round.ts ←→ valuation.ts ←→ selling.ts ←→ money.ts
                ↑
            auction/*
```

### Helper Functions Available

```typescript
// Test setup
createTestSetup(playerCount: 3 | 4 | 5): GameSetup
createGameWithHands(playerHands: Card[][], options): GameState
createCard(artist: Artist, auctionType, id?): Card
createPainting(artist, purchasePrice, purchasedRound): Painting
createAuctionResult(winnerId, auctioneerId, salePrice): AuctionResult

// Invariant assertions
expectMoneyConserved(before, after, expectedChange)
expectValidState(gameState)
expectCardCountConsistent(gameState, expectedTotal)
```

### Implementation Approach

1. **Start with Section 1** (Round Lifecycle) - most fundamental
2. **Focus on state changes** - verify multiple aspects change together
3. **Use real module functions** - no mocking
4. **Check invariants** after each operation

### Example Implementation Pattern

```typescript
it('completes round with cards played and correct artist ranking', () => {
  // SETUP: Create game with specific hands
  const game = createGameWithHands([
    [card('Manuel', 'open'), card('Manuel', 'open'), ...],
    [card('Sigrid', 'open'), ...],
    [card('Daniel', 'open'), ...]
  ])

  // ACTION: Play cards to trigger round end
  let state = playCard(game, 0, 0) // Player 0 plays card 0
  state = playCard(state, 1, 0)
  // ... simulate auction between plays
  // ... continue until 5th card of an artist

  // VERIFY: Multiple modules updated correctly
  expect(state.round.cardsPlayedPerArtist['Manuel']).toBe(5)
  expect(state.round.phase.type).toBe('round_ending')

  // End round and check valuation
  state = endRound(state)
  expect(state.board.artistValues['Manuel'][0]).toBe(30) // 1st place

  // Sell paintings and verify money
  state = sellAllPaintingsToBank(state)
  expectMoneyConserved(game, state, expectedBankPayout)
})
```

---

## E2E Tests: `complete-game.test.ts`

### Scenario Structure

```
Scenario 1: Full 4-Player Game (18 tests) ← START HERE
├── Round 1 (12 turns + valuation)
├── Round 2 (turns + valuation)
├── Round 3 (turns + valuation)
├── Round 4 (turns + valuation)
└── Game End (winner + audit)

Scenario 2: 3-Player Game (3 tests)
Scenario 3: 5-Player Game (3 tests)
Scenario 4: Edge Cases (10 tests)
Scenario 5: Performance (2 tests)
```

### The Narrative Approach

Each turn is documented like a game transcript:

```typescript
/**
 * TURN 1: Alice plays Manuel Carvalho (Open Auction)
 *
 * AUCTION SEQUENCE (Extended bidding war):
 *   Starting bid: $0
 *   - Bob bids $5 (wants Manuel for collection)
 *   - Carol bids $8 (competing)
 *   - Dave bids $10
 *   - Bob bids $12
 *   - Carol bids $15
 *   - Dave bids $18
 *   - Bob bids $20
 *   - Carol passes (too rich)
 *   - Dave bids $22
 *   - Bob bids $25
 *   - Dave passes
 *   - Alice passes (as auctioneer, was watching)
 *
 * RESULT: Bob wins for $25
 *
 * MONEY FLOW:
 *   Bob: $100 → $75 (paid $25)
 *   Alice: $100 → $125 (received $25 as auctioneer)
 *   Carol: $100 (unchanged)
 *   Dave: $100 (unchanged)
 *   TOTAL: $400 (conserved - player to player)
 *
 * STATE AFTER:
 *   - Manuel cards played: 1
 *   - Bob owns 1 Manuel painting (cost $25)
 *   - Alice has 9 cards remaining
 */
it.todo('Turn 1: Alice plays Manuel (open) - Bob wins after 8-bid war for $25')
```

### Helper Infrastructure

```typescript
// Game orchestration
class GameRunner {
  state: GameState
  logger: GameLogger

  player(nameOrIndex): Player
  playerIndex(name): number
  get totalMoney(): number
  get currentRound(): number
  log(message): void
  logState(): void
}

// Deterministic setup
createDeterministicGame({
  players: [
    { name: 'Alice', hand: [card(...), card(...), ...] },
    { name: 'Bob', hand: [...] },
    ...
  ]
}): GameState

// Assertions
expectPlayer(game, 'Alice', { money: 125, handSize: 9, paintingCount: 0 })
expectTotalMoney(game, 400)
expectCardsPlayed(game, 'Manuel', 1)
expectValidState(game)

// Auction execution
runOpenAuction(game, card, auctioneer, bidSequence): AuctionResult
runHiddenAuction(game, card, auctioneer, bids): AuctionResult
runFixedPriceAuction(game, card, auctioneer, price, sequence): AuctionResult

// Full turn execution
executeTurn(game, {
  player: 'Alice',
  cardIndex: 0,
  auction: {
    type: 'open',
    bidSequence: [
      { player: 'Bob', action: 'bid', amount: 5 },
      { player: 'Carol', action: 'bid', amount: 8 },
      // ...
    ]
  },
  expectedResult: {
    winner: 'Bob',
    price: 25,
    playerMoneyAfter: { Alice: 125, Bob: 75, Carol: 100, Dave: 100 }
  }
})
```

### Implementation Approach

1. **Start with Scenario 1, Round 1, Turn 1** - validates all helpers work
2. **Each turn is explicit** - no loops or automation hiding behavior
3. **Verify after EVERY action** - not just at end of round
4. **Long bidding sequences** - 5-10 bids per auction, not just 2-3
5. **Track every dollar** - money conservation checked constantly

### Example Implementation Pattern

```typescript
describe('Round 1', () => {
  it('Turn 1: Alice plays Manuel (open) - Bob wins after 8-bid war for $25', () => {
    // Verify initial state
    expectPlayer(game, 'Alice', { money: 100, handSize: 10 })
    expectPlayer(game, 'Bob', { money: 100, handSize: 10 })
    expectTotalMoney(game, 400)

    // Alice plays Manuel (open auction)
    const aliceManuel = game.player('Alice').hand[0] // Manuel/open
    game.state = playCard(game.state, 0, 0)

    expectCardsPlayed(game, 'Manuel Carvalho', 1)
    expectPlayer(game, 'Alice', { handSize: 9 })

    // Run auction with full bid sequence
    const result = runOpenAuction(game, aliceManuel, game.player('Alice'), [
      { player: 'Bob', action: 'bid', amount: 5 },
      { player: 'Carol', action: 'bid', amount: 8 },
      { player: 'Dave', action: 'bid', amount: 10 },
      { player: 'Bob', action: 'bid', amount: 12 },
      { player: 'Carol', action: 'bid', amount: 15 },
      { player: 'Dave', action: 'bid', amount: 18 },
      { player: 'Bob', action: 'bid', amount: 20 },
      { player: 'Carol', action: 'pass' },
      { player: 'Dave', action: 'bid', amount: 22 },
      { player: 'Bob', action: 'bid', amount: 25 },
      { player: 'Dave', action: 'pass' },
      { player: 'Alice', action: 'pass' },
    ])

    // Verify auction result
    expect(result.winnerId).toBe(game.player('Bob').id)
    expect(result.salePrice).toBe(25)

    // Process payment
    game.state = processAuctionPayment(game.state, result)

    // Verify money flow
    expectPlayer(game, 'Alice', { money: 125 }) // Received $25
    expectPlayer(game, 'Bob', { money: 75 })    // Paid $25
    expectPlayer(game, 'Carol', { money: 100 }) // Unchanged
    expectPlayer(game, 'Dave', { money: 100 })  // Unchanged
    expectTotalMoney(game, 400) // Conserved

    // Add painting to Bob
    const bob = game.state.players.find(p => p.name === 'Bob')!
    bob.purchases = bob.purchases || []
    bob.purchases.push(painting(aliceManuel, 25, 1))

    expectPlayer(game, 'Bob', { paintingCount: 1, hasPaintingOf: ['Manuel Carvalho'] })

    // Verify game state still valid
    expectValidState(game)

    game.log('Turn 1 complete: Bob owns Manuel for $25')
  })
})
```

---

## Critical Game Rules to Enforce

### Money Rules

1. **Player-to-player auctions conserve total money** (winner pays auctioneer)
2. **Auctioneer wins own auction → pays BANK** (total player money decreases)
3. **Bank sales increase total player money** (bank pays players)
4. **Players can reach $0** but game continues (they just can't bid)

### Auction Rules

| Type | Mechanic |
|------|----------|
| **Open** | Bids must exceed current bid, everyone can bid/pass freely, ends when all but highest bidder pass |
| **Hidden** | All players submit secret bids, revealed simultaneously, highest wins. Tiebreaker: auctioneer first, then clockwise |
| **Fixed Price** | Auctioneer sets price, players go clockwise with one chance to buy or pass. If all pass, auctioneer keeps and pays bank |
| **One Offer** | Each player makes exactly one offer (clockwise), auctioneer accepts highest or takes painting at highest+1 paying bank |
| **Double** | Player plays double card, others can offer matching artist card. If offered, both cards auctioned together using second card's auction type |

### Round Rules

1. **5th card of any artist ends round immediately** - that card is NOT auctioned
2. **Round also ends if all players have no cards**
3. **Artist ranking**: Most cards = 1st ($30), 2nd most = $20, 3rd = $10
4. **Tiebreaker**: Board position (Manuel > Sigrid > Daniel > Ramon > Rafael)
5. **Cumulative value**: Artist must be in top 3 THIS round to have any value

### Card Dealing

| Players | Round 1 | Round 2 | Round 3 | Round 4 |
|---------|---------|---------|---------|---------|
| 3 | 10 | 6 | 6 | 0 |
| 4 | 9 | 4 | 4 | 0 |
| 5 | 8 | 3 | 3 | 0 |

---

## Recommended Implementation Order

### Phase 1: Integration Tests Foundation

1. `Round Lifecycle` → `completeRound_cardsDealt_auctionsRun_valueCalculated`
2. `Round Lifecycle` → `5th card rule ends round immediately`
3. `Selling Phase Integration` → `sells paintings at correct value`
4. `Money Conservation` → `conserves total money in player-to-player auctions`

### Phase 2: E2E First Turn

1. `Scenario 1, Round 1, Turn 1` - validates entire helper infrastructure
2. `Scenario 1, Round 1, Turn 2` - different auction type (hidden)
3. `Scenario 1, Round 1, Turn 3` - fixed price auction

### Phase 3: Complete Round 1

4. Implement all 12 turns of Round 1
5. Implement Round 1 valuation and selling
6. Implement Round 1 state verification

### Phase 4: Remaining Rounds

7. Rounds 2-4 with cumulative value testing
8. Game end and winner determination

### Phase 5: Edge Cases

9. All edge case scenarios
10. Other player count scenarios (3, 5 players)

---

## Testing Commands

```bash
# Run all integration tests
npm test -- --run src/engine/__tests__/integration/

# Run all E2E tests
npm test -- --run src/engine/__tests__/e2e/

# Run specific test file
npm test -- --run src/engine/__tests__/e2e/complete-game.test.ts

# Run with verbose output
npm test -- --run --reporter=verbose src/engine/__tests__/e2e/

# Run single test by name
npm test -- --run -t "Turn 1: Alice plays Manuel"
```

---

## Success Criteria

### Integration Tests Pass When:

- [ ] All module interactions produce correct combined state
- [ ] Money is conserved/tracked correctly through operations
- [ ] State transitions follow correct phase machine
- [ ] Invariants hold after every operation

### E2E Tests Pass When:

- [ ] Complete 4-round games execute without errors
- [ ] Every dollar is accounted for at every step
- [ ] Every card is tracked (hand → auction → purchase → sale)
- [ ] Winner is correctly determined
- [ ] All auction types work in real game context
- [ ] Edge cases (ties, bankruptcy, early end) handled correctly

---

## Reference Files

If anything is unclear during implementation, check these source files:

| Topic | File |
|-------|------|
| Auction rules | `src/engine/auction/*.ts` |
| Money flow | `src/engine/money.ts` → `processAuctionPayment` |
| Round end | `src/engine/round.ts` → `shouldRoundEnd`, `endRound` |
| Valuation | `src/engine/valuation.ts` → `rankArtists`, `calculatePaintingValue` |
| Game constants | `src/engine/constants.ts` |
| Type definitions | `src/types/game.ts`, `src/types/auction.ts` |

---

## Existing Test References

Look at these existing tests for patterns:

| File | What It Demonstrates |
|------|---------------------|
| `unit/money.test.ts` | Clean unit test structure, assertion patterns |
| `unit/auction/open.test.ts` | Auction testing patterns |
| `integration/auction-execution.test.ts` | How to test auction + money together |
| `unit/game.test.ts` | Game state testing patterns |

---

## Summary

The scaffolding defines **WHAT** to test (51 integration + 47 E2E = 98 total tests).

The helpers provide **HOW** to test it (GameRunner, assertion helpers, auction runners).

This document explains **WHY** each piece matters and the order to tackle them.

**Start with Integration Tests Phase 1, then E2E Phase 2.** This validates the foundation before building up the complete game scenarios.
