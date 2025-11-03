import React, { useState } from 'react';
import {
  PencilIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  CheckIcon,
  XMarkIcon as XIcon,
} from '@heroicons/react/24/outline';
import { Comment as CommentType } from '../types';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ConfirmDialog from './ConfirmDialog';

interface CommentProps {
  comment: CommentType & { replies?: CommentType[] };
  currentUserId: string;
  onUpdate: () => void;
}

const CommentComponent: React.FC<CommentProps> = ({
  comment,
  currentUserId,
  onUpdate,
}) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isAuthor = comment.author_id === currentUserId;
  const authorName = user?.username || 'Unknown';

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContent.trim() || submitting) return;

    try {
      setSubmitting(true);
      await api.patch(`/comments/${comment.id}`, {
        content: editContent.trim(),
      });
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error updating comment:', error);
      alert(error.response?.data?.detail || 'Failed to update comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/comments/${comment.id}`);
      setShowDeleteConfirm(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      alert(error.response?.data?.detail || 'Failed to delete comment');
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || submitting) return;

    try {
      setSubmitting(true);
      await api.post('/comments/', {
        thread_id: comment.thread_id,
        content: replyContent.trim(),
        parent_id: comment.id,
      });
      setReplyContent('');
      setIsReplying(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error adding reply:', error);
      alert(error.response?.data?.detail || 'Failed to add reply');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className='space-y-2'>
      <div className='bg-gray-50 rounded-lg p-3'>
        <div className='flex items-start justify-between mb-2'>
          <div className='flex-1'>
            <div className='flex items-center space-x-2'>
              <span className='text-sm font-medium text-gray-900'>
                {authorName}
              </span>
              {comment.is_edited && (
                <span className='text-xs text-gray-500'>(edited)</span>
              )}
              <span className='text-xs text-gray-500'>
                {formatDate(comment.created_at)}
              </span>
            </div>
          </div>
          {isAuthor && (
            <div className='flex items-center space-x-1'>
              <button
                onClick={() => {
                  setEditContent(comment.content);
                  setIsEditing(true);
                }}
                className='p-1 text-gray-400 hover:text-gray-600 rounded'
                title='Edit comment'
              >
                <PencilIcon className='h-3.5 w-3.5' />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className='p-1 text-red-400 hover:text-red-600 rounded'
                title='Delete comment'
              >
                <TrashIcon className='h-3.5 w-3.5' />
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleEdit} className='space-y-2'>
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              required
              rows={2}
              className='w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none'
            />
            <div className='flex justify-end space-x-2'>
              <button
                type='button'
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(comment.content);
                }}
                className='p-1 text-gray-400 hover:text-gray-600'
              >
                <XIcon className='h-4 w-4' />
              </button>
              <button
                type='submit'
                disabled={submitting || !editContent.trim()}
                className='p-1 text-green-600 hover:text-green-700 disabled:opacity-50'
              >
                <CheckIcon className='h-4 w-4' />
              </button>
            </div>
          </form>
        ) : (
          <p className='text-sm text-gray-700 whitespace-pre-wrap'>
            {comment.content}
          </p>
        )}

        {!isEditing && !isReplying && (
          <button
            onClick={() => setIsReplying(true)}
            className='mt-2 flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700'
          >
            <ArrowUturnLeftIcon className='h-3 w-3' />
            <span>Reply</span>
          </button>
        )}

        {isReplying && (
          <form onSubmit={handleReply} className='mt-2 space-y-2'>
            <textarea
              placeholder='Write a reply...'
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              required
              rows={2}
              className='w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none'
            />
            <div className='flex justify-end space-x-2'>
              <button
                type='button'
                onClick={() => {
                  setIsReplying(false);
                  setReplyContent('');
                }}
                className='px-2 py-1 text-xs text-gray-600 hover:text-gray-800'
              >
                Cancel
              </button>
              <button
                type='submit'
                disabled={submitting || !replyContent.trim()}
                className='px-2 py-1 text-xs bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {submitting ? 'Posting...' : 'Reply'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Render replies recursively */}
      {comment.replies && comment.replies.length > 0 && (
        <div className='ml-6 space-y-2 border-l-2 border-gray-200 pl-4'>
          {comment.replies.map(reply => (
            <CommentComponent
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title='Delete Comment'
        message='Are you sure you want to delete this comment? This action cannot be undone.'
        confirmText='Delete'
        cancelText='Cancel'
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        variant='danger'
      />
    </div>
  );
};

export default CommentComponent;
