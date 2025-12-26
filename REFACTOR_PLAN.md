# Code Duplication Refactor Plan

**Status:** Planning Phase
**Created:** 2025-01-26
**Priority:** HIGH - ~260 lines of duplicated code across multiple files

---

## Problem Summary

### What's Duplicated?

| Component/Code | App.tsx | Card.tsx | cardGenerator.ts | engine/constants.ts |
|----------------|---------|----------|------------------|---------------------|
| `ARTISTS` array | ~~Yes~~ | ❌ Yes | ❌ Yes | ✅ Centralized |
| `AUCTION_TYPES` | ❌ Yes | ❌ Yes | ❌ Yes | ✅ Centralized |
| `CARD_DISTRIBUTION` | ❌ Yes | ❌ No | ❌ Yes | ✅ Yes |
| `AuctionIcon` | ❌ Yes | ❌ Yes | ✅ No | ✅ No |
| `CardArtwork/PlaceholderArt` | ❌ Yes | ❌ Yes | ✅ No | ✅ No |
| `GameCard` | ❌ Simple version | ✅ Full version | ✅ No | ✅ No |
| `seededShuffle()` | ❌ Yes | ✅ No | ✅ Yes | ✅ No |
| `ALL_CARDS` | ❌ Yes | ✅ No | ✅ Yes | ✅ No |
| `FloatingCardsBackground` | ❌ Yes | ✅ No | ✅ No | ✅ No |

**Total Duplicated Lines:** ~260 lines

### Critical Issues Found

1. **Type Mismatch Bug:**
   ```tsx
   // App.tsx, cardGenerator.ts
   interface CardData {
     id: number  // ← NUMBER
   }

   // Card.tsx
   export interface CardData {
     id: string  // ← STRING! Different type!
   }
   ```

2. **Triple Duplication of Artist Data:**
   - `src/components/Card.tsx` lines 2-8
   - `src/shared/services/cardGenerator.ts` lines 1-7
   - `src/engine/constants.ts` lines 9-15 (correct location)

3. **App.tsx is a "God File":**
   - 550+ lines
   - Contains routing, UI components, business logic, data generation
   - Violates Single Responsibility Principle

---

## Why Not Simply Delete from App.tsx?

The `FloatingCardsBackground` component in App.tsx depends on:
- `ALL_CARDS` - Pre-generated, shuffled card array
- `GameCard` - Simple card for background (no interactivity)
- `AuctionIcon` - Icons for card headers
- `PlaceholderArt` - Artwork with gradient fallback

**BUT** `Card.tsx` component is designed for gameplay, not background:
- Has click handlers (`onClick`)
- Has highlight states (`isHighlighted`, `isPartiallyHighlighted`)
- Has disabled states (`isDisabled`)
- Has selection indicators and overlays
- Uses `id: string` instead of `id: number`

**Conclusion:** We need a separate, lightweight card component for the background.

---

## Solution: Extract Background Component

### Step 1: Create New Component File

**File:** `src/components/background/FloatingCardsBackground.tsx`

This file will contain:
- Import from centralized sources (no duplication)
- `AuctionIcon` - Simple version (no size prop needed)
- `PlaceholderArt` - Artwork with gradient fallback
- `GameCard` - Simple background card (no interactivity)
- `FloatingCardsBackground` - Main exported component

**Dependencies:**
```tsx
import { ALL_CARDS, CardData } from '@/shared/services/cardGenerator'
import { ARTIST_COLORS } from '@/engine/constants'
import { useMemo } from 'react'
```

### Step 2: Update App.tsx

**Delete lines 78-442** (AuctionIcon through FloatingCardsBackground)

**Add import:**
```tsx
import { FloatingCardsBackground } from './components/background/FloatingCardsBackground'
```

**Result:** App.tsx reduces from 550 lines to ~200 lines

### Step 3: Fix Card.tsx

**Lines 2-8** - Delete duplicate `ARTISTS` array

**Add import:**
```tsx
import { ARTIST_COLORS } from '@/engine/constants'
```

**Update usage** (line 253):
```tsx
// Before
const artist = ARTISTS[card.artistIndex] || ARTISTS[0]

// After
const artist = ARTIST_COLORS[card.artistIndex] || ARTIST_COLORS[0]
```

### Step 4: Fix cardGenerator.ts

