import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { CommentThread } from '../types';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import CommentThreadComponent from './CommentThread';
import ConfirmDialog from './ConfirmDialog';

interface CommentPanelProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  onThreadUpdate?: () => void;
}

export interface CommentPanelRef {
  refresh: () => void;
  scrollToThread: (threadId: string) => void;
}

const CommentPanel = forwardRef<CommentPanelRef, CommentPanelProps>(
  ({ documentId, isOpen, onClose, onThreadUpdate }, ref) => {
    const { user } = useAuth();
    const [threads, setThreads] = useState<CommentThread[]>([]);
    const [loading, setLoading] = useState(false);
    const [creatingThread, setCreatingThread] = useState(false);
    const [newThreadPosition, setNewThreadPosition] = useState('');
    const [newThreadContent, setNewThreadContent] = useState('');
    const [deleteThreadId, setDeleteThreadId] = useState<string | null>(null);
    const threadsContainerRef = React.useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      if (isOpen && documentId) {
        loadThreads();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, documentId]);

    // Expose refresh and scrollToThread methods to parent
    useImperativeHandle(ref, () => ({
      refresh: loadThreads,
      scrollToThread: (threadId: string) => {
        // Wait for threads to load, then scroll
        const attemptScroll = () => {
          if (!threadsContainerRef.current) return false;
          const threadElement = threadsContainerRef.current.querySelector(
            `[data-thread-id="${threadId}"]`
          );
          if (threadElement) {
            threadElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
            // Add a temporary highlight
            threadElement.classList.add(
              'ring-2',
              'ring-primary-500',
              'ring-offset-2',
              'rounded-lg'
            );
            setTimeout(() => {
              threadElement.classList.remove(
                'ring-2',
                'ring-primary-500',
                'ring-offset-2',
                'rounded-lg'
              );
            }, 2000);
            return true;
          }
          return false;
        };

        // Try immediately
        if (attemptScroll()) return;

        // If not found, wait a bit and try again (in case threads are still loading)
        const maxAttempts = 10;
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (attemptScroll() || attempts >= maxAttempts) {
            clearInterval(interval);
          }
        }, 100);
      },
    }));

    const loadThreads = async () => {
      if (!documentId) return;

      try {
        setLoading(true);
        const response = await api.get(
          `/comments/documents/${documentId}/threads`
        );
        // Load comments for each thread
        const threadsWithComments = await Promise.all(
          response.data.map(async (thread: CommentThread) => {
            try {
              const commentsResponse = await api.get(
                `/comments/threads/${thread.id}/comments`
              );
              return { ...thread, comments: commentsResponse.data };
            } catch {
              return { ...thread, comments: [] };
            }
          })
        );
        setThreads(threadsWithComments);
        if (onThreadUpdate) {
          onThreadUpdate();
        }
      } catch (error) {
        console.error('Error loading threads:', error);
      } finally {
        setLoading(false);
      }
    };

    const handleCreateThread = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newThreadContent.trim() || creatingThread) return;

      try {
        setCreatingThread(true);
        const response = await api.post('/comments/threads', {
          document_id: documentId,
          position: newThreadPosition || null,
        });

        // Create first comment in the thread
        await api.post('/comments/', {
          thread_id: response.data.id,
          content: newThreadContent.trim(),
        });

        setNewThreadPosition('');
        setNewThreadContent('');
        await loadThreads();
      } catch (error: any) {
        console.error('Error creating thread:', error);
        alert(
          error.response?.data?.detail || 'Failed to create comment thread'
        );
      } finally {
        setCreatingThread(false);
      }
    };

    const handleDeleteThread = async () => {
      if (!deleteThreadId) return;

      try {
        await api.delete(`/comments/threads/${deleteThreadId}`);
        setDeleteThreadId(null);
        await loadThreads();
      } catch (error: any) {
        console.error('Error deleting thread:', error);
        alert(error.response?.data?.detail || 'Failed to delete thread');
      }
    };

    const handleResolveThread = async (
      threadId: string,
      isResolved: boolean
    ) => {
      try {
        await api.patch(`/comments/threads/${threadId}`, {
          is_resolved: !isResolved,
        });
        await loadThreads();
      } catch (error: any) {
        console.error('Error resolving thread:', error);
        alert(error.response?.data?.detail || 'Failed to update thread');
      }
    };

    if (!isOpen) return null;

    return (
      <div className='fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-lg flex flex-col z-40'>
        <div className='flex items-center justify-between p-4 border-b border-gray-200'>
          <div className='flex items-center space-x-2'>
            <ChatBubbleLeftRightIcon className='h-5 w-5 text-gray-600' />
            <h2 className='text-lg font-semibold text-gray-900'>Comments</h2>
          </div>
          <button
            onClick={onClose}
            className='p-1 text-gray-400 hover:text-gray-600 rounded'
          >
            <XMarkIcon className='h-5 w-5' />
          </button>
        </div>

        <div
          ref={threadsContainerRef}
          className='flex-1 overflow-y-auto p-4 space-y-4'
        >
          {loading ? (
            <div className='text-center text-gray-500 py-8'>Loading...</div>
          ) : threads.length === 0 ? (
            <div className='text-center text-gray-500 py-8'>
              No comments yet. Be the first to comment!
            </div>
          ) : (
            threads.map(thread => (
              <div
                key={thread.id}
                data-thread-id={thread.id}
                className='transition-all duration-300'
              >
                <CommentThreadComponent
                  thread={thread}
                  currentUserId={user?.id || ''}
                  onDelete={(threadId: string) => setDeleteThreadId(threadId)}
                  onResolve={handleResolveThread}
                  onUpdate={loadThreads}
                />
              </div>
            ))
          )}
        </div>

        <div className='border-t border-gray-200 p-4'>
          <form onSubmit={handleCreateThread} className='space-y-3'>
            <input
              type='text'
              placeholder='Position (optional, e.g., line:10)'
              value={newThreadPosition}
              onChange={e => setNewThreadPosition(e.target.value)}
              className='w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500'
            />
            <textarea
              placeholder='Add a comment...'
              value={newThreadContent}
              onChange={e => setNewThreadContent(e.target.value)}
              required
              rows={3}
              className='w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none'
            />
            <button
              type='submit'
              disabled={creatingThread || !newThreadContent.trim()}
              className='w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium'
            >
              <PlusIcon className='h-4 w-4' />
              <span>{creatingThread ? 'Creating...' : 'Add Comment'}</span>
            </button>
          </form>
        </div>

        {/* Delete confirmation dialog */}
        <ConfirmDialog
          isOpen={deleteThreadId !== null}
          title='Delete Comment Thread'
          message='Are you sure you want to delete this comment thread? All comments in this thread will be permanently deleted. This action cannot be undone.'
          confirmText='Delete'
          cancelText='Cancel'
          onConfirm={handleDeleteThread}
          onCancel={() => setDeleteThreadId(null)}
          variant='danger'
        />
      </div>
    );
  }
);

CommentPanel.displayName = 'CommentPanel';

export default CommentPanel;
