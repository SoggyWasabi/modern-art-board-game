# Staff Engineer Peer Review: Modern Art Online Implementation Plan

**Reviewer**: Staff Engineer
**Date**: 2025-12-07
**Status**: Review Complete - Revisions Recommended

---

## Executive Summary

The implementation plan provides a solid foundation but has **critical gaps in game rule accuracy**, **missing state machine complexity**, and **underestimates auction type nuances**. This review identifies issues that would cause bugs in production and recommends architectural improvements.

**Overall Assessment**: 🟡 Needs Work Before Implementation

---

## Critical Issues (Must Fix)

### 1. ❌ Incomplete Double Auction State Machine

**Problem**: The plan oversimplifies Double Auction, which has the most complex state flow in the game.

**What the rules actually say**:
1. Auctioneer plays Double card
2. Auctioneer MAY play a second card (same artist, non-Double)
3. If auctioneer doesn't, it passes LEFT around the table
4. If someone else plays the second card, THEY become the new auctioneer
5. The auction type is determined by the SECOND card
6. The NEW auctioneer receives ALL the money (original player gets nothing)
7. If NO ONE plays a second card, auctioneer gets Double card FREE
8. Next turn starts LEFT of the NEW auctioneer (players in between lose their turn)

**Missing from plan**:
- No state for "waiting for second card offer"
- No tracking of "players who passed on double"
- No handling of auctioneer transfer
- No handling of skipped players

**Recommended State Machine**:

```typescript
type DoubleAuctionPhase =
  | { type: 'awaiting_second_card'; offeringPlayer: number; passedPlayers: number[] }
  | { type: 'auction_in_progress'; primaryAuctioneer: number; secondaryAuctioneer: number; auctionType: AuctionType }
  | { type: 'resolved_free'; recipient: number }
```

---

### 2. ❌ Artist Ranking Tie-Breaker Is Wrong

**Plan says**: "ties go clockwise to auctioneer"

**Rules actually say**: "the artist who is closer to the LEFT side of the game board (closest to Manuel) is ranked better"

**Board order (left to right)**:
1. Manuel Carvalho
2. Sigrid Thaler
3. Daniel Melim
4. Ramon Martins
5. Rafael Silveira

This is a **static priority**, not relative to any player. This affects valuation calculations significantly.

**Fix**:

```typescript
const ARTIST_PRIORITY: Record<Artist, number> = {
  'Manuel Carvalho': 1,  // Highest priority in ties
  'Sigrid Thaler': 2,
  'Daniel Melim': 3,
  'Ramon Martins': 4,
  'Rafael Silveira': 5,  // Lowest priority in ties
};
```

---

### 3. ❌ Round End Trigger Missing Edge Cases

**Plan says**: "Round ends when 5th painting of any artist is played"

**Rules specify additional cases**:

1. If 5th card is played as FIRST card of Double Auction → round ends immediately, no second card played
2. If 5th card is played as SECOND card of Double Auction → BOTH cards are unsold, round ends
3. If ALL players run out of cards before round 4 ends → that round ends when final card is played

**Missing state tracking**:

```typescript
interface RoundState {
  artistCardCounts: Record<Artist, number>;  // Cards PLAYED this round (not just sold)
  isRoundEnding: boolean;
  unsoldCards: Card[];  // Can be 1 or 2 cards
}
```

---

### 4. ❌ Hidden Auction Tie-Breaker Is Incomplete

**Plan says**: "ties go clockwise to auctioneer"

**Rules actually say**:
- "If two or more players tie for the highest bid, the player sitting closest to the auctioneer in CLOCKWISE order wins"
- "If the auctioneer is one of the players who tied for the highest bid, then THEY buy the painting"

The auctioneer has **special priority** in ties - they win even if others are closer clockwise.

**Fix**:

```typescript
function resolveHiddenAuctionTie(
  tiedPlayers: number[],
  auctioneer: number
): number {
  // Auctioneer always wins ties they're part of
  if (tiedPlayers.includes(auctioneer)) {
    return auctioneer;
  }
  // Otherwise, closest clockwise from auctioneer
  return tiedPlayers.reduce((closest, player) => {
    const distClosest = clockwiseDistance(auctioneer, closest, playerCount);
    const distPlayer = clockwiseDistance(auctioneer, player, playerCount);
    return distPlayer < distClosest ? player : closest;
  });
}
```

