// Vitest setup file
import { vi } from 'vitest'

// Setup global fetch mock for jsdom environment
global.fetch = vi.fn()

// Mock axios defaults
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn(),
      },
      response: {
        use: vi.fn(),
      },
    },
  },
}))

// Mock Blob for file download tests
global.Blob = vi.fn().mockImplementation((content, options) => ({
  content,
  options,
  size: content ? content.length : 0,
  type: options?.type || ''
}))
