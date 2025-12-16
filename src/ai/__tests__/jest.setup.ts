// ===================
// VITEST SETUP FOR AI TESTS
// ===================

// Mock performance API for Node.js environment
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000,
    },
  },
  writable: true,
})

// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Uncomment to suppress console logs during tests
  // log: vi.fn(),
  // error: vi.fn(),
  // warn: vi.fn(),
  // info: vi.fn(),
  // debug: vi.fn(),
}

// Set up test environment variables
process.env.NODE_ENV = 'test'

// Extend Jest matchers
expect.extend({
  toBeValidCard(received) {
    const isValid = received &&
      typeof received.id === 'string' &&
      typeof received.artist === 'string' &&
      typeof received.auctionType === 'string' &&
      ['open', 'hidden', 'one_offer', 'fixed_price', 'double'].includes(received.auctionType)

    return {
      message: () => `expected ${received} to be a valid card`,
      pass: isValid,
    }
  },

  toBeValidDecision(received) {
    const isValid = received &&
      typeof received.type === 'string' &&
      typeof received.action === 'string' &&
      ['card_play', 'bid', 'hidden_bid', 'buy', 'fixed_price'].includes(received.type)

    return {
      message: () => `expected ${received} to be a valid AI decision`,
      pass: isValid,
    }
  },
})

// Declare module for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidCard(): R
      toBeValidDecision(): R
    }
  }
}