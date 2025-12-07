# Development & Implementation Guidelines

## Development Philosophy

**Build incrementally. Test continuously. Ship quality.**

Each feature should be:
1. Implemented in isolation
2. Unit tested
3. Manually testable via debug UI
4. Reviewed before moving on

---

## Engineering Principles

### Code Quality

- **Type everything** - No `any` types. TypeScript strict mode enabled.
- **Pure functions first** - Game engine logic should be pure (input → output, no side effects).
- **Single responsibility** - Each module does one thing well.
- **Fail fast** - Validate inputs early, throw descriptive errors.
- **No magic numbers** - Use named constants.

### Architecture

- **Separate concerns** - Engine (logic) knows nothing about React. UI knows nothing about rules.
- **State is immutable** - Never mutate game state. Return new state objects.
- **Events for side effects** - UI animations triggered by events, not state diffing.
- **Dependency injection** - Pass dependencies explicitly for testability.

### Testing

- **Test behavior, not implementation** - Tests should survive refactors.
- **Edge cases first** - Write tests for boundary conditions before happy path.
- **No mocks for pure functions** - If you need mocks, reconsider the design.
- **Readable test names** - `"auctioneer wins hidden auction tie"` not `"test case 7"`.

---

## UI/UX Design Principles

### Visual Hierarchy

- **Primary action prominent** - Current player's action button should be obvious.
- **State visible at glance** - Round, turn, money, artist values always visible.
- **Progressive disclosure** - Show details on hover/tap, not all at once.

### Feedback

- **Every action acknowledged** - Visual + optional audio feedback.
- **Transitions, not teleports** - Cards move, don't just appear.
- **Loading states** - Even for fast operations (AI "thinking").

### Accessibility

- **Color not sole indicator** - Use icons/text alongside color.
- **Keyboard navigable** - Tab order makes sense.
- **Readable contrast** - WCAG AA minimum.

### Mobile Considerations

- **Touch targets 44px+** - Fingers are imprecise.
- **No hover-dependent UI** - Hover is a bonus, not requirement.
- **Landscape orientation** - Board games work better wide.

---

## Implementation Phases

Each phase has a **checkpoint** - don't proceed until tests pass and manual testing complete.

### Phase 1: Project Setup

**Deliverables:**
- [ ] Vite + React + TypeScript project initialized
- [ ] Tailwind CSS configured
- [ ] ESLint + Prettier configured
- [ ] Vitest configured for unit tests
- [ ] Folder structure created per IMPLEMENTATION_PLAN.md

**Checkpoint:** `npm run dev` shows blank app, `npm test` runs (0 tests).

---

### Phase 2: Core Types & Constants

**Deliverables:**
- [ ] `engine/types.ts` - All game types
- [ ] `engine/constants.ts` - Artists, auction types, card distribution

**Tests:**
- [ ] Type compilation passes
- [ ] Constants match rulebook values

**Checkpoint:** Types importable, no runtime code yet.

---

### Phase 3: Deck Management

**Deliverables:**
- [ ] `engine/deck.ts` - `createDeck()`, `shuffleDeck()`, `dealCards()`

**Tests:**
- [ ] `createDeck()` returns 70 cards
- [ ] Card distribution matches: Manuel=12, Sigrid=13, Daniel=15, Ramon=15, Rafael=15
- [ ] `shuffleDeck()` randomizes order
- [ ] `dealCards()` respects player count and round

**Manual Test:** Console log deck, verify distribution.

**Checkpoint:** Can create, shuffle, and deal a deck correctly.

---

### Phase 4: Artist Valuation

**Deliverables:**
- [ ] `engine/valuation.ts` - `rankArtists()`, `calculatePaintingValue()`

**Tests:**
- [ ] Ranking: highest card count wins
- [ ] Tie-breaker: board position (Manuel > Rafael)
- [ ] Top 3 get 30/20/10, others get 0
- [ ] Cumulative value: only if top 3 THIS round
- [ ] Zero cards = not ranked

