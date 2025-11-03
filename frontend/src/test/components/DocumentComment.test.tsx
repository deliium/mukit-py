import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DocumentPage from '../../pages/Document';
import { mockDocument, mockUser } from '../__mocks__/api';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'document-123' }),
  };
});

// Mock AuthContext
const mockAuthContext = {
  user: mockUser,
  login: vi.fn(),
  logout: vi.fn(),
  isLoading: false,
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock WebSocket hook
const mockSendContentChange = vi.fn();
const mockUseWebSocket = {
  sendContentChange: mockSendContentChange,
  connected: true,
  users: [],
};

vi.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => mockUseWebSocket,
}));

// Mock ProseMirrorEditor with getContent method
const mockGetContent = vi.fn(() => ({ type: 'doc', content: [] }));

vi.mock('../../components/ProseMirrorEditor', () => {
  const MockProseMirrorEditor = React.forwardRef(
    ({ onCommentClick, onMarkerClick }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        getContent: mockGetContent,
      }));
      return (
        <div data-testid='prosemirror-editor'>
          <button
            data-testid='trigger-comment-click'
            onClick={() =>
              onCommentClick && onCommentClick(10, { x: 100, y: 200 })
            }
          >
            Trigger Comment Click
          </button>
          <button
            data-testid='trigger-marker-click'
            onClick={() => onMarkerClick && onMarkerClick('thread-1')}
          >
            Trigger Marker Click
          </button>
        </div>
      );
    }
  );
  MockProseMirrorEditor.displayName = 'MockProseMirrorEditor';
  return {
    default: MockProseMirrorEditor,
  };
});

// Mock CommentPanel
vi.mock('../../components/CommentPanel', () => {
  const MockCommentPanel = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      refresh: props.onThreadUpdate || vi.fn(),
      scrollToThread: vi.fn(),
    }));
    return <div data-testid='comment-panel'>Comment Panel</div>;
  });
  MockCommentPanel.displayName = 'MockCommentPanel';
  return {
    default: MockCommentPanel,
  };
});

