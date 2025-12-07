# Development Guidelines - Modern Art Board Game

**Purpose**: Step-by-step development guide that follows the Implementation Plan phases
**Philosophy**: Build incrementally. Test continuously. Ship quality.

---

## Quick Reference: What to Build First

**Development Order**:
1. Project Setup (Phase 1)
2. Player Setup System (Phase 1.0)
3. Core Types & Constants (Phase 1.1-1.2)
4. Deck Management (Phase 1.3)
5. Artist Valuation (Phase 1.4)
6. Auction Engines (Phase 1.5)
7. Round Management (Phase 1.6)
8. Game Flow (Phase 1.7)
9. AI Players (Phase 2)
10. UI Shell (Phase 3)
11. Polish (Phase 4)

Each phase builds on the previous. Don't skip ahead!

---

## Phase 1: Project Setup ✅ COMPLETED

**Corresponds to**: IMPLEMENTATION_PLAN Phase 1 (start)

**Deliverables**:
- [x] Initialize Vite + React + TypeScript
- [x] Configure Tailwind CSS
- [x] Set up ESLint + Prettier
- [x] Configure Vitest for testing
- [x] Create folder structure

**Commands**:
```bash
npm create vite@latest modern-art-game -- --template react-ts
cd modern-art-game
npm install
npm install -D tailwindcss postcss autoprefixer @types/node
npx tailwindcss init -p
npm install -D eslint @typescript-eslint/eslint-plugin prettier
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**Folder Structure**:
```
src/
├── components/
│   ├── game/
│   ├── auction/
│   ├── ui/
│   └── screens/
├── engine/          # Pure game logic
├── ai/              # AI strategies
├── store/           # State management
├── types/           # TypeScript types
└── assets/          # Images, sounds
```

**Checkpoint**: ✅ `npm run dev` shows blank React app, `npm test` runs (0 tests)

---

## Phase 1.0: Player Selection & Game Setup ✅ COMPLETED

**Corresponds to**: IMPLEMENTATION_PLAN Phase 1.0

**Deliverables**:
- [x] Player count selection (3-5 players) - Types defined
- [x] Player configuration slots (Human/AI) - Interfaces created
- [x] AI difficulty selection - Types defined
- [x] Game creation validation - Validation logic implemented
- [ ] Start game functionality - UI pending (Phase 3)

**Key Files**:
- [x] `src/types/setup.ts` - Setup interfaces and validation logic
- [ ] `src/components/screens/GameSetup.tsx` - Main setup component
- [ ] `src/components/setup/PlayerCountSelector.tsx`
- [ ] `src/components/setup/PlayerSlot.tsx`

**Tests**:
- [x] Validation logic for player configuration
- [ ] UI component tests pending implementation

**Manual Test**: Validation logic tested via test suite

**Checkpoint**: ✅ Types and validation logic complete, UI pending

---

## Phase 1.1-1.2: Core Types & Constants ✅ COMPLETED

**Corresponds to**: IMPLEMENTATION_PLAN Phase 1.1-1.2

**Deliverables**:
- [x] All game types defined
- [x] Artists and auction type constants
- [x] Game state interfaces
- [x] Player interfaces
- [x] Auction state types

**Key Files**:
- [x] `src/types/game.ts` - All game interfaces
- [x] `src/types/auction.ts` - Auction state types
- [x] `src/types/setup.ts` - Setup interfaces
- [x] `src/engine/constants.ts` - Game constants

**Constants Defined**:
```typescript
// Artists in board order (for tie-breaking)
const ARTISTS = [
  'Manuel Carvalho',   // Priority 1 (wins ties)
  'Sigrid Thaler',     // Priority 2
  'Daniel Melim',      // Priority 3
  'Ramon Martins',     // Priority 4
  'Rafael Silveira',   // Priority 5 (loses ties)
] as const;