**Manual Test:** Debug UI showing artist counts → rankings.

**Checkpoint:** Valuation matches rulebook examples exactly.

---

### Phase 5: Auction Engine - Open

**Deliverables:**
- [ ] `engine/auction/open.ts` - State machine for open auction

**Tests:**
- [ ] Any player can bid
- [ ] Bid must exceed current high bid
- [ ] Cannot bid more than own money
- [ ] No bids → auctioneer gets free
- [ ] Auctioneer wins → pays bank
- [ ] Winner pays auctioneer (if not self)

**Manual Test:** Debug UI with bid buttons, see state changes.

**Checkpoint:** Open auction fully functional.

---

### Phase 6: Auction Engine - One Offer

**Deliverables:**
- [ ] `engine/auction/oneOffer.ts`

**Tests:**
- [ ] Turn order: left of auctioneer → clockwise → auctioneer last
- [ ] Each player: one chance to bid or pass
- [ ] Must bid higher than current
- [ ] No bids → auctioneer gets free

**Manual Test:** Step through turn order visually.

**Checkpoint:** One offer auction fully functional.

---

### Phase 7: Auction Engine - Hidden

**Deliverables:**
- [ ] `engine/auction/hidden.ts`

**Tests:**
- [ ] All players submit simultaneously
- [ ] Bids hidden until all submitted
- [ ] Highest bid wins
- [ ] Tie-breaker: auctioneer wins if tied
- [ ] Tie-breaker: else closest clockwise from auctioneer
- [ ] All bid 0 → auctioneer gets free

**Manual Test:** Submit bids, verify reveal + winner selection.

**Checkpoint:** Hidden auction with correct tie-breaking.

---

### Phase 8: Auction Engine - Fixed Price

**Deliverables:**
- [ ] `engine/auction/fixedPrice.ts`

**Tests:**
- [ ] Auctioneer sets price ≤ own money
- [ ] Turn order: left of auctioneer → clockwise
- [ ] First buyer wins at fixed price
- [ ] All pass → auctioneer MUST buy

**Manual Test:** Set various prices, test pass scenarios.

**Checkpoint:** Fixed price auction fully functional.

---

### Phase 9: Auction Engine - Double

**Deliverables:**
- [ ] `engine/auction/double.ts`

**Tests:**
- [ ] Auctioneer can offer second card (same artist, not Double)
- [ ] If declined, offer passes left clockwise
- [ ] Another player offers → they become auctioneer, get money
- [ ] No one offers → original auctioneer gets Double free
- [ ] Auction type = second card's type
- [ ] Winner gets both cards
- [ ] Next turn = left of final auctioneer

**Manual Test:** Full double auction flow with auctioneer transfer.

**Checkpoint:** Double auction with all edge cases.

---

### Phase 10: Round Management

**Deliverables:**
- [ ] `engine/round.ts` - Round flow, end conditions

**Tests:**
- [ ] 5th card of any artist ends round
- [ ] 5th card not auctioned, counts for ranking
- [ ] 5th as first of Double → immediate end
- [ ] 5th as second of Double → both unsold
- [ ] Empty hand → player skipped for auction, can still bid
- [ ] All players empty → round ends

**Manual Test:** Play through a round, trigger various end conditions.

**Checkpoint:** Round lifecycle complete.

---

### Phase 11: Game Flow

**Deliverables:**
- [ ] `engine/game.ts` - 4-round game, dealing between rounds, winner

**Tests:**
- [ ] Correct cards dealt per round per player count
- [ ] Cards in hand persist between rounds
- [ ] Paintings sold and discarded each round
- [ ] After round 4, highest money wins
- [ ] Early game end if all cards exhausted

**Manual Test:** Play full 4-round game with debug UI.

**Checkpoint:** Complete game playable (no AI yet).

---

### Phase 12: Basic UI Shell

