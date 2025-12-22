import type { Card, Player } from './game'
import type {
  AuctionState,
  OpenAuctionState,
  HiddenAuctionState,
  FixedPriceAuctionState,
  OneOfferAuctionState
} from './auction'
import type { AuctionType } from './game'

/**
 * Base props for all auction components
 * Supports both single and double auctions
 */
export interface BaseAuctionProps<T extends AuctionState> {
  currentAuction: T
  isAuctionPlayerTurn: boolean
  currentPlayerInAuction: Player | null
  gameState: any

  // Double auction support
  cards?: Card[]  // Array of cards (1 for regular, 2 for double)
  isDoubleAuction?: boolean
  doubleAuctionType?: AuctionType
}

/**
 * Specific props for each auction type component
 */
export interface OpenAuctionProps extends BaseAuctionProps<OpenAuctionState> {}
export interface HiddenAuctionProps extends BaseAuctionProps<HiddenAuctionState> {}
export interface FixedPriceAuctionProps extends BaseAuctionProps<FixedPriceAuctionState> {}
export interface OneOfferAuctionProps extends BaseAuctionProps<OneOfferAuctionState> {}

/**
 * Helper function to normalize cards for auction components
 */
export function normalizeCardsForAuction(props: BaseAuctionProps<any>): Card[] {
  // If cards array is provided (double auction), use it
  if (props.cards && props.cards.length > 0) {
    return props.cards
  }

  // For single auctions, use the card from the auction state
  if (props.currentAuction.type !== 'double' && 'card' in props.currentAuction) {
    return [props.currentAuction.card]
  }

  // Fallback - shouldn't happen in normal flow
  return []
}

/**
 * Helper to get auction header text with double support
 */
export function getAuctionHeaderText(props: BaseAuctionProps<any>): { title: string; subtitle: string } {
  const type = props.currentAuction.type

  const baseTitles = {
    'open': 'Open Auction',
    'one_offer': 'One Offer',
    'hidden': 'Hidden Auction',
    'fixed_price': 'Fixed Price',
    'double': 'Double Auction'
  }

  const baseIcons = {
    'open': '🔊',
    'one_offer': '☝️',
    'hidden': '🙈',
    'fixed_price': '🏷️',
    'double': '👯'
  }

  if (props.isDoubleAuction && props.doubleAuctionType && type !== 'double') {
    // Double auction showing embedded type
    return {
      title: `👯 Double + ${baseIcons[props.doubleAuctionType]} ${baseTitles[props.doubleAuctionType]}`,
      subtitle: 'Package deal - both cards sell together!'
    }
  }

  return {
    title: `${baseIcons[type]} ${baseTitles[type]}`,
    subtitle: props.isDoubleAuction ? 'Package deal - both cards sell together!' : ''
  }
}