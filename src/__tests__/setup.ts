import { vi } from 'vitest'

// Mock the import.meta.env values
vi.stubGlobal('import.meta', {
  env: {
    VITE_LOCAL_AI_URL: 'http://localhost:3001',
    VITE_DEFAULT_AI_PROVIDER: 'claude',
    VITE_DEFAULT_AI_MODEL: 'claude-3-sonnet-20240229',
    VITE_REQUEST_TIMEOUT: '30000',
  }
})

// Mock fetch if not in a browser environment
if (typeof fetch === 'undefined') {
  vi.stubGlobal('fetch', vi.fn())
}