**Deliverables:**
- [ ] Game table layout
- [ ] Player hand display
- [ ] Artist board (value tiles)
- [ ] Auction area
- [ ] Money display

**Tests:**
- [ ] Components render without error
- [ ] State displayed correctly

**Manual Test:** UI reflects game state changes.

**Checkpoint:** Playable hot-seat mode (pass device).

---

### Phase 13: AI - Easy

**Deliverables:**
- [ ] `ai/strategies/easy.ts` - Random valid moves

**Tests:**
- [ ] Always returns valid bid (within money)
- [ ] Always returns valid card to play
- [ ] Never crashes on any game state

**Manual Test:** Play vs 1 Easy AI, game completes.

**Checkpoint:** Single player vs AI works.

---

### Phase 14: AI - Medium & Hard

**Deliverables:**
- [ ] `ai/strategies/medium.ts` - Expected value based
- [ ] `ai/strategies/hard.ts` - Strategic play

**Tests:**
- [ ] Medium bids proportional to expected value
- [ ] Hard makes non-obvious strategic moves
- [ ] Both complete games without errors

**Manual Test:** Play full games, observe AI behavior.

**Checkpoint:** All AI difficulties working.

---

### Phase 15: Polish

**Deliverables:**
- [ ] Animations (Framer Motion)
- [ ] Sound effects
- [ ] Tutorial overlay
- [ ] Responsive design

**Tests:**
- [ ] Animations don't break functionality
- [ ] Works on mobile viewport

**Manual Test:** Full game with polish, feels good.

**Checkpoint:** Ready for user testing.

---

## Debug UI Requirements

Build a debug panel (dev mode only) that shows:

```
┌─────────────────────────────────────┐
│ DEBUG PANEL                    [x]  │
├─────────────────────────────────────┤
│ Phase: auction                      │
│ Round: 2/4                          │
│ Current Player: 1 (Alice)           │
│ Auctioneer: 0 (You)                 │
├─────────────────────────────────────┤
│ Artist Counts This Round:           │
│  Manuel: 2  Sigrid: 3  Daniel: 1    │
│  Ramon: 4   Rafael: 2               │
├─────────────────────────────────────┤
│ Player Money (hidden in real game): │
│  You: 85k  Alice: 72k  Bob: 91k     │
├─────────────────────────────────────┤
│ [Force Round End] [Deal Cards]      │
│ [Set Money] [Add Card to Hand]      │
└─────────────────────────────────────┘
```

---

## Git Workflow

```
main          Always deployable
  └── dev     Integration branch
       ├── feature/deck-manager
       ├── feature/open-auction
       └── feature/ai-easy
```

- **Commits:** Small, atomic, descriptive messages
- **PRs:** One phase = one PR (roughly)
- **No broken tests on dev/main**

---

## Definition of Done

A feature is **done** when:

- [ ] Code complete and typed
- [ ] Unit tests written and passing
- [ ] Manual testing performed
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Works in debug UI
- [ ] Code reviewed (if team)

---

## Quick Reference: Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- deck.test.ts

# Run with coverage
npm run test:coverage

# Type check
npm run typecheck

# Lint
npm run lint
```

---

## Quick Reference: Manual Test Scenarios

### Auction Scenarios to Test

1. **No bids placed** - Verify auctioneer gets card free
2. **Auctioneer wins** - Verify payment to bank
3. **All tied in hidden** - Verify correct winner
4. **Fixed price all pass** - Verify auctioneer forced buy
5. **Double with transfer** - Verify new auctioneer gets money

### Round End Scenarios

1. **5th card played normally** - Round ends, card unsold
2. **5th card as Double first** - Immediate end
3. **5th card as Double second** - Both unsold
4. **Player runs out of cards** - Skipped but can bid

### Valuation Scenarios

1. **Clear winner** - Highest count gets 30k
2. **Two-way tie** - Board position breaks it
3. **Artist not top 3** - Worth 0 even with history
4. **Cumulative across rounds** - Values stack correctly
