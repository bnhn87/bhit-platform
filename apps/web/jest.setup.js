// Jest setup for testing environment
import '@testing-library/jest-dom'

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock window.navigator
Object.defineProperty(window, 'navigator', {
  writable: true,
  value: {
    onLine: true,
    serviceWorker: {
      register: jest.fn(() => Promise.resolve()),
      ready: Promise.resolve({
        sync: {
          register: jest.fn(() => Promise.resolve())
        },
        showNotification: jest.fn(() => Promise.resolve())
      }),
      controller: {
        postMessage: jest.fn()
      },
      addEventListener: jest.fn()
    },
    clipboard: {
      writeText: jest.fn(() => Promise.resolve())
    },
    share: jest.fn(() => Promise.resolve()),
    storage: {
      estimate: jest.fn(() => Promise.resolve({ quota: 1000000, usage: 100000 }))
    }
  }
})

// Mock window.Notification
Object.defineProperty(window, 'Notification', {
  writable: true,
  value: {
    permission: 'granted',
    requestPermission: jest.fn(() => Promise.resolve('granted'))
  }
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock IndexedDB
const indexedDBMock = {
  open: jest.fn(() => ({
    onerror: null,
    onsuccess: null,
    onupgradeneeded: null,
    result: {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          add: jest.fn(),
          get: jest.fn(),
          getAll: jest.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
          delete: jest.fn(),
          createIndex: jest.fn()
        })),
        oncomplete: null,
        onerror: null
      })),
      createObjectStore: jest.fn(() => ({
        createIndex: jest.fn()
      })),
      objectStoreNames: {
        contains: jest.fn(() => false)
      }
    }
  }))
}
Object.defineProperty(window, 'indexedDB', {
  value: indexedDBMock
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock canvas context for signature functionality
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  clearRect: jest.fn(),
  lineWidth: 2,
  lineCap: 'round',
  strokeStyle: '#000'
}))

HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mockedSignature')

// Mock URL.createObjectURL for file handling
global.URL.createObjectURL = jest.fn(() => 'mocked-url')
global.URL.revokeObjectURL = jest.fn()

// Suppress console errors in tests unless explicitly testing error handling
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Global test utilities
global.waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'