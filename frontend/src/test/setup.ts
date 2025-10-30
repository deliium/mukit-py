import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_API_URL: 'http://localhost:8888/api/v1',
    VITE_WS_URL: 'ws://localhost:8888',
  },
  writable: true,
});

// Mock WebSocket
global.WebSocket = class WebSocket {
  constructor(url: string) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
  }

  url: string;
  readyState: number;
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  close() {}
  send() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return false;
  }
} as any;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  value: vi.fn(() => true),
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  },
  writable: true,
});
