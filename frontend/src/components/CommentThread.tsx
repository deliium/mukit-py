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
}

const CommentThreadComponent: React.FC<CommentThreadProps> = ({
  thread,
  currentUserId,
  onDelete,
  onResolve,
  onUpdate,
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
            onClick={() => onDelete(thread.id)}
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
