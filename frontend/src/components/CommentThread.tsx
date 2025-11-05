import React, { useState } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { CommentThread as CommentThreadType, Comment } from '../types';
import { api } from '../services/api';
import CommentComponent from './Comment';

interface CommentThreadProps {
  thread: CommentThreadType;
  currentUserId: string;
  onDelete: (threadId: string) => void;
  onResolve: (threadId: string, isResolved: boolean) => void;
  onUpdate: () => void;
  editorRef?: React.RefObject<any>;
}

const CommentThreadComponent: React.FC<CommentThreadProps> = ({
  thread,
  currentUserId,
  onDelete,
  onResolve,
  onUpdate,
  editorRef,
}) => {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const handleReply = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    if (!replyContent.trim() || submittingReply) return;

    try {
      setSubmittingReply(true);
      await api.post('/comments/', {
        thread_id: thread.id,
        content: replyContent.trim(),
        parent_id: parentId || null,
      });
      setReplyContent('');
      setReplyingTo(null);
      onUpdate();
    } catch (error: any) {
      console.error('Error adding reply:', error);
      alert(error.response?.data?.detail || 'Failed to add reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Build comment tree
  const buildCommentTree = (comments: Comment[]): Comment[] => {
    const commentMap = new Map<string, Comment & { replies: Comment[] }>();
    const rootComments: Comment[] = [];

    // First pass: create map of all comments
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build tree
    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!;
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(commentWithReplies);
        } else {
          rootComments.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments;
  };

  const commentTree = thread.comments ? buildCommentTree(thread.comments) : [];

  return (
    <div
      className={`border rounded-lg p-4 space-y-3 ${
        thread.is_resolved
          ? 'bg-gray-50 border-gray-200'
          : 'bg-white border-gray-300'
      }`}
    >
      <div className='flex items-start justify-between'>
        <div className='flex-1'>
          {thread.position && (
            <div className='text-xs text-gray-500 mb-1'>
              Position: {thread.position}
            </div>
          )}
          <div className='flex items-center space-x-2'>
            {thread.is_resolved && (
              <CheckCircleIcon className='h-4 w-4 text-green-500' />
            )}
            <span
              className={`text-xs font-medium ${
                thread.is_resolved ? 'text-green-600' : 'text-gray-600'
              }`}
            >
              {thread.is_resolved ? 'Resolved' : 'Open'}
            </span>
          </div>
        </div>
        <div className='flex items-center space-x-2'>
          <button
            onClick={() => onResolve(thread.id, thread.is_resolved)}
            className='p-1 text-gray-400 hover:text-gray-600 rounded'
            title={thread.is_resolved ? 'Reopen thread' : 'Resolve thread'}
          >
            {thread.is_resolved ? (
              <XCircleIcon className='h-4 w-4' />
            ) : (
              <CheckCircleIcon className='h-4 w-4' />
            )}
          </button>
          <button
            onMouseDown={e => {
              // CRITICAL: Save editor focus state on mousedown (BEFORE click steals focus)
              // This ensures we capture the cursor position while editor still has focus
              // mousedown fires before the button receives focus
              const view = editorRef?.current?.getView?.();
              const hadFocus =
                view &&
                typeof document !== 'undefined' &&
                document &&
                (document as any).activeElement === view.dom;
              const selection =
                view && hadFocus && view.state ? view.state.selection : null;

              // DEBUG: Log focus state before delete button mousedown
              if (import.meta.env.MODE !== 'test') {
                console.log(
                  '🔍 [CURSOR DEBUG] Before delete button mousedown:',
                  {
                    activeElement:
                      typeof document !== 'undefined' && document
                        ? (document as any).activeElement?.tagName
                        : null,
                    editorHasFocus: hadFocus,
                    selection: selection
                      ? {
                          anchor: selection.anchor,
                          head: selection.head,
                          from: selection.from,
                          to: selection.to,
                        }
                      : null,
                    docSize: view?.state?.doc?.content?.size || 0,
                    timestamp: new Date().toISOString(),
                  }
                );
              }

              // Store focus state globally so handleDeleteThread can access it
              if (
                hadFocus &&
                view &&
                selection &&
                typeof window !== 'undefined'
              ) {
                (window as any).__lastEditorFocusState = {
                  hadFocus,
                  selection: {
                    anchor: selection.anchor,
                    head: selection.head,
                    from: selection.from,
                    to: selection.to,
                  },
                  docSize: view.state.doc.content.size,
                };
              }

              // Prevent default to keep focus on editor
              // But we still want the click to work, so we'll handle it manually
              e.preventDefault();

              // Trigger delete after a tiny delay to allow focus state to be saved
              setTimeout(() => {
                onDelete(thread.id);
              }, 0);
            }}
            onClick={e => {
              // Prevent default click behavior since we handle it in mousedown
              e.preventDefault();
            }}
            className='p-1 text-red-400 hover:text-red-600 rounded'
            title='Delete thread'
          >
            <TrashIcon className='h-4 w-4' />
          </button>
        </div>
      </div>

      <div className='space-y-3'>
        {commentTree.map(comment => (
          <CommentComponent
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            onUpdate={onUpdate}
          />
        ))}
      </div>

      {!replyingTo && (
        <form
          onSubmit={e => handleReply(e)}
          className='space-y-2 border-t pt-3'
        >
          <textarea
            placeholder='Add a reply...'
            value={replyContent}
            onChange={e => setReplyContent(e.target.value)}
            required
            rows={2}
            className='w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none'
          />
          <div className='flex justify-end space-x-2'>
            <button
              type='button'
              onClick={() => {
                setReplyContent('');
                setReplyingTo(null);
              }}
              className='px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={submittingReply || !replyContent.trim()}
              className='px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {submittingReply ? 'Posting...' : 'Reply'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CommentThreadComponent;