// Card distribution
const CARD_DISTRIBUTION = {
  'Manuel Carvalho': 12,
  'Sigrid Thaler': 13,
  'Daniel Melim': 15,
  'Ramon Martins': 15,
  'Rafael Silveira': 15,
};
```

**Tests**:
- [x] TypeScript compiles without errors
- [x] Constants match rulebook values
- [x] All interfaces are properly typed

**Checkpoint**: ✅ All types importable and working

---

## Phase 1.3: Deck Management ✅ COMPLETED

**Corresponds to**: IMPLEMENTATION_PLAN Phase 1.3

**Deliverables**:
- [x] `engine/deck.ts` with deck functions
- [x] Card creation with proper distribution
- [x] Shuffle algorithm
- [x] Deal cards based on player count and round

**Key Functions**:
```typescript
function createDeck(): Card[]
function shuffleDeck(deck: Card[]): Card[]
function dealCards(deck: Card[], playerCount: number, round: number): Card[][]
```

**Tests**:
- [x] `createDeck()` returns exactly 70 cards
- [x] Card distribution matches: Manuel=12, Sigrid=13, Daniel=15, Ramon=15, Rafael=15
- [x] `shuffleDeck()` produces different orders
- [x] `dealCards()` respects player count and round:
  - 3 players: [10, 6, 6, 0] cards per round
  - 4 players: [9, 4, 4, 0] cards per round
  - 5 players: [8, 3, 3, 0] cards per round

**Manual Test**: Console log deck, verify distribution and shuffling

**Checkpoint**: ✅ Can create, shuffle, and deal cards correctly

---

## Phase 1.4: Artist Valuation ✅ COMPLETED

**Corresponds to**: IMPLEMENTATION_PLAN Phase 1.4

**Deliverables**:
- [x] `engine/valuation.ts` - Artist ranking and value calculation
- [x] Tie-breaking by board position
- [x] Cumulative value calculation

**Key Functions**:
```typescript
function rankArtists(cardsPlayed: Record<Artist, number>): ArtistRoundResult[]
function calculatePaintingValue(board: GameBoard, artist: Artist, round: number): number
```

**Critical Rules**:
1. **Ranking**: Highest card count wins
2. **Tie-breaker**: Board position (Manuel > Rafael)
3. **Payout**: Top 3 get 30/20/10, others get 0
4. **Cumulative**: Only if top 3 THIS round

**Tests**:
- [x] Clear winner (highest count gets 30k)
- [x] Tie-breaker by board position
- [x] Top 3 get correct values
- [x] Not in top 3 = 0 value (even with history)
- [x] Cumulative stacks correctly when in top 3

**Manual Test**: Debug UI showing artist counts → rankings

**Checkpoint**: ✅ Valuation matches rulebook exactly (13 tests passing)

---

## Phase 1.5: Auction Engines

**Corresponds to**: IMPLEMENTATION_PLAN Phase 1.5

**Deliverables**: Implement each auction type in separate files
- [ ] `engine/auction/open.ts` - Open auction state machine
- [ ] `engine/auction/oneOffer.ts` - One offer auction
- [ ] `engine/auction/hidden.ts` - Hidden auction
- [ ] `engine/auction/fixedPrice.ts` - Fixed price auction
- [ ] `engine/auction/double.ts` - Double auction (most complex)

### Open Auction Tests:
- [ ] Any player can bid anytime
- [ ] Bid must exceed current high bid
- [ ] Cannot bid more than own money
- [ ] No bids → auctioneer gets free
- [ ] Auctioneer wins → pays bank

### One Offer Tests:
- [ ] Turn order: left of auctioneer → clockwise → auctioneer last
- [ ] Each player gets one chance to bid or pass
- [ ] Must bid higher than current
- [ ] No bids → auctioneer gets free

### Hidden Auction Tests:
- [ ] All players submit simultaneously
- [ ] Bids hidden until all submitted
- [ ] Highest bid wins
- [ ] Tie-breaker: auctioneer wins if tied
- [ ] Tie-breaker: closest clockwise from auctioneer
- [ ] All bid 0 → auctioneer gets free

### Fixed Price Tests:
- [ ] Auctioneer sets price ≤ own money
- [ ] Turn order: left of auctioneer → clockwise
- [ ] First buyer wins at fixed price
- [ ] All pass → auctioneer MUST buy

### Double Auction Tests:
- [ ] Auctioneer can offer second card (same artist, not Double)
- [ ] If declined, offer passes left clockwise
- [ ] Another player offers → they become auctioneer, get money
- [ ] No one offers → original auctioneer gets Double free
- [ ] Auction type = second card's type
- [ ] Winner gets both cards
- [ ] Next turn = left of final auctioneer

**Manual Test**: Debug UI with bid buttons for each auction type

**Checkpoint**: All auction types fully functional with correct rules

---

## Phase 1.6: Round Management

**Corresponds to**: IMPLEMENTATION_PLAN Phase 1.6

**Deliverables**:
- [ ] `engine/round.ts` - Round flow and end conditions
- [ ] Track cards played per artist
- [ ] Handle round-ending scenarios
- [ ] Deal with unsold cards

**Critical Rules**:
1. **5th card ends round**
2. **5th card is not auctioned**
3. **5th as Double first** → immediate end
4. **5th as Double second** → both unsold
5. **Unsold cards count for ranking**

**Tests**:
- [ ] 5th card of any artist ends round
- [ ] 5th card not auctioned, counts for ranking
- [ ] 5th as first of Double → immediate end
- [ ] 5th as second of Double → both unsold
- [ ] Empty hand → player skipped for auction, can still bid
- [ ] All players empty → round ends

**Manual Test**: Play through a round, trigger various end conditions

**Checkpoint**: Round lifecycle complete with all edge cases

---

## Phase 1.7: Game Flow

**Corresponds to**: IMPLEMENTATION_PLAN Phase 1.7

**Deliverables**:
- [ ] `engine/game.ts` - 4-round game management
- [ ] Dealing between rounds
- [ ] Winner determination
- [ ] Early game end handling

**Key Functions**:
```typescript
function startGame(setup: GameSetup): GameState
function nextRound(game: GameState): GameState
function endGame(game: GameState): GameState
function getWinner(game: GameState): Player | null
```

**Tests**:
- [ ] Correct cards dealt per round per player count
- [ ] Cards in hand persist between rounds
- [ ] Paintings sold and discarded each round
- [ ] After round 4, highest money wins
- [ ] Early game end if all cards exhausted

**Manual Test**: Play full 4-round game with debug UI

**Checkpoint**: Complete game playable (no AI yet)

---

## Phase 2: AI Players

**Corresponds to**: IMPLEMENTATION_PLAN Phase 2

**Deliverables**:
- [ ] `ai/strategies/easy.ts` - Random valid moves
- [ ] `ai/strategies/medium.ts` - Expected value based
- [ ] `ai/strategies/hard.ts` - Strategic play
- [ ] AI decision framework

### Easy AI Tests:
- [ ] Always returns valid bid (within money)
- [ ] Always returns valid card to play
- [ ] Never crashes on any game state

### Medium AI Tests:
- [ ] Bids proportional to expected value
- [ ] Makes sensible card choices
- [ ] Completes games without errors

### Hard AI Tests:
- [ ] Makes non-obvious strategic moves
- [ ] Attempts market manipulation
- [ ] Considers opponent positions

**Manual Test**: Play full games vs each AI difficulty

**Checkpoint**: All AI difficulties working and provide different challenge levels

---

## Phase 3: UI Shell

**Corresponds to**: IMPLEMENTATION_PLAN Phase 3

**Deliverables**:
- [ ] Game table layout
- [ ] Player hand display (fanned cards)
- [ ] Artist board (value tiles)
- [ ] Auction area
- [ ] Money display (hidden for opponents)
- [] Basic game state visualization

**Components**:
- `GameTable.tsx` - Main play area
- `PlayerHand.tsx` - Card fan display
- `ArtistBoard.tsx` - Value tiles
- `AuctionArea.tsx` - Current auction
- `PlayerInfo.tsx` - Name, money, turn indicator

**Tests**:
- [ ] Components render without error
- [ ] State displayed correctly
- [ ] Interactive elements work

**Manual Test**: Playable hot-seat mode (pass device to human players)

**Checkpoint**: Complete game playable with UI

---

## Phase 4: Polish

**Corresponds to**: IMPLEMENTATION_PLAN Phase 4 (basic polish)

**Deliverables**:
- [ ] Card animations (Framer Motion)
- [ ] Bid animations
- [ ] Sound effects (optional)
- [ ] Responsive design
- [ ] Visual feedback for actions

**Tests**:
- [ ] Animations don't break functionality
- [ ] Works on mobile viewport (minimum 320px width)
- [ ] Touch targets 44px+ on mobile
- [ ] No performance issues

**Manual Test**: Full game with polish, feels responsive

**Checkpoint**: Ready for user testing

---

## Engineering Principles

### Code Quality
- **Type everything** - No `any` types
- **Pure functions first** - Game logic should be pure
- **Single responsibility** - Each module does one thing well
- **Fail fast** - Validate inputs early
- **No magic numbers** - Use named constants

### Architecture
- **Separate concerns** - Engine knows nothing about React
- **State is immutable** - Never mutate game state
- **Events for side effects** - UI animations triggered by events
- **Dependency injection** - Pass dependencies explicitly

### Testing
- **Test behavior, not implementation**
- **Edge cases first** - Test boundaries before happy path
- **No mocks for pure functions**
- **Readable test names** - Describe what's being tested

---

## Git Workflow

```bash
# Branch naming
feature/player-setup
feature/auction-open
feature/ai-medium

# Commit format
feat: add player configuration UI
fix: resolve hidden auction tie-breaking
test: add deck management tests
refactor: extract auction validation logic

# Never commit broken tests
# Each feature should be PR-able when complete
```

---

## Definition of Done

A feature is **done** when:
- [ ] Code complete and typed
- [ ] Unit tests written and passing
- [ ] Manual testing performed
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Works in debug UI
- [ ] Game flow tested end-to-end

---

## Quick Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build

# Testing
npm test             # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report

# Code quality
npm run lint         # ESLint
npm run typecheck    # TypeScript check
npm run format       # Prettier
```

---

## Debug Mode

Add a debug panel (dev mode only) showing:
- Current phase and round
- Player money (hidden in real game)
- Artist counts this round
- Force round end button
- Deal cards button
- Set money button

This helps verify game rules during development.