import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

interface CommentQuickCreateProps {
  position: { pos: number; x: number; y: number };
  onCreate: (content: string) => void;
  onCancel: () => void;
}

const CommentQuickCreate: React.FC<CommentQuickCreateProps> = ({
  position,
  onCreate,
  onCancel,
}) => {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus textarea when component mounts
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    // Handle click outside to close
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onCancel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    await onCreate(content);
    setSubmitting(false);
    setContent('');
  };

  return (
    <div
      ref={formRef}
      className='fixed bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 min-w-[300px] max-w-[400px]'
      style={{
        left: `${position.x + 20}px`,
        top: `${position.y - 10}px`,
      }}
    >
      <div className='flex items-center justify-between mb-2'>
        <h3 className='text-sm font-semibold text-gray-900'>Add Comment</h3>
        <button
          onClick={onCancel}
          className='p-1 text-gray-400 hover:text-gray-600 rounded'
        >
          <XMarkIcon className='h-4 w-4' />
        </button>
      </div>
      <form onSubmit={handleSubmit} className='space-y-2'>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder='Write a comment...'
          required
          rows={3}
          className='w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none'
          disabled={submitting}
        />
        <div className='flex justify-end space-x-2'>
          <button
            type='button'
            onClick={onCancel}
            disabled={submitting}
            className='px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50'
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={submitting || !content.trim()}
            className='px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1'
          >
            <PaperAirplaneIcon className='h-4 w-4' />
            <span>{submitting ? 'Posting...' : 'Post'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommentQuickCreate;