---

### 5. ❌ Missing "Unsold Painting" Counting

**Problem**: The plan conflates "sold paintings" with "played paintings" for artist ranking.

**Rules say**: "Be sure to include any unsold paintings that were played to end the round, even though they were never sold."

The 5th card (and potentially a 6th if it was part of a Double) counts toward artist ranking even though no one owns it.

**Impact**: Artist rankings would be wrong at end of round.

---

### 6. ❌ Cumulative Value Logic Incomplete

**Plan mentions it but doesn't specify the critical rule**:

"Paintings by artists who do not rank in the top three are still worthless, even if they have Artist Value tiles from previous rounds."

**Example from rules**:
- Round 1: Rafael gets 30k (1st place)
- Round 2: Rafael gets 10k (3rd place) → paintings worth 40k (30+10)
- Round 3: Rafael gets 0 (not top 3) → paintings worth **0** (not 40k!)
- Round 4: Rafael gets 20k (2nd place) → paintings worth **60k** (30+10+20)

The artist must be in top 3 THIS round to activate their cumulative value.

---

## High Priority Issues

### 7. 🟠 GameState Phase Model Too Simple

**Current**:
```typescript
phase: 'auction' | 'selling' | 'dealing' | 'gameOver'
```

**Should be**:
```typescript
type GamePhase =
  | { type: 'dealing' }
  | { type: 'awaiting_card_play'; currentPlayer: number }
  | { type: 'auction_in_progress'; auction: AuctionState }
  | { type: 'double_awaiting_second'; ... }
  | { type: 'round_ending'; unsoldCards: Card[] }
  | { type: 'selling_to_bank' }
  | { type: 'between_rounds' }
  | { type: 'game_over'; winner: number; finalScores: Map<number, number> }
```

---

### 8. 🟠 AuctionState Missing Per-Type Fields

Different auction types need different state:

```typescript
type AuctionState =
  | {
      type: 'open';
      card: Card;
      auctioneer: number;
      currentHighBid: number | null;
      currentHighBidder: number | null;
      // No turn order - anyone can bid
    }
  | {
      type: 'one_offer';
      card: Card;
      auctioneer: number;
      currentPlayer: number;  // Whose turn to bid
      currentHighBid: number | null;
      currentHighBidder: number | null;
      passedPlayers: number[];
    }
  | {
      type: 'hidden';
      card: Card;
      auctioneer: number;
      submittedBids: Map<number, number>;  // Hidden until all submit
      revealedBids: Map<number, number> | null;  // After reveal
    }
  | {
      type: 'fixed_price';
      card: Card;
      auctioneer: number;
      fixedPrice: number;
      currentPlayer: number;
      passedPlayers: number[];
    }
  | {
      type: 'double';
      primaryCard: Card;
      secondaryCard: Card | null;
      phase: DoubleAuctionPhase;
      // ... nested auction state once type is known
    }
```

---

### 9. 🟠 Missing "Player Out of Cards" Handling

**Rules say**: "If a player runs out of cards during a round, they cannot auction any more paintings until they get new cards between rounds. They may still bid."

**Current plan**: TurnManager mentions "handle skips" but no explicit state.

**Need**:
```typescript
interface Player {
  // ...existing fields
  canAuction: boolean;  // false if hand is empty
}

// Turn logic must skip players with empty hands for auctioning
// but still include them in bidding rounds
```

---

### 10. 🟠 Open Auction Needs Timeout/Confirmation

**Problem**: Open auction has no natural ending in digital form.

**Physical game**: Auctioneer says "Going once, going twice, sold!"

**Digital solutions**:
1. **Inactivity timer**: If no new bid in X seconds, auction ends
2. **Pass button**: All players must explicitly pass
3. **"Call it" button**: Auctioneer can end when they feel no more bids coming
4. **Countdown after each bid**: 5-second countdown resets on new bid

**Recommendation**: Option 4 (countdown) matches physical game feel best.

---

### 11. 🟠 Money Visibility Rules Not Enforced

**Rules say**: "None must know how much money the other players have until the end of the game."

