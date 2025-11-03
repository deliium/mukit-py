import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Comment from '../../components/Comment';
import { mockUser } from '../__mocks__/api';

const mockComment = {
  id: 'comment-1',
  thread_id: 'thread-1',
  author_id: 'user-1',
  content: 'This is a test comment',
  is_edited: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  replies: [],
};

// Mock AuthContext - use stable mock to avoid state updates
const mockAuthContext = {
  user: mockUser,
  login: vi.fn(),
  logout: vi.fn(),
  loading: false,
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => mockAuthContext),
}));

// Mock API
vi.mock('../../services/api', () => ({
  api: {
    patch: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Comment Component', () => {
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render comment content', () => {
    act(() => {
      render(
        <Comment
          comment={mockComment}
          currentUserId={mockUser.id}
          onUpdate={mockOnUpdate}
        />
      );
    });

    expect(screen.getByText('This is a test comment')).toBeInTheDocument();
  });

  it('should show delete button for comment owner', () => {
    act(() => {
      render(
        <Comment
          comment={mockComment}
          currentUserId={mockComment.author_id}
          onUpdate={mockOnUpdate}
        />
      );
    });

    const deleteButton = screen.getByTitle(/delete/i);
    expect(deleteButton).toBeInTheDocument();
  });

  it('should not show delete button for non-owner', () => {
    act(() => {
      render(
        <Comment
          comment={mockComment}
          currentUserId='other-user-id'
          onUpdate={mockOnUpdate}
        />
      );
    });

    const deleteButton = screen.queryByTitle(/delete/i);
    expect(deleteButton).not.toBeInTheDocument();
  });

  it('should show confirmation dialog when delete is clicked', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(
        <Comment
          comment={mockComment}
          currentUserId={mockComment.author_id}
          onUpdate={mockOnUpdate}
        />
      );
    });

    const deleteButton = screen.getByTitle(/delete/i);

    await act(async () => {
      await user.click(deleteButton);
    });

    // Should show confirmation dialog with title "Delete Comment"
    await waitFor(() => {
      expect(screen.getByText('Delete Comment')).toBeInTheDocument();
    });
  });

  it('should call onUpdate after delete', async () => {
    const { api } = await import('../../services/api');
    vi.mocked(api.delete).mockResolvedValue({ data: {} });

    const user = userEvent.setup();

    await act(async () => {
      render(
        <Comment
          comment={mockComment}
          currentUserId={mockComment.author_id}
          onUpdate={mockOnUpdate}
        />
      );
    });

    const deleteButton = screen.getByTitle(/delete/i);

    await act(async () => {
      await user.click(deleteButton);
    });

    await waitFor(() => {
      // ConfirmDialog shows "Delete" button
      const confirmButton = screen.getByRole('button', {
        name: /^Delete$/i,
      });
      expect(confirmButton).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', {
      name: /^Delete$/i,
    });

    await act(async () => {
      await user.click(confirmButton);
    });

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it('should show edit button for comment owner', () => {
    act(() => {
      render(
        <Comment
          comment={mockComment}
          currentUserId={mockComment.author_id}
          onUpdate={mockOnUpdate}
        />
      );
    });

    const editButton = screen.getByTitle(/edit/i);
    expect(editButton).toBeInTheDocument();
  });

  it('should render replies if present', () => {
    const commentWithReplies = {
      ...mockComment,
      replies: [
        {
          id: 'reply-1',
          thread_id: 'thread-1',
          author_id: 'user-2',
          content: 'This is a reply',
          is_edited: false,
          created_at: '2024-01-01T01:00:00Z',
          updated_at: '2024-01-01T01:00:00Z',
        },
      ],
    };

    act(() => {
      render(
        <Comment
          comment={commentWithReplies}
          currentUserId={mockComment.author_id}
          onUpdate={mockOnUpdate}
        />
      );
    });

    expect(screen.getByText('This is a reply')).toBeInTheDocument();
  });
});
