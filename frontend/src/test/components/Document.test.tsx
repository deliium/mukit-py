import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
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

const useAuthMock = vi.fn(() => mockAuthContext);

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

// Mock WebSocket hook
const mockUseWebSocket = {
  sendContentChange: vi.fn(),
  connected: true,
  users: [],
};

vi.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => mockUseWebSocket,
}));

// Mock ProseMirrorEditor
vi.mock('../../components/ProseMirrorEditor', () => {
  const MockProseMirrorEditor = React.forwardRef(
    ({ onChange }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        getContent: () => ({ type: 'doc', content: [] }),
      }));
      return (
        <div data-testid='prosemirror-editor'>
          <button onClick={() => onChange({ type: 'doc', content: [] })}>
            Change Content
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

// Mock API
const mockApiGet = vi.fn();
const mockApiPut = vi.fn();

vi.mock('../../services/api', () => ({
  api: {
    get: (...args: any[]) => mockApiGet(...args),
    put: (...args: any[]) => mockApiPut(...args),
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
  // Wait for either document title or editor to appear (loading complete)
  await waitFor(
    () => {
      const documentTitle = result.queryByText('Test Document');
      const editor = result.queryByTestId('prosemirror-editor');
      if (!documentTitle && !editor) {
        throw new Error('Document not loaded yet');
      }
    },
    { timeout: 3000 }
  );

  return result;
};

describe('Document Page - Title Editing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue(mockAuthContext);
    // Mock API to resolve immediately
    // Always return array for comment threads endpoints
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
        return Promise.resolve({ data: mockDocument });
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
      return Promise.resolve({ data: mockDocument });
    });
    mockApiPut.mockResolvedValue({
      data: { ...mockDocument, title: 'Updated Title' },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders document title', async () => {
    await renderWithRouter(<DocumentPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });
  });

  it('shows pencil icon for document owner', async () => {
    await renderWithRouter(<DocumentPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });

    // Pencil icon should be present (check by aria-label or role)
    const pencilIcon = screen
      .getByText('Test Document')
      .parentElement?.querySelector('svg');
    expect(pencilIcon).toBeInTheDocument();
  });

  it('does not show pencil icon for non-owner', async () => {
    // Mock non-owner user
    const nonOwnerUser = { ...mockUser, id: 'other-user-123' };
    useAuthMock.mockReturnValue({
      ...mockAuthContext,
      user: nonOwnerUser,
    });

    await renderWithRouter(<DocumentPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });

    // For non-owner, the title should not have cursor-pointer class or pencil icon
    const titleContainer = screen.getByText('Test Document').parentElement;

    // Check that the container doesn't have the cursor-pointer class (which indicates it's clickable)
    expect(titleContainer).not.toHaveClass('cursor-pointer');
    // The main test is that clicking doesn't trigger edit mode
  });

  it('enters edit mode when title is clicked', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<DocumentPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });

    const titleContainer = screen.getByText('Test Document').parentElement;
    expect(titleContainer).toBeInTheDocument();

    await user.click(titleContainer!);

    await waitFor(() => {
      const input = screen.getByDisplayValue('Test Document');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
    });
  });

  it('does not enter edit mode for non-owner', async () => {
    const user = userEvent.setup();
    // Mock non-owner user
    const nonOwnerUser = { ...mockUser, id: 'other-user-123' };
    useAuthMock.mockReturnValue({
      ...mockAuthContext,
      user: nonOwnerUser,
    });

    await renderWithRouter(<DocumentPage />);

    await waitFor(
      () => {
        expect(screen.getByText('Test Document')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Get the title element
    const titleElement = screen.getByText('Test Document');
    const titleContainer = titleElement.parentElement;

    // Click should not trigger edit mode for non-owner
    if (titleContainer) {
      await user.click(titleContainer);
    }

    // Should still show title, not input (wait a bit to ensure no state change)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Title should still be visible as h1, not as input
    const titleText = screen.queryByText('Test Document');
    expect(titleText).toBeInTheDocument();

    // Input should not appear
    const input = screen.queryByDisplayValue('Test Document');
    expect(input).not.toBeInTheDocument();
  });

  it('shows save and cancel buttons in edit mode', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<DocumentPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });

    const titleContainer = screen.getByText('Test Document').parentElement;
    await user.click(titleContainer!);

    await waitFor(() => {
      // Check for save button (CheckIcon) - by title attribute
      const saveButton = screen.getByTitle('Save title');
      expect(saveButton).toBeInTheDocument();

      // Check for cancel button (XIcon) - by title attribute
      const cancelButton = screen.getByTitle('Cancel editing');
      expect(cancelButton).toBeInTheDocument();
    });
  });

  it('saves title when Enter key is pressed', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<DocumentPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });

    const titleContainer = screen.getByText('Test Document').parentElement;
    await user.click(titleContainer!);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Document')).toBeInTheDocument();
    });

    const input = screen.getByDisplayValue('Test Document');
    await user.clear(input);
    await user.type(input, 'Updated Title');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith('/documents/document-123', {
        title: 'Updated Title',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Updated Title')).toBeInTheDocument();
    });
  });

  it('saves title when save button is clicked', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<DocumentPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });

    const titleContainer = screen.getByText('Test Document').parentElement;
    await user.click(titleContainer!);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Document')).toBeInTheDocument();
    });

    const input = screen.getByDisplayValue('Test Document');
    await user.clear(input);
    await user.type(input, 'Updated Title');

    const saveButton = screen.getByTitle('Save title');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith('/documents/document-123', {
        title: 'Updated Title',
      });
    });
  });

  it('cancels editing when Escape key is pressed', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<DocumentPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });

    const titleContainer = screen.getByText('Test Document').parentElement;
    await user.click(titleContainer!);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Document')).toBeInTheDocument();
    });

    const input = screen.getByDisplayValue('Test Document');
    await user.clear(input);
    await user.type(input, 'Changed Title');
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
      expect(
        screen.queryByDisplayValue('Changed Title')
      ).not.toBeInTheDocument();
    });

    // API should not be called
    expect(mockApiPut).not.toHaveBeenCalled();
  });

  it('cancels editing when cancel button is clicked', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<DocumentPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });

    const titleContainer = screen.getByText('Test Document').parentElement;
    await user.click(titleContainer!);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Document')).toBeInTheDocument();
    });

    const input = screen.getByDisplayValue('Test Document');
    await user.clear(input);
    await user.type(input, 'Changed Title');

    const cancelButton = screen.getByTitle('Cancel editing');
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
      expect(
        screen.queryByDisplayValue('Changed Title')
      ).not.toBeInTheDocument();
    });

    // API should not be called
    expect(mockApiPut).not.toHaveBeenCalled();
  });

  it('does not save if title is unchanged', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<DocumentPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });

    const titleContainer = screen.getByText('Test Document').parentElement;
    await user.click(titleContainer!);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Document')).toBeInTheDocument();
    });

    const saveButton = screen.getByTitle('Save title');
    await user.click(saveButton);

    // API should not be called if title is unchanged
    await waitFor(() => {
      expect(mockApiPut).not.toHaveBeenCalled();
    });
  });

  it('handles API error when saving title', async () => {
    const user = userEvent.setup();
    mockApiPut.mockRejectedValueOnce({
      response: { data: { detail: 'Failed to update title' } },
    });

    await renderWithRouter(<DocumentPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });

    const titleContainer = screen.getByText('Test Document').parentElement;
    await user.click(titleContainer!);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Document')).toBeInTheDocument();
    });

    const input = screen.getByDisplayValue('Test Document');
    await user.clear(input);
    await user.type(input, 'Updated Title');

    const saveButton = screen.getByTitle('Save title');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalled();
      expect(mockAlert).toHaveBeenCalledWith('Failed to update title');
    });

    // After error, the input should still be present with the original title value
    // (since we reset editedTitle to document.title on error)
    await waitFor(
      () => {
        const inputAfterError = screen.queryByDisplayValue('Test Document');
        expect(inputAfterError).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('does not save empty title', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<DocumentPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });

    const titleContainer = screen.getByText('Test Document').parentElement;
    await user.click(titleContainer!);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Document')).toBeInTheDocument();
    });

    const input = screen.getByDisplayValue('Test Document');
    await user.clear(input);
    await user.keyboard('   '); // Only spaces
    await user.keyboard('{Enter}');

    // API should not be called for empty/whitespace-only title
    expect(mockApiPut).not.toHaveBeenCalled();
  });

  it('trims whitespace from title before saving', async () => {
    const user = userEvent.setup();
    mockApiPut.mockResolvedValueOnce({
      data: { ...mockDocument, title: 'Trimmed Title' },
    });

    await renderWithRouter(<DocumentPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });

    const titleContainer = screen.getByText('Test Document').parentElement;
    await user.click(titleContainer!);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Document')).toBeInTheDocument();
    });

    const input = screen.getByDisplayValue('Test Document');
    await user.clear(input);
    await user.type(input, '  Trimmed Title  ');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith('/documents/document-123', {
        title: 'Trimmed Title',
      });
    });
  });

  it('disables input and buttons while updating', async () => {
    const user = userEvent.setup();
    // Make API call slow
    let resolveApiCall: (value: any) => void;
    const slowApiPromise = new Promise(resolve => {
      resolveApiCall = resolve;
    });
    mockApiPut.mockReturnValueOnce(slowApiPromise);
    // Note: mockApiGet is already set up in beforeEach to handle comment threads

    await renderWithRouter(<DocumentPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });

    const titleContainer = screen.getByText('Test Document').parentElement;
    await user.click(titleContainer!);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Document')).toBeInTheDocument();
    });

    const input = screen.getByDisplayValue('Test Document');
    await user.clear(input);
    await user.type(input, 'Updated Title');

    const saveButton = screen.getByTitle('Save title');
    await user.click(saveButton);

    // Input and buttons should be disabled while updating
    await waitFor(() => {
      expect(input).toBeDisabled();
      expect(saveButton).toBeDisabled();
      expect(screen.getByTitle('Cancel editing')).toBeDisabled();
    });

    // Resolve API call
    resolveApiCall!({ data: { ...mockDocument, title: 'Updated Title' } });
  });
});