**Implications for UI/State**:
- Other players' money should be hidden in game state sent to clients
- Only at game end should all money be revealed
- This affects what AI "knows" - should AI cheat and see money, or play fair?

**Recommendation**: Create separate "public game state" and "private player state" views.

---

## Medium Priority Issues

### 12. 🟡 Card Distribution Verification

The plan lists 70 cards total:
- Manuel Carvalho: 12
- Sigrid Thaler: 13
- Daniel Melim: 15
- Ramon Martins: 15
- Rafael Silveira: 15

**Total**: 12 + 13 + 15 + 15 + 15 = **70** ✅

But need to verify auction type distribution per artist. The rules don't specify exact breakdown - will need to either:
1. Research the actual game's distribution
2. Create a balanced distribution ourselves

---

### 13. 🟡 AI Decision Timing for Open Auction

**Problem**: Open Auction allows bidding "in any order". How does AI participate?

**Options**:
1. AI bids immediately when it wants to
2. AI waits a randomized delay to feel more human
3. AI uses a strategy pattern (aggressive = fast, cautious = slow)

**Recommendation**: Add "AI personality" traits including bid timing.

---

### 14. 🟡 3-Player Variant Complexity

The "Mystery Player" variant adds significant complexity:
- Extra hand dealt but hidden
- Player can optionally reveal mystery card after their auction
- Mystery card counts for rankings but isn't auctioned

**Recommendation**: Defer to post-MVP. Core game works fine with 3 players without this variant.

---

### 15. 🟡 Undo/History System Not Mentioned

For debugging and potential "undo" features:

```typescript
interface GameHistory {
  actions: GameAction[];
  snapshots: GameState[];  // Periodic snapshots for efficient replay
}

type GameAction =
  | { type: 'play_card'; player: number; card: Card }
  | { type: 'place_bid'; player: number; amount: number }
  | { type: 'pass'; player: number }
  | { type: 'set_fixed_price'; player: number; amount: number }
  | { type: 'offer_double_card'; player: number; card: Card }
  | { type: 'decline_double'; player: number }
  // ... etc
```

---

## Architectural Recommendations

### 16. Separate Pure Logic from State Management

**Current plan mixes concerns**:
- GameEngine handles logic AND state
- AuctionEngine handles logic AND state

**Recommended separation**:

```
/engine (pure functions, no state, fully testable)
  ├── rules/
  │   ├── auctionRules.ts      // Pure validation
  │   ├── roundRules.ts        // Round start/end logic
  │   ├── valuationRules.ts    // Artist value calculations
  │   └── cardRules.ts         // Card play validation
  ├── actions/
  │   ├── auctionActions.ts    // State transitions for auctions
  │   └── gameActions.ts       // State transitions for game flow
  └── selectors/
      ├── playerSelectors.ts   // Derived player data
      └── gameSelectors.ts     // Derived game data

/store (state container)
  └── gameStore.ts             // Zustand store, calls engine functions
```

Benefits:
- Engine is 100% unit testable without React
- Can reuse engine for server-side validation later
- Clear separation of concerns

---

### 17. Event-Driven Architecture for Animations

**Problem**: How does UI know when to animate?

**Solution**: Game engine emits events, UI subscribes:

```typescript
type GameEvent =
  | { type: 'card_played'; card: Card; player: number }
  | { type: 'bid_placed'; player: number; amount: number }
  | { type: 'auction_won'; winner: number; amount: number; card: Card }
  | { type: 'round_ended'; rankings: ArtistRanking[] }
  | { type: 'money_transferred'; from: number; to: number | 'bank'; amount: number }
  | { type: 'cards_dealt'; player: number; count: number }

// UI subscribes
gameStore.subscribe((event) => {
  switch (event.type) {
    case 'auction_won':
      animateCardToPlayer(event.card, event.winner);
      animateMoneyTransfer(event.winner, event.amount);
      break;
    // ...
  }
});
```

---

### 18. Testing Strategy Missing

**Recommended test coverage**:

| Layer | Test Type | Coverage Target |
|-------|-----------|-----------------|
| Engine/Rules | Unit tests | 100% of rule edge cases |
| State transitions | Integration tests | All valid state paths |
| AI decisions | Property-based tests | Decisions always valid |
| UI components | Component tests | Key interactions |
| Full game | E2E tests | Complete game flows |

