// ===================
// EASY AI STRATEGY EXPORT
// ===================

import { EasyAIStrategy } from './strategy'
export { EasyAICardPlay } from './card-play'
export { EasyAIBidding } from './bidding'

// Export the strategy class
export { EasyAIStrategy }

// Factory function
export function createEasyAIStrategy(seed?: number) {
  return new EasyAIStrategy(seed)
}