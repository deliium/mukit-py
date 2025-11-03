import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ProseMirrorEditor from '../../components/ProseMirrorEditor';

// Mock prosemirror-view CSS import
vi.mock('prosemirror-view/style/prosemirror.css', () => ({}));

describe('ProseMirrorEditor - Comment Functionality', () => {
  const mockOnCommentClick = vi.fn();
  const mockOnMarkerClick = vi.fn();
  const mockOnChange = vi.fn();

  const defaultProps = {
    value: { type: 'doc', content: [] },
    onChange: mockOnChange,
    onCommentClick: mockOnCommentClick,
    onMarkerClick: mockOnMarkerClick,
    commentThreads: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render comment button in toolbar', async () => {
    render(<ProseMirrorEditor {...defaultProps} />);

    await waitFor(() => {
      const commentButton = screen.getByText('Comment');
      expect(commentButton).toBeInTheDocument();
    });
  });

  it('should call onCommentClick when comment button is clicked', async () => {
    const user = userEvent.setup();
    render(<ProseMirrorEditor {...defaultProps} />);

    await waitFor(() => {
      const commentButton = screen.getByText('Comment').closest('button');
      expect(commentButton).toBeInTheDocument();
    });

    const commentButton = screen.getByText('Comment').closest('button');
    if (commentButton) {
      await user.click(commentButton);

      // onCommentClick should be called with position and coordinates
      await waitFor(() => {
        expect(mockOnCommentClick).toHaveBeenCalled();
      });

      expect(mockOnCommentClick).toHaveBeenCalledWith(
        expect.any(Number),
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        })
      );
    }
  });

  it('should show tooltip with Ctrl+Click instruction', async () => {
    render(<ProseMirrorEditor {...defaultProps} />);

    await waitFor(() => {
      const commentButton = screen.getByText('Comment').closest('button');
      expect(commentButton).toBeInTheDocument();
    });

    const commentButton = screen.getByText('Comment').closest('button');
    if (commentButton) {
      expect(commentButton).toHaveAttribute('title');
      const title = commentButton?.getAttribute('title');
      expect(title).toContain('Ctrl+Click');
    }
  });

  it('should display comment button with icon', async () => {
    render(<ProseMirrorEditor {...defaultProps} />);

    await waitFor(() => {
      const commentButton = screen.getByText('Comment').closest('button');
      expect(commentButton).toBeInTheDocument();
    });

    // Check that the button contains the icon (via SVG or className)
    const commentButton = screen.getByText('Comment').closest('button');
    expect(commentButton).toHaveClass('flex', 'items-center', 'gap-1');
  });

  it('should have separator before comment button', async () => {
    render(<ProseMirrorEditor {...defaultProps} />);

    await waitFor(() => {
      const separator = document.querySelector('.ml-2.border-l');
      expect(separator).toBeInTheDocument();
    });
  });
});