**Critical test cases**:
- [ ] Double auction with all passing → auctioneer gets free
- [ ] Double auction transfers auctioneer correctly
- [ ] 5th card ends round in all scenarios
- [ ] Hidden auction tie-breaking (all combinations)
- [ ] Artist value accumulation across 4 rounds
- [ ] Player runs out of cards mid-round
- [ ] Fixed price auctioneer must buy if all pass

---

## Data Model Revisions

### Revised Core Types

```typescript
// Artists in board order (left to right)
const ARTISTS = [
  'Manuel Carvalho',
  'Sigrid Thaler',
  'Daniel Melim',
  'Ramon Martins',
  'Rafael Silveira'
] as const;
type Artist = typeof ARTISTS[number];

const AUCTION_TYPES = ['open', 'one_offer', 'hidden', 'fixed_price', 'double'] as const;
type AuctionType = typeof AUCTION_TYPES[number];

interface Card {
  id: string;
  artist: Artist;
  auctionType: AuctionType;
  artworkId: string;  // Reference to visual asset
}

interface Player {
  id: string;
  name: string;
  money: number;
  hand: Card[];
  purchasedThisRound: Card[];  // Cleared each round after selling
  isAI: boolean;
  aiDifficulty?: 'easy' | 'medium' | 'hard';
}

interface ArtistRoundResult {
  artist: Artist;
  cardCount: number;  // Including unsold round-enders
  rank: 1 | 2 | 3 | null;  // null if not top 3
  value: 10 | 20 | 30 | 0;  // 0 if not top 3
}

interface GameBoard {
  // Value tiles placed per round, indexed by artist
  // artistValues[artist][round] = value earned that round (or 0)
  artistValues: Record<Artist, [number, number, number, number]>;
}

interface RoundState {
  roundNumber: 1 | 2 | 3 | 4;
  cardsPlayedPerArtist: Record<Artist, number>;
  currentAuctioneerIndex: number;
  phase: RoundPhase;
}

type RoundPhase =
  | { type: 'awaiting_auction'; activePlayer: number }
  | { type: 'auction'; auction: AuctionState }
  | { type: 'round_ended'; unsoldCards: Card[]; results: ArtistRoundResult[] }
  | { type: 'selling' }

interface GameState {
  players: Player[];
  deck: Card[];
  discardPile: Card[];
  board: GameBoard;
  round: RoundState;
  gamePhase: 'setup' | 'playing' | 'finished';
  winner: string | null;
}
```

---

## Summary of Required Changes

### Must Fix Before Implementation

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 1 | Double Auction state machine | Critical | High |
| 2 | Artist tie-breaker (board order, not clockwise) | Critical | Low |
| 3 | Round end edge cases (Double, out of cards) | Critical | Medium |
| 4 | Hidden auction tie-breaker (auctioneer priority) | Critical | Low |
| 5 | Unsold paintings count for rankings | Critical | Low |
| 6 | Cumulative value only if top 3 THIS round | Critical | Low |

### Should Fix

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 7 | Richer GamePhase state machine | High | Medium |
| 8 | Per-auction-type state models | High | Medium |
| 9 | Player out-of-cards handling | High | Low |
| 10 | Open auction ending mechanism | High | Medium |
| 11 | Money visibility rules | High | Medium |

### Nice to Have

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 12 | Verify auction type distribution | Medium | Low |
| 13 | AI timing for Open Auction | Medium | Low |
| 14 | 3-player variant | Low | High |
| 15 | Undo/history system | Medium | Medium |

---

## Conclusion

The original plan captures the high-level structure well but would result in a buggy implementation due to rule inaccuracies. The Double Auction complexity alone warrants significant design work.

**Recommended next steps**:
1. Update data models with revised types above
2. Build comprehensive test suite FIRST (TDD)
3. Implement state machines for each auction type individually
4. Validate against rulebook for every edge case

The good news: once the core engine is correct, the rest of the plan (AI, UI, multiplayer) builds cleanly on top.

---

*Review complete. Ready to discuss any points in detail.*