**Lines 1-7** - Delete duplicate `ARTISTS` array

**Add import:**
```tsx
import { ARTIST_COLORS, CARD_DISTRIBUTION } from '@/engine/constants'
```

**Update generateAllCards()** (lines 38-42):
```tsx
// Before
ARTISTS.forEach((artist, artistIndex) => {
  const count = CARD_DISTRIBUTION[artistIndex]

// After
ARTIST_COLORS.forEach((artist, artistIndex) => {
  const count = CARD_DISTRIBUTION[artist.name]
```

---

## Implementation Plan

### Phase 1: Create New Component (Safe)
- [ ] Create `src/components/background/FloatingCardsBackground.tsx`
- [ ] Copy `AuctionIcon`, `PlaceholderArt`, `GameCard`, `FloatingCardsBackground` from App.tsx
- [ ] Update imports to use centralized sources
- [ ] Export `FloatingCardsBackground` component

### Phase 2: Update App.tsx
- [ ] Import new component: `import { FloatingCardsBackground } from './components/background/FloatingCardsBackground'`
- [ ] Delete lines 78-442 from App.tsx
- [ ] Verify landing page renders correctly
- [ ] Verify player count page renders correctly
- [ ] Verify rules page renders correctly

### Phase 3: Fix Card.tsx
- [ ] Add import: `import { ARTIST_COLORS } from '@/engine/constants'`
- [ ] Delete lines 2-8 (duplicate ARTISTS)
- [ ] Update line 253 to use `ARTIST_COLORS`
- [ ] Verify game renders correctly

### Phase 4: Fix cardGenerator.ts
- [ ] Add imports: `import { ARTIST_COLORS, CARD_DISTRIBUTION } from '@/engine/constants'`
- [ ] Delete lines 1-7 (duplicate ARTISTS)
- [ ] Delete line 20 (duplicate CARD_DISTRIBUTION)
- [ ] Update `generateAllCards()` function
- [ ] Verify all card generation works

### Phase 5: Verify & Test
- [ ] Run dev server
- [ ] Test landing page background animation
- [ ] Start game and verify cards work
- [ ] Check TypeScript compilation
- [ ] Run tests (if any)

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking background animation | Low | Medium | Test immediately after extraction |
| Type mismatch (id: number vs string) | Low | High | Keep separate types for background vs game |
| Missing imports after refactor | Low | Medium | TypeScript will catch this |
| Visual regression | Low | Low | Background is purely decorative |

---

## Expected Results

### Before Refactor
- **App.tsx:** 550 lines, contains everything
- **Card.tsx:** Has duplicate ARTISTS
- **cardGenerator.ts:** Has duplicate ARTISTS, CARD_DISTRIBUTION
- **Total duplicated code:** ~260 lines

### After Refactor
- **App.tsx:** ~200 lines (routing only)
- **FloatingCardsBackground.tsx:** ~200 lines (new file)
- **Card.tsx:** Imports from engine/constants (no duplication)
- **cardGenerator.ts:** Imports from engine/constants (no duplication)
- **Total duplicated code:** 0 lines
- **Centralized constants:** All in engine/constants.ts

---

## Rollback Plan

If anything breaks:
1. Revert commit: `git revert HEAD`
2. Restore from backup: `git checkout HEAD~1 -- src/App.tsx src/components/Card.tsx src/shared/services/cardGenerator.ts`
3. Investigate issue and try again

---

## Future Considerations

### Potential Enhancements (Not in Scope)
1. **Lazy load FloatingCardsBackground** - Only load on landing/player-count routes
2. **CSS animations** - Move @keyframes to CSS file instead of inline `<style>`
3. **Responsive card sizes** - Consider using CSS clamp() consistently
4. **Type unification** - Decide if CardData.id should be number or string everywhere

### Related Issues
- **#5: Code Splitting** - Can lazy load background component along with routes
- **TypeScript strict mode** - Would catch type mismatches like id: number vs string

---

## References

- React Router PR: https://github.com/SoggyWasabi/modern-art-board-game/pull/XXX
- Original review notes: See Claude Code conversation 2025-01-26
- SRP (Single Responsibility Principle): https://en.wikipedia.org/wiki/Single-responsibility_principle
- DRY (Don't Repeat Yourself): https://en.wikipedia.org/wiki/Don%27t_repeat_yourself
