import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Cog6ToothIcon,
  XMarkIcon,
  GlobeAltIcon,
  LockClosedIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon as XIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { useWebSocket } from '../hooks/useWebSocket';
import ProseMirrorEditor, {
  ProseMirrorEditorRef,
} from '../components/ProseMirrorEditor';
import CommentPanel, { CommentPanelRef } from '../components/CommentPanel';
import CommentQuickCreate from '../components/CommentQuickCreate';
import { Document } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const DocumentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [content, setContent] = useState<object | string>('');
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [showComments, setShowComments] = useState(false);
  const commentPanelRef = useRef<CommentPanelRef | null>(null);
  const [commentThreads, setCommentThreads] = useState<
    Array<{ id: string; position: string | null; is_resolved: boolean }>
  >([]);
  const [commentPosition, setCommentPosition] = useState<{
    pos: number;
    x: number;
    y: number;
  } | null>(null);
  const editorRef = useRef<ProseMirrorEditorRef | null>(null);

  // WebSocket connection for real-time collaboration
  const documentId = id || '';
  const token = localStorage.getItem('token') || '';

  // Refs for content tracking to prevent overwriting local changes
  const saveTimerRef = useRef<number | null>(null);
  const lastContentRef = useRef<object | string>('');
  const lastSentContentRef = useRef<object | string>('');
  const currentContentRef = useRef<object | string>('');
  const isLocalEditRef = useRef(false);

  // Check if current user is the document owner
  const isOwner = user && document && user.id === document.owner_id;

  // Only log in development mode, not in tests
  if (import.meta.env.MODE !== 'test') {
    console.log('Document: Rendering with', {
      documentId,
      token: token ? 'present' : 'missing',
    });
  }

  // Load document data and comment threads
  useEffect(() => {
    const loadDocument = async () => {
      if (!documentId) return;

      try {
        setLoading(true);
        const response = await api.get(`/documents/${documentId}`);
        const docData = response.data;
        setDocument(docData);
        setIsPublic(docData.is_public || false);

        // Set initial content
        if (docData.content) {
          setContent(docData.content);
          currentContentRef.current = docData.content;
          lastContentRef.current = docData.content;
          lastSentContentRef.current = docData.content;
        }

        // Load comment threads
        try {
          const threadsResponse = await api.get(
            `/comments/documents/${documentId}/threads`
          );
          setCommentThreads(
            threadsResponse.data.map((t: any) => ({
              id: t.id,
              position: t.position,
              is_resolved: t.is_resolved,
            }))
          );
        } catch (error) {
          console.error('Error loading comment threads:', error);
        }

        // Only log in development mode, not in tests
        if (import.meta.env.MODE !== 'test') {
          console.log('Document loaded:', docData);
        }
      } catch (error) {
        console.error('Error loading document:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [documentId]);

  const { sendContentChange, connected } = useWebSocket({
    documentId,
    token,
    onContentChange: (newContent: any, user?: any) => {
      // Only log in development mode, not in tests
      if (import.meta.env.MODE !== 'test') {
        console.log(
          'Document: Content changed via WebSocket',
          newContent,
          user
        );
      }

      // If we're in the middle of a local edit, ignore WebSocket updates
      // (they might be stale or echo back)
      if (isLocalEditRef.current) {
        if (import.meta.env.MODE !== 'test') {
          console.log(
            'Document: Ignoring WebSocket update (local edit in progress)'
          );
        }
        return;
      }

      // Compare with current content in editor
      const currentContentStr = JSON.stringify(currentContentRef.current);
      const newContentStr = JSON.stringify(newContent);

      // Only update if content is actually different
      if (currentContentStr === newContentStr) {
        if (import.meta.env.MODE !== 'test') {
          console.log(
            'Document: Ignoring WebSocket update (same as current content)'
          );
        }
        return;
      }

      // Update content from WebSocket (this is a real update from another user)
      setContent(newContent);
      currentContentRef.current = newContent;
    },
  });

  // Debounced autosave handler
  const handleContentChange = (json: object) => {
    // Mark that we're doing a local edit
    isLocalEditRef.current = true;

    // Update current content immediately
    currentContentRef.current = json;
    lastContentRef.current = json;

    // Send via WebSocket for real-time collaboration
    sendContentChange(json);

    // Save to server with debounce
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        if (!documentId) return;
        await api.put(`/documents/${documentId}`, {
          content: lastContentRef.current,
        });
        // Only update lastSentContentRef after successful save
        lastSentContentRef.current = lastContentRef.current;
        // Clear local edit flag after save
        isLocalEditRef.current = false;
      } catch (e) {
        console.error('Autosave error:', e);
        // Clear flag even on error after a delay
        setTimeout(() => {
          isLocalEditRef.current = false;
        }, 1000);
      }
    }, 600);
  };

  const handleTogglePublic = async () => {
    if (!documentId || updating) return;

    try {
      setUpdating(true);
      const response = await api.put(`/documents/${documentId}`, {
        is_public: !isPublic,
      });
      setIsPublic(response.data.is_public);
      setDocument(response.data);
      setShowSettings(false);
    } catch (error: any) {
      console.error('Error updating document:', error);
      alert(error.response?.data?.detail || 'Failed to update document');
    } finally {
      setUpdating(false);
    }
  };

  const handleTitleClick = () => {
    if (!isOwner || loading || !document) return;
    setEditedTitle(document.title);
    setIsEditingTitle(true);
    // Focus input after state update
    setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 0);
  };

  const handleTitleSave = async () => {
    if (!documentId || !editedTitle.trim() || updating) return;

    const newTitle = editedTitle.trim();
    if (newTitle === document?.title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      setUpdating(true);
      const response = await api.put(`/documents/${documentId}`, {
        title: newTitle,
      });
      setDocument(response.data);
      setIsEditingTitle(false);
    } catch (error: any) {
      console.error('Error updating title:', error);
      alert(error.response?.data?.detail || 'Failed to update title');
      // Reset to original title on error
      setEditedTitle(document?.title || '');
    } finally {
      setUpdating(false);
    }
  };

  const handleTitleCancel = () => {
    setEditedTitle(document?.title || '');
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleTitleCancel();
    }
  };

  const handleCommentClick = useCallback(
    async (position: number, coords: { x: number; y: number }) => {
      if (!documentId || !editorRef.current) {
        return;
      }

      // Get current content from editor immediately
      const editorContent = editorRef.current.getContent();
      if (!editorContent) {
        // No content to save, just show comment dialog
        setCommentPosition({ pos: position, x: coords.x, y: coords.y });
        return;
      }

      try {
        // Mark that we're saving - this will prevent WebSocket from overwriting
        isLocalEditRef.current = true;

        // Clear any pending autosave timer
        if (saveTimerRef.current) {
          window.clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }

        // Update refs with current editor content
        currentContentRef.current = editorContent;

        // Save content immediately and wait for it to complete
        await api.put(`/documents/${documentId}`, {
          content: editorContent,
        });

        // Update refs after successful save
        lastContentRef.current = editorContent;
        lastSentContentRef.current = editorContent;

        // Send content change via WebSocket
        sendContentChange(editorContent);

        // Update content state to match what we just saved
        setContent(editorContent);

        // Clear local edit flag after a short delay to allow WebSocket echo to be filtered
        setTimeout(() => {
          isLocalEditRef.current = false;
        }, 100);

        // Now show comment dialog
        setCommentPosition({ pos: position, x: coords.x, y: coords.y });
      } catch (error) {
        console.error('Error saving content before comment:', error);
        // Still show comment dialog even if save failed
        setCommentPosition({ pos: position, x: coords.x, y: coords.y });
        isLocalEditRef.current = false;
      }
    },
    [documentId, sendContentChange]
  );

  const handleMarkerClick = useCallback(
    (threadId: string) => {
      // Open comment panel if closed
      if (!showComments) {
        setShowComments(true);
        // Wait for panel to open and load, then scroll to thread
        setTimeout(() => {
          if (commentPanelRef.current) {
            commentPanelRef.current.scrollToThread(threadId);
          }
        }, 300);
      } else {
        // Panel already open, scroll immediately
        if (commentPanelRef.current) {
          commentPanelRef.current.scrollToThread(threadId);
        }
      }
    },
    [showComments]
  );

  const handleCreateCommentAtPosition = async (content: string) => {
    if (!documentId || !commentPosition || !content.trim()) return;

    try {
      // Content should already be saved from handleCommentClick,
      // but if for some reason it wasn't, save it now
      if (editorRef.current) {
        const editorContent = editorRef.current.getContent();
        if (
          editorContent &&
          JSON.stringify(editorContent) !==
            JSON.stringify(lastSentContentRef.current)
        ) {
          // Content changed since Ctrl+Click, save it now
          try {
            await api.put(`/documents/${documentId}`, {
              content: editorContent,
            });
            lastSentContentRef.current = editorContent;
            lastContentRef.current = editorContent;
            currentContentRef.current = editorContent;
          } catch (e) {
            console.error('Error saving content before comment creation:', e);
            // Continue anyway - don't block comment creation
          }
        }
      }

      // Create thread with position
      const threadResponse = await api.post('/comments/threads', {
        document_id: documentId,
        position: `pos:${commentPosition.pos}`,
      });

      // Create first comment
      await api.post('/comments/', {
        thread_id: threadResponse.data.id,
        content: content.trim(),
      });

      // Reload threads
      const threadsResponse = await api.get(
        `/comments/documents/${documentId}/threads`
      );
      setCommentThreads(
        threadsResponse.data.map((t: any) => ({
          id: t.id,
          position: t.position,
          is_resolved: t.is_resolved,
        }))
      );

      // Refresh comment panel if it's open
      if (showComments && commentPanelRef.current) {
        commentPanelRef.current.refresh();
      }

      setCommentPosition(null);
      if (!showComments) {
        setShowComments(true);
      }
    } catch (error: any) {
      console.error('Error creating comment:', error);
      alert(error.response?.data?.detail || 'Failed to create comment');
    }
  };

  return (
    <div className='h-screen flex flex-col'>
      <div className='bg-white border-b px-6 py-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3 flex-1 min-w-0'>
            {isEditingTitle && isOwner ? (
              <div className='flex items-center space-x-2 flex-1 min-w-0'>
                <input
                  ref={titleInputRef}
                  type='text'
                  value={editedTitle}
                  onChange={e => setEditedTitle(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  disabled={updating}
                  className='text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-primary-500 focus:outline-none focus:border-primary-600 flex-1 min-w-0'
                  maxLength={255}
                />
                <button
                  onClick={handleTitleSave}
                  disabled={updating}
                  className='p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors'
                  title='Save title'
                >
                  <CheckIcon className='h-5 w-5' />
                </button>
                <button
                  onClick={handleTitleCancel}
                  disabled={updating}
                  className='p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors'
                  title='Cancel editing'
                >
                  <XIcon className='h-5 w-5' />
                </button>
              </div>
            ) : (
              <div
                className={`flex items-center space-x-2 flex-1 min-w-0 ${
                  isOwner && !loading ? 'group cursor-pointer' : ''
                }`}
                onClick={handleTitleClick}
                title={isOwner && !loading ? 'Click to edit title' : ''}
              >
                <h1 className='text-2xl font-bold text-gray-900 truncate'>
                  {loading
                    ? 'Loading...'
                    : document?.title || 'Untitled Document'}
                </h1>
                {isOwner && !loading && (
                  <PencilIcon className='h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0' />
                )}
              </div>
            )}
            {/* Public/Private indicator */}
            {!loading && (
              <div
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium mr-4 ${
                  isPublic
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                {isPublic ? (
                  <>
                    <GlobeAltIcon className='h-3.5 w-3.5' />
                    <span>Public</span>
                  </>
                ) : (
                  <>
                    <LockClosedIcon className='h-3.5 w-3.5' />
                    <span>Private</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className='flex items-center space-x-4 ml-4'>
            <div className='flex items-center space-x-2'>
              <div
                className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <span className='text-sm text-gray-600'>
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className='flex items-center space-x-2'>
              <button
                onClick={() => setShowComments(!showComments)}
                className={`p-2 rounded transition-colors ${
                  showComments
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                title='Toggle comments'
              >
                <ChatBubbleLeftRightIcon className='h-5 w-5' />
              </button>
              {isOwner && (
                <button
                  onClick={() => setShowSettings(true)}
                  className='p-2 text-gray-400 hover:text-gray-600 transition-colors'
                  title='Document settings'
                >
                  <Cog6ToothIcon className='h-5 w-5' />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className='flex-1 flex relative'>
        <div className='flex-1'>
          {loading ? (
            <div className='flex items-center justify-center h-full'>
              <div className='text-gray-500'>Loading document...</div>
            </div>
          ) : (
            <>
              <ProseMirrorEditor
                ref={editorRef}
                value={content}
                onChange={handleContentChange}
                className='h-full'
                onCommentClick={handleCommentClick}
                onMarkerClick={handleMarkerClick}
                commentThreads={commentThreads}
              />
              {commentPosition && (
                <CommentQuickCreate
                  position={commentPosition}
                  onCreate={handleCreateCommentAtPosition}
                  onCancel={() => setCommentPosition(null)}
                />
              )}
            </>
          )}
        </div>
        {documentId && (
          <CommentPanel
            ref={commentPanelRef}
            documentId={documentId}
            isOpen={showComments}
            onClose={() => setShowComments(false)}
            onThreadUpdate={() => {
              // Reload threads to update markers
              api
                .get(`/comments/documents/${documentId}/threads`)
                .then(response => {
                  setCommentThreads(
                    response.data.map((t: any) => ({
                      id: t.id,
                      position: t.position,
                      is_resolved: t.is_resolved,
                    }))
                  );
                })
                .catch(console.error);
            }}
          />
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
          <div className='bg-white rounded-lg shadow-xl max-w-md w-full mx-4'>
            <div className='flex items-center justify-between p-6 border-b'>
              <h2 className='text-xl font-semibold text-gray-900'>
                Document Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className='text-gray-400 hover:text-gray-600'
              >
                <XMarkIcon className='h-5 w-5' />
              </button>
            </div>

            <div className='p-6 space-y-6'>
              {isOwner ? (
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='text-sm font-medium text-gray-900'>
                      Public Document
                    </h3>
                    <p className='text-sm text-gray-500 mt-1'>
                      Allow anyone with the link to view this document
                    </p>
                  </div>
                  <label className='relative inline-flex items-center cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={isPublic}
                      onChange={handleTogglePublic}
                      disabled={updating}
                      className='sr-only peer'
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              ) : (
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='text-sm font-medium text-gray-900'>
                      Public Document
                    </h3>
                    <p className='text-sm text-gray-500 mt-1'>
                      {isPublic
                        ? 'This document is publicly accessible'
                        : 'This document is private'}
                    </p>
                  </div>
                  <div className='flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-md'>
                    {isPublic ? (
                      <>
                        <GlobeAltIcon className='h-4 w-4 text-gray-600' />
                        <span className='text-sm text-gray-600'>Public</span>
                      </>
                    ) : (
                      <>
                        <LockClosedIcon className='h-4 w-4 text-gray-600' />
                        <span className='text-sm text-gray-600'>Private</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className='flex justify-end space-x-3 pt-4 border-t'>
                <button
                  onClick={() => setShowSettings(false)}
                  className='px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200'
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentPage;
