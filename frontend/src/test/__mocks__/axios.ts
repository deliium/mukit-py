import { vi } from 'vitest';
import {
  mockUser,
  mockWorkspace,
  mockDocument,
  mockDocuments,
  mockWorkspaces,
} from './api';

// Mock axios instance
const mockAxios = {
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
};

// Default mock implementations
mockAxios.get.mockImplementation((url: string) => {
  if (url.includes('/auth/me')) {
    return Promise.resolve({ data: mockUser });
  }
  if (url.includes('/workspaces')) {
    return Promise.resolve({ data: mockWorkspaces });
  }
  if (url.includes('/documents')) {
    return Promise.resolve({ data: mockDocuments });
  }
  return Promise.resolve({ data: {} });
});

mockAxios.post.mockImplementation((url: string) => {
  if (url.includes('/auth/login')) {
    return Promise.resolve({
      data: { access_token: 'mock-token', token_type: 'bearer' },
    });
  }
  if (url.includes('/auth/register')) {
    return Promise.resolve({ data: mockUser });
  }
  if (url.includes('/workspaces')) {
    return Promise.resolve({ data: mockWorkspace });
  }
  if (url.includes('/documents')) {
    return Promise.resolve({ data: mockDocument });
  }
  return Promise.resolve({ data: {} });
});

mockAxios.put.mockImplementation((_url: string, data: any) => {
  return Promise.resolve({ data: { ...mockDocument, ...data } });
});

mockAxios.delete.mockImplementation(() => {
  return Promise.resolve({ data: { message: 'Deleted successfully' } });
});

export default mockAxios;
