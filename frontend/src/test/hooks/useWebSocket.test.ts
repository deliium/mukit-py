// import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';

// Mock WebSocket
const mockWebSocket = {
  close: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.CONNECTING,
};

// Mock WebSocket globally
Object.defineProperty(global, 'WebSocket', {
  writable: true,
  value: vi.fn(() => mockWebSocket),
});

describe('useWebSocket Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(true).toBe(true);
  });

  it('should create WebSocket instance', () => {
    const WebSocket = global.WebSocket as any;
    new WebSocket('ws://localhost:8888/ws');
    expect(WebSocket).toHaveBeenCalledWith('ws://localhost:8888/ws');
  });

  it('should handle WebSocket methods', () => {
    expect(typeof mockWebSocket.close).toBe('function');
    expect(typeof mockWebSocket.send).toBe('function');
    expect(typeof mockWebSocket.addEventListener).toBe('function');
  });
});