// Mock CommentQuickCreate
vi.mock('../../components/CommentQuickCreate', () => {
  const MockCommentQuickCreate = ({ onCreate, onCancel }: any) => (
    <div data-testid='comment-quick-create'>
      <button
        data-testid='create-comment-btn'
        onClick={() => onCreate('Test comment content')}
      >
        Create Comment
      </button>
      <button data-testid='cancel-comment-btn' onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
  MockCommentQuickCreate.displayName = 'MockCommentQuickCreate';
  return {
    default: MockCommentQuickCreate,
  };
});

// Mock API
const mockApiGet = vi.fn();
const mockApiPut = vi.fn();
const mockApiPost = vi.fn();
const mockApiDelete = vi.fn();

vi.mock('../../services/api', () => ({
  api: {
    get: (...args: any[]) => mockApiGet(...args),
    put: (...args: any[]) => mockApiPut(...args),
    post: (...args: any[]) => mockApiPost(...args),
    delete: (...args: any[]) => mockApiDelete(...args),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'mock-token'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock window.alert
const mockAlert = vi.fn();
Object.defineProperty(window, 'alert', {
  value: mockAlert,
  writable: true,
});

const renderWithRouter = async (component: React.ReactElement) => {
  const result = render(
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      {component}
    </BrowserRouter>
  );

  // Wait for document to load - waitFor automatically wraps updates in act()
  // Wait for editor to appear (loading complete)
  await waitFor(
    () => {
      const editor = result.queryByTestId('prosemirror-editor');
      if (!editor) {
        throw new Error('Document not loaded yet');
      }
    },
    { timeout: 3000 }
  );

  return result;
};

describe('Document Page - Comment Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default API responses - this must be synchronous
    // Handle both string URLs and array arguments (axios.get(url, config))
    mockApiGet.mockImplementation((url: string | any[]) => {
      // Handle string URLs
      if (typeof url === 'string') {
        if (
          url.includes('/documents/document-123') &&
          !url.includes('/comments')
        ) {
          return Promise.resolve({ data: mockDocument });
        }
        // Always return array for comment threads endpoints
        if (url.includes('/comments/documents/') && url.includes('/threads')) {
          return Promise.resolve({ data: [] });
        }
        return Promise.resolve({ data: [] });
      }
      // Handle array arguments (axios.get(url, config))
      if (Array.isArray(url) && url[0]) {
        const urlString = url[0];
        if (typeof urlString === 'string') {
          if (
            urlString.includes('/documents/document-123') &&
            !urlString.includes('/comments')
          ) {
            return Promise.resolve({ data: mockDocument });
          }
          if (
            urlString.includes('/comments/documents/') &&
            urlString.includes('/threads')
          ) {
            return Promise.resolve({ data: [] });
          }
        }
      }
      return Promise.resolve({ data: [] });
    });

    mockApiPut.mockResolvedValue({ data: { ...mockDocument } });
    mockApiPost.mockResolvedValue({ data: {} });
    mockApiDelete.mockResolvedValue({ data: {} });

    // Don't use fake timers - real timers work better with async operations
  });

  it('should save content when comment button is clicked', async () => {
    const user = userEvent.setup();

    await renderWithRouter(<DocumentPage />);

    await waitFor(
      () => {
        expect(screen.getByTestId('prosemirror-editor')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const triggerButton = screen.getByTestId('trigger-comment-click');
    await user.click(triggerButton);

    // Wait for save API call - handleCommentClick is async
    await waitFor(
      () => {
        expect(mockApiPut).toHaveBeenCalled();
      },
      { timeout: 5000 }
    );

    // Should send content change via WebSocket
    expect(mockSendContentChange).toHaveBeenCalled();
  }, 10000);

  it('should show comment quick create dialog after clicking comment trigger', async () => {
    const user = userEvent.setup();

    await renderWithRouter(<DocumentPage />);

    await waitFor(
      () => {
        expect(screen.getByTestId('prosemirror-editor')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const triggerButton = screen.getByTestId('trigger-comment-click');
    await user.click(triggerButton);

    // Wait for dialog to appear - handleCommentClick is async and saves first
    await waitFor(
      () => {
        expect(screen.getByTestId('comment-quick-create')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  }, 10000);

  it('should create comment thread and comment when quick create is submitted', async () => {
    const user = userEvent.setup();

    const mockThread = {
      id: 'thread-1',
      position: 'pos:10',
      is_resolved: false,
    };
    const mockComment = { id: 'comment-1', content: 'Test comment content' };

    mockApiPost.mockImplementation((url: string) => {
      if (url.includes('/comments/threads')) {
        return Promise.resolve({ data: mockThread });
      }
      if (url.includes('/comments/')) {
        return Promise.resolve({ data: mockComment });
      }
      return Promise.resolve({ data: {} });
    });

    mockApiGet.mockImplementation((url: string | any[]) => {
      // Handle string URLs
      if (typeof url === 'string') {
        if (
          url.includes('/documents/document-123') &&
          !url.includes('/comments')
        ) {
          return Promise.resolve({ data: mockDocument });
        }
        if (url.includes('/comments/documents/') && url.includes('/threads')) {
          return Promise.resolve({ data: [mockThread] });
        }
        return Promise.resolve({ data: [] });
      }
      // Handle array arguments (axios.get(url, config))
      if (Array.isArray(url) && url[0]) {
        const urlString = url[0];
        if (typeof urlString === 'string') {
          if (
            urlString.includes('/documents/document-123') &&
            !urlString.includes('/comments')
          ) {
            return Promise.resolve({ data: mockDocument });
          }
          if (
            urlString.includes('/comments/documents/') &&
            urlString.includes('/threads')
          ) {
            return Promise.resolve({ data: [mockThread] });
          }
        }
      }
      return Promise.resolve({ data: [] });
    });

    await renderWithRouter(<DocumentPage />);

    await waitFor(() => {
      expect(screen.getByTestId('prosemirror-editor')).toBeInTheDocument();
    });

    // Trigger comment click
    const triggerButton = screen.getByTestId('trigger-comment-click');
    await user.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByTestId('comment-quick-create')).toBeInTheDocument();
    });

    // Create comment
    const createButton = screen.getByTestId('create-comment-btn');
    await user.click(createButton);

    // Wait for async operations
    await waitFor(
      () => {
        expect(mockApiPost).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Should create thread first
    const threadCall = mockApiPost.mock.calls.find(
      (call: any[]) => call[0] === '/comments/threads'
    );
    expect(threadCall).toBeDefined();
    expect(threadCall?.[1]).toMatchObject({
      document_id: 'document-123',
      position: 'pos:10',
    });

    // Then create comment
    const commentCall = mockApiPost.mock.calls.find(
      (call: any[]) => call[0] === '/comments/'
    );
    expect(commentCall).toBeDefined();
    expect(commentCall?.[1]).toMatchObject({
      thread_id: 'thread-1',
      content: 'Test comment content',
    });
  });

  it('should open comment panel when marker is clicked', async () => {
    const user = userEvent.setup();

    await renderWithRouter(<DocumentPage />);

    await waitFor(() => {
      expect(screen.getByTestId('prosemirror-editor')).toBeInTheDocument();
    });

    // Click marker
    const markerButton = screen.getByTestId('trigger-marker-click');
    await user.click(markerButton);

    // Should show comment panel
    await waitFor(() => {
      expect(screen.getByTestId('comment-panel')).toBeInTheDocument();
    });
  });

  it('should handle comment creation error gracefully', async () => {
    const user = userEvent.setup();

    // Override mockApiPost for this test, but keep mockApiGet working
    mockApiPost.mockRejectedValue({
      response: { data: { detail: 'Failed to create comment' } },
    });

    // Ensure mockApiGet still handles comment threads correctly
    // (already set in beforeEach, but make sure it's not cleared)

    await renderWithRouter(<DocumentPage />);

    await waitFor(() => {
      expect(screen.getByTestId('prosemirror-editor')).toBeInTheDocument();
    });

    // Trigger comment click
    const triggerButton = screen.getByTestId('trigger-comment-click');
    await user.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByTestId('comment-quick-create')).toBeInTheDocument();
    });

    // Try to create comment
    const createButton = screen.getByTestId('create-comment-btn');
    await user.click(createButton);

    // Should show alert with error
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Failed to create comment');
    });
  });
});
