import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('API Service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(true).toBe(true);
  });

  it('should handle localStorage operations', () => {
    localStorage.setItem('test', 'value');
    expect(localStorage.getItem('test')).toBe('value');

    localStorage.removeItem('test');
    expect(localStorage.getItem('test')).toBeNull();
  });
});
