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
import { TextSelection } from 'prosemirror-state';

const DocumentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [content, setContent] = useState<object | string>('');
  const [document, setDocument] = useState<Document | null>(null);
  const blockContentUpdatesRef = useRef(false);
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
  const [isDeletingComment, setIsDeletingComment] = useState(false);
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
  const positionUpdateTimerRef = useRef<number | null>(null);
  const pendingPositionUpdatesRef = useRef<Map<string, number>>(new Map());

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

      // CRITICAL: Never reload document if we're blocking content updates
      // This prevents restoring deleted text after comment deletion
      if (blockContentUpdatesRef.current) {
        if (import.meta.env.MODE !== 'test') {
          console.log(
            'Document: Blocking loadDocument - comment deletion in progress'
          );
        }
        return;
      }

      // Add logging to track when document is loaded
      if (import.meta.env.MODE !== 'test') {
        console.log('Document: loadDocument called', {
          documentId,
          blockContentUpdates: blockContentUpdatesRef.current,
          timestamp: new Date().toISOString(),
        });
      }

      try {
        setLoading(true);
        const response = await api.get(`/documents/${documentId}`);
        const docData = response.data;

        // CRITICAL: Check again after API call - block might have been set during async operation
        if (blockContentUpdatesRef.current) {
          if (import.meta.env.MODE !== 'test') {
            console.log(
              'Document: Blocking setContent after API call - comment deletion in progress',
              {
                receivedContentSize: docData.content
                  ? JSON.stringify(docData.content).length
                  : 0,
                currentContentSize: currentContentRef.current
                  ? JSON.stringify(currentContentRef.current).length
                  : 0,
              }
            );
          }
          // Still update document metadata, but NOT content
          // Create a copy without content to prevent content restoration
          const docDataWithoutContent = { ...docData };
          delete docDataWithoutContent.content;
          setDocument(docDataWithoutContent as any);
          setIsPublic(docData.is_public || false);
          setLoading(false);
          return;
        }

        // CRITICAL: Only update document metadata, NEVER content from response
        // This prevents restoring old content after comment deletion
        const docDataSafe = { ...docData };
        // Remove content from document state to prevent accidental restoration
        // We manage content separately via content state
        delete docDataSafe.content;
        setDocument(docDataSafe as any);
        setIsPublic(docData.is_public || false);

        // Set initial content - but only if not blocked
        if (docData.content && !blockContentUpdatesRef.current) {
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

      // CRITICAL: If we're in the middle of deleting a comment, NEVER update content
      // This prevents restoring deleted text when comment is auto-deleted
      if (isLocalEditRef.current) {
        if (import.meta.env.MODE !== 'test') {
          console.log(
            'Document: Blocking WebSocket update during comment deletion (isLocalEditRef is true)'
          );
        }
        return;
      }

      // Additional check: if we just deleted a comment, the incoming content
      // might be stale (from before deletion). If current content is larger,
      // prefer keeping current content.
      const currentSize = currentContentStr.length;
      const newSize = newContentStr.length;
      if (
        currentSize > newSize &&
        currentSize - newSize > 50 &&
        currentContentRef.current &&
        typeof currentContentRef.current === 'object'
      ) {
        if (import.meta.env.MODE !== 'test') {
          console.log(
            'Document: Ignoring WebSocket update - current content is larger (possibly after comment deletion)'
          );
        }
        return;
      }

      // CRITICAL: Block ALL content updates if we're in deletion mode
      if (blockContentUpdatesRef.current) {
        if (import.meta.env.MODE !== 'test') {
          console.log(
            'Document: Blocking WebSocket content update - comment deletion in progress',
            {
              receivedContentSize: JSON.stringify(newContent).length,
              currentContentSize: JSON.stringify(currentContentRef.current)
                .length,
            }
          );
        }
        return;
      }

      // Update content from WebSocket (this is a real update from another user)
      setContent(newContent);
      currentContentRef.current = newContent;
      lastContentRef.current = newContent;

      // Reload comment threads when content is updated via WebSocket
      // to ensure positions are in sync (positions may have been updated
      // on the server when another user edited the document)
      if (documentId) {
        // Debounce thread reload to avoid too many requests
        setTimeout(() => {
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
            .catch(() => {
              // Silently fail - thread reload is not critical
            });
        }, 300);
      }
    },
  });

  // Debounced autosave handler
  const handleContentChange = (json: object) => {
    // DEBUG: Log cursor state after content change
    if (import.meta.env.MODE !== 'test') {
      const view = editorRef.current?.getView?.();
      const selection = view?.state?.selection;
      console.log(
        '🔍 [CURSOR DEBUG] After content change (handleContentChange):',
        {
          selection: selection
            ? {
                anchor: selection.anchor,
                head: selection.head,
                from: selection.from,
                to: selection.to,
                empty: selection.empty,
              }
            : null,
          docSize: view?.state?.doc?.content?.size || 0,
          activeElement:
            typeof document !== 'undefined' && document
              ? (document as any).activeElement?.tagName
              : null,
          hasFocus:
            view &&
            typeof document !== 'undefined' &&
            document &&
            (document as any).activeElement === view.dom,
          contentSize: JSON.stringify(json).length,
          timestamp: new Date().toISOString(),
        }
      );
    }

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
      // CRITICAL: Block autosave if we're in deletion mode
      if (blockContentUpdatesRef.current) {
        if (import.meta.env.MODE !== 'test') {
          console.log(
            'Document: Blocking autosave - comment deletion in progress'
          );
        }
        return;
      }

      try {
        if (!documentId) return;
        // Save to server but IGNORE the response - it might contain stale content
        // This is autosave, we don't need the response
        await api.put(`/documents/${documentId}`, {
          content: lastContentRef.current,
        });
        // Only update lastSentContentRef after successful save
        // DO NOT use response.data - it might contain old cached content
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
      // CRITICAL: Block content update if we're in deletion mode
      // Also remove content from document state to prevent restoration
      if (!blockContentUpdatesRef.current) {
        const docDataSafe = { ...response.data };
        delete docDataSafe.content;
        setDocument(docDataSafe as any);
      }
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
      // CRITICAL: Block content update if we're in deletion mode
      // Also remove content from document state to prevent restoration
      if (!blockContentUpdatesRef.current) {
        const docDataSafe = { ...response.data };
        delete docDataSafe.content;
        setDocument(docDataSafe as any);
      }
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
        // CRITICAL: Block if we're in deletion mode
        if (!blockContentUpdatesRef.current) {
          // Save to server but IGNORE the response - it might contain stale content
          await api.put(`/documents/${documentId}`, {
            content: editorContent,
          });
          // DO NOT use response.data - it might contain old cached content from DB

          // Update refs after successful save
          lastContentRef.current = editorContent;
          lastSentContentRef.current = editorContent;

          // Send content change via WebSocket
          sendContentChange(editorContent);

          // Update content state to match what we just saved
          setContent(editorContent);
        }

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

  const handlePositionsChange = useCallback(
    (updates: Map<string, number>) => {
      if (!documentId || updates.size === 0) return;

      // Merge with pending updates
      updates.forEach((newPos, threadId) => {
        pendingPositionUpdatesRef.current.set(threadId, newPos);
      });

      // Debounce position updates (batch multiple changes)
      if (positionUpdateTimerRef.current) {
        window.clearTimeout(positionUpdateTimerRef.current);
      }

      positionUpdateTimerRef.current = window.setTimeout(async () => {
        const updatesToSend: Record<string, string> = {};
        pendingPositionUpdatesRef.current.forEach((pos, threadId) => {
          updatesToSend[threadId] = `pos:${pos}`;
        });

        if (Object.keys(updatesToSend).length > 0) {
          try {
            await api.post('/comments/threads/update-positions', updatesToSend);
            // Don't update local state immediately - let the markers use local positions
            // Local positions are already updated in ProseMirrorEditor via refs
            // This prevents re-rendering issues during typing
            pendingPositionUpdatesRef.current.clear();
          } catch (error) {
            console.error('Error updating comment positions:', error);
          }
        }
      }, 500);
    },
    [documentId]
  );

  const handleThreadsDelete = useCallback(
    async (threadIds: string[]) => {
      if (!documentId || threadIds.length === 0) return;

      try {
        // Show loading indicator
        setIsDeletingComment(true);

        // CRITICAL: Get saved focus state from requestAnimationFrame in ProseMirrorEditor
        // This state was captured right before onThreadsDelete was called
        // This is the most reliable way to get the state before focus is lost
        const savedFocusFromDeletion =
          typeof window !== 'undefined'
            ? (window as any).__threadDeletionFocusState
            : null;

        // Get current view FIRST before clearing state
        const view = editorRef.current?.getView?.();

        // CRITICAL: If we have saved focus state and it indicates focus was present,
        // try to restore focus IMMEDIATELY before any other operations
        if (
          savedFocusFromDeletion &&
          savedFocusFromDeletion.hadFocus &&
          view &&
          view.dom
        ) {
          // Try to restore focus immediately if it was lost
          if (
            typeof document !== 'undefined' &&
            document &&
            (document as any).activeElement !== view.dom
          ) {
            view.focus();

            // DEBUG: Log immediate focus restoration attempt
            if (import.meta.env.MODE !== 'test') {
              console.log(
                '🔍 [CURSOR DEBUG] Immediate focus restoration in handleThreadsDelete:',
                {
                  activeElementBefore: (document as any).activeElement?.tagName,
                  activeElementAfter: (document as any).activeElement?.tagName,
                  timestamp: new Date().toISOString(),
                }
              );
            }
          }
        }

        // Clear the saved state immediately after using it
        if (typeof window !== 'undefined') {
          delete (window as any).__threadDeletionFocusState;
        }

        // Also try to get saved state from mousedown (for backward compatibility)
        const savedFocusFromMouseDown =
          typeof window !== 'undefined'
            ? (window as any).__lastEditorFocusState
            : null;

        // Clear the mousedown state
        if (typeof window !== 'undefined') {
          delete (window as any).__lastEditorFocusState;
        }

        // CRITICAL: Use saved focus state from deletion callback if available
        // This is the most accurate state captured right before onThreadsDelete
        // Even if focus was lost between requestAnimationFrame and here,
        // we know it SHOULD have focus based on saved state
        const hadFocus = savedFocusFromDeletion
          ? savedFocusFromDeletion.hadFocus
          : savedFocusFromMouseDown
            ? savedFocusFromMouseDown.hadFocus
            : view &&
              typeof document !== 'undefined' &&
              document &&
              (document as any).activeElement === view.dom;

        const selection = savedFocusFromDeletion
          ? savedFocusFromDeletion.selection
            ? {
                anchor: savedFocusFromDeletion.selection.anchor,
                head: savedFocusFromDeletion.selection.head,
                from: savedFocusFromDeletion.selection.from,
                to: savedFocusFromDeletion.selection.to,
              }
            : null
          : savedFocusFromMouseDown
            ? savedFocusFromMouseDown.selection
              ? {
                  anchor: savedFocusFromMouseDown.selection.anchor,
                  head: savedFocusFromMouseDown.selection.head,
                  from: savedFocusFromMouseDown.selection.from,
                  to: savedFocusFromMouseDown.selection.to,
                }
              : null
            : view && view.state
              ? view.state.selection
              : null;

        // Use saved docSize if available
        const savedDocSize = savedFocusFromDeletion
          ? savedFocusFromDeletion.docSize
          : savedFocusFromMouseDown
            ? savedFocusFromMouseDown.docSize
            : view && view.state
              ? view.state.doc.content.size
              : 0;

        // Get current editor content FIRST before any async operations
        let editorContent: object | null = null;
        if (editorRef.current) {
          editorContent = editorRef.current.getContent();
        }

        // Mark as local edit IMMEDIATELY to prevent any WebSocket overwrites
        // This will block ALL content updates during deletion
        isLocalEditRef.current = true;
        blockContentUpdatesRef.current = true; // Block ALL content state updates

        // CRITICAL: Cancel any pending autosave timers
        // This prevents autosave from running after we delete the comment
        if (saveTimerRef.current) {
          window.clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }

        if (import.meta.env.MODE !== 'test') {
          console.log(
            'Document: Starting comment deletion, blocking all content updates',
            {
              threadIds,
              timestamp: new Date().toISOString(),
            }
          );
        }
        if (editorContent) {
          currentContentRef.current = editorContent;
          lastContentRef.current = editorContent;
          lastSentContentRef.current = editorContent;
        }

        // Delete threads from server FIRST
        await Promise.all(
          threadIds.map(threadId =>
            api.delete(`/comments/threads/${threadId}`).catch(error => {
              console.error(`Error deleting thread ${threadId}:`, error);
            })
          )
        );

        // Remove from local positions ref in editor FIRST
        threadIds.forEach(threadId => {
          pendingPositionUpdatesRef.current.delete(threadId);
        });

        // Remove from local state - but defer with requestAnimationFrame to avoid re-render during deletion
        // We'll update this after we restore focus to prevent focus loss
        // Store the filtered threads for later update
        const filteredThreads = commentThreads.filter(
          thread => !threadIds.includes(thread.id)
        );

        // Save current editor content to server AFTER deletion
        // This ensures server has the latest content (with text deleted)
        // NOTE: Do NOT send via WebSocket to avoid echo that might restore old content
        // NOTE: Do NOT use response.data from API as it might contain old content
        if (editorContent) {
          try {
            // Save to server but IGNORE the response - it might contain stale content
            await api.put(`/documents/${documentId}`, {
              content: editorContent,
            });
            // Update refs to ensure they're in sync with our CURRENT content
            // DO NOT use response.data - it might be stale
            lastSentContentRef.current = editorContent;
            currentContentRef.current = editorContent;
            lastContentRef.current = editorContent;

            // DO NOT call setContent here - it will cause re-render and reset cursor position
            // We'll update content state AFTER restoring focus and selection
            // DO NOT send via WebSocket - this can cause echo that restores old content
            // DO NOT use response.data - server might return old cached content
          } catch (e) {
            console.error('Error saving content after thread deletion:', e);
          }
        }

        // CRITICAL: Restore focus and selection FIRST, BEFORE any state updates
        // This prevents React re-renders from stealing focus and resetting cursor position
        // Use saved focus state for accurate restoration
        // IMPORTANT: Get fresh view reference after deletion
        const currentView = editorRef.current?.getView?.();

        // DEBUG: Log cursor position after deletion, before restoration
        if (import.meta.env.MODE !== 'test') {
          console.log('🔍 [CURSOR DEBUG] After deletion, before restoration:', {
            savedFocusFromDeletion: savedFocusFromDeletion
              ? {
                  hadFocus: savedFocusFromDeletion.hadFocus,
                  selection: savedFocusFromDeletion.selection,
                  docSize: savedFocusFromDeletion.docSize,
                }
              : null,
            currentViewExists: !!currentView,
            currentDocSize: currentView?.state?.doc?.content?.size || 0,
            currentSelection: currentView?.state?.selection
              ? {
                  anchor: currentView.state.selection.anchor,
                  head: currentView.state.selection.head,
                  from: currentView.state.selection.from,
                  to: currentView.state.selection.to,
                }
              : null,
            activeElement:
              typeof document !== 'undefined' && document
                ? (document as any).activeElement?.tagName
                : null,
            timestamp: new Date().toISOString(),
          });
        }

        if (hadFocus && currentView && currentView.dom) {
          // Restore selection first if we have it, using saved position
          // CRITICAL: The saved selection is already mapped correctly by ProseMirror
          // because it was taken from newState.selection after transaction was applied
          if (selection && currentView.state) {
            try {
              const docSize = currentView.state.doc.content.size;
              const savedAnchor = selection.anchor;
              const savedHead = selection.head;

              // DEBUG: Log position before restoration
              if (import.meta.env.MODE !== 'test') {
                console.log(
                  '🔍 [CURSOR DEBUG] Position restoration (immediate):',
                  {
                    savedAnchor,
                    savedHead,
                    docSize,
                    savedDocSize,
                    fromSavedSelection: selection.from,
                    toSavedSelection: selection.to,
                    sizeDiff: savedDocSize - docSize,
                  }
                );
              }

              // The saved position is already correctly mapped by ProseMirror's transaction
              // Just ensure it's within bounds (document might have changed after deletion)
              let anchor = Math.max(0, Math.min(savedAnchor, docSize));
              let head = Math.max(0, Math.min(savedHead, docSize));

              // If anchor/head seem off, try using from/to which are also already mapped
              if (
                anchor === 0 &&
                head === 0 &&
                savedAnchor !== 0 &&
                savedHead !== 0
              ) {
                // This might indicate an issue, try using from/to
                anchor = Math.max(
                  0,
                  Math.min(selection.from || savedAnchor, docSize)
                );
                head = Math.max(
                  0,
                  Math.min(selection.to || savedHead, docSize)
                );

                if (import.meta.env.MODE !== 'test') {
                  console.log(
                    '🔍 [CURSOR DEBUG] Using from/to due to anchor/head at 0:',
                    {
                      from: selection.from,
                      to: selection.to,
                      newAnchor: anchor,
                      newHead: head,
                    }
                  );
                }
              }

              // CRITICAL: Only restore if position is actually different from current
              // This prevents unnecessary re-renders that might reset cursor
              const currentSelection = currentView.state.selection;
              const needsRestore =
                !currentSelection ||
                currentSelection.anchor !== anchor ||
                currentSelection.head !== head;

              if (
                needsRestore &&
                anchor >= 0 &&
                head >= 0 &&
                anchor <= docSize &&
                head <= docSize
              ) {
                const newSelection = TextSelection.create(
                  currentView.state.doc,
                  anchor,
                  head
                );
                const tr = currentView.state.tr.setSelection(newSelection);
                currentView.dispatch(tr);

                // DEBUG: Log successful restoration
                if (import.meta.env.MODE !== 'test') {
                  console.log(
                    '🔍 [CURSOR DEBUG] Selection restored (immediate):',
                    {
                      anchor,
                      head,
                      selection: {
                        anchor: newSelection.anchor,
                        head: newSelection.head,
                        from: newSelection.from,
                        to: newSelection.to,
                      },
                      docSize,
                      previousSelection: currentSelection
                        ? {
                            anchor: currentSelection.anchor,
                            head: currentSelection.head,
                          }
                        : null,
                    }
                  );
                }

                // Scroll selection into view to ensure it's visible
                currentView.dispatch(currentView.state.tr.scrollIntoView());
              } else if (!needsRestore) {
                if (import.meta.env.MODE !== 'test') {
                  console.log(
                    '🔍 [CURSOR DEBUG] Selection already correct, skipping restoration:',
                    {
                      anchor,
                      head,
                      currentSelection: currentSelection
                        ? {
                            anchor: currentSelection.anchor,
                            head: currentSelection.head,
                          }
                        : null,
                    }
                  );
                }
              } else {
                // Fallback: place cursor at end of document
                const endPos = docSize;
                if (import.meta.env.MODE !== 'test') {
                  console.log(
                    '🔍 [CURSOR DEBUG] Using end-of-document fallback (immediate):',
                    {
                      endPos,
                      docSize,
                      savedAnchor,
                      savedHead,
                      reason: 'Invalid positions',
                    }
                  );
                }
                if (endPos > 0) {
                  const newSelection = TextSelection.create(
                    currentView.state.doc,
                    endPos
                  );
                  const tr = currentView.state.tr.setSelection(newSelection);
                  currentView.dispatch(tr);
                }
              }
            } catch (e) {
              console.error('Error restoring selection:', e);
              // Ignore selection restoration errors
            }
          }

          // Immediately restore focus SYNCHRONOUSLY before any async operations
          // This is critical - we need focus restored NOW, not later
          // Use currentView instead of view to ensure we have fresh reference
          if (
            currentView &&
            currentView.dom &&
            typeof document !== 'undefined' &&
            document &&
            (document as any).activeElement !== currentView.dom
          ) {
            currentView.focus();

            // DEBUG: Log focus restoration attempt
            if (import.meta.env.MODE !== 'test') {
              console.log('🔍 [CURSOR DEBUG] Focus restored (immediate):', {
                method: 'view.focus()',
                activeElementAfter: (document as any).activeElement?.tagName,
                selectionAfter: currentView.state.selection
                  ? {
                      anchor: currentView.state.selection.anchor,
                      head: currentView.state.selection.head,
                    }
                  : null,
              });
            }
          }

          // Also try using the ref method for more reliable focus
          if (editorRef.current) {
            editorRef.current.focus();

            // DEBUG: Log ref focus attempt
            if (import.meta.env.MODE !== 'test') {
              console.log(
                '🔍 [CURSOR DEBUG] Focus restored via ref (immediate):',
                {
                  method: 'editorRef.current.focus()',
                  activeElementAfter:
                    typeof document !== 'undefined' && document
                      ? (document as any).activeElement?.tagName
                      : null,
                }
              );
            }
          }

          // Now update state AFTER focus and selection are restored
          // Use multiple requestAnimationFrame calls to ensure focus persists
          // CRITICAL: Save the restored selection before state update to restore it after
          const restoredSelection = currentView.state.selection;
          const restoredAnchor = restoredSelection.anchor;
          const restoredHead = restoredSelection.head;

          requestAnimationFrame(() => {
            // Restore focus again before state update
            // Get fresh view reference
            const freshView = editorRef.current?.getView?.();
            if (
              freshView &&
              freshView.dom &&
              typeof document !== 'undefined' &&
              document &&
              (document as any).activeElement !== freshView.dom
            ) {
              freshView.focus();
            }
            if (editorRef.current) {
              editorRef.current.focus();
            }

            // Update state - this will trigger re-render but we'll restore selection after
            // CRITICAL: Only update if content actually changed to avoid unnecessary re-renders
            if (editorContent) {
              const currentContentStr = JSON.stringify(content);
              const newContentStr = JSON.stringify(editorContent);
              if (currentContentStr !== newContentStr) {
                setContent(editorContent);
              } else {
                if (import.meta.env.MODE !== 'test') {
                  console.log(
                    '🔍 [CURSOR DEBUG] Content unchanged, skipping setContent'
                  );
                }
              }
            }
            if (filteredThreads.length !== commentThreads.length) {
              setCommentThreads(filteredThreads);
            }

            // Aggressively restore focus and selection after state updates
            requestAnimationFrame(() => {
              // Get fresh view reference after state update
              const freshView = editorRef.current?.getView?.();

              // CRITICAL: Restore selection immediately after state update
              // This prevents the value prop update from resetting cursor to beginning
              if (freshView && freshView.state) {
                try {
                  const docSize = freshView.state.doc.content.size;

                  // Ensure positions are still valid
                  const anchor = Math.max(0, Math.min(restoredAnchor, docSize));
                  const head = Math.max(0, Math.min(restoredHead, docSize));

                  // Check current selection
                  const currentSel = freshView.state.selection;
                  const needsRestore =
                    !currentSel ||
                    currentSel.anchor !== anchor ||
                    currentSel.head !== head;

                  if (
                    needsRestore &&
                    anchor >= 0 &&
                    head >= 0 &&
                    anchor <= docSize &&
                    head <= docSize
                  ) {
                    const newSelection = TextSelection.create(
                      freshView.state.doc,
                      anchor,
                      head
                    );
                    const tr = freshView.state.tr.setSelection(newSelection);
                    freshView.dispatch(tr);

                    if (import.meta.env.MODE !== 'test') {
                      console.log(
                        '🔍 [CURSOR DEBUG] Selection restored after state update:',
                        {
                          anchor,
                          head,
                          previousSelection: currentSel
                            ? {
                                anchor: currentSel.anchor,
                                head: currentSel.head,
                              }
                            : null,
                        }
                      );
                    }

                    // Scroll into view
                    freshView.dispatch(freshView.state.tr.scrollIntoView());
                  } else if (!needsRestore && import.meta.env.MODE !== 'test') {
                    console.log(
                      '🔍 [CURSOR DEBUG] Selection already correct after state update',
                      {
                        anchor,
                        head,
                        currentSelection: currentSel
                          ? {
                              anchor: currentSel.anchor,
                              head: currentSel.head,
                            }
                          : null,
                      }
                    );
                  }
                } catch (e) {
                  console.error(
                    'Error restoring selection after state update:',
                    e
                  );
                }
              }

              if (
                freshView &&
                freshView.dom &&
                typeof document !== 'undefined' &&
                document &&
                (document as any).activeElement !== freshView.dom
              ) {
                freshView.focus();
              }
              if (editorRef.current) {
                editorRef.current.focus();
              }

              // Additional attempts with setTimeout for more reliable restoration
              setTimeout(() => {
                const freshView = editorRef.current?.getView?.();
                if (
                  freshView &&
                  freshView.dom &&
                  typeof document !== 'undefined' &&
                  document &&
                  (document as any).activeElement !== freshView.dom
                ) {
                  freshView.focus();
                }
                if (editorRef.current) {
                  editorRef.current.focus();
                }
              }, 0);

              setTimeout(() => {
                const freshView = editorRef.current?.getView?.();
                if (
                  freshView &&
                  freshView.dom &&
                  typeof document !== 'undefined' &&
                  document &&
                  (document as any).activeElement !== freshView.dom
                ) {
                  freshView.focus();
                }
                if (editorRef.current) {
                  editorRef.current.focus();
                }
              }, 10);

              setTimeout(() => {
                const freshView = editorRef.current?.getView?.();
                if (
                  freshView &&
                  freshView.dom &&
                  typeof document !== 'undefined' &&
                  document &&
                  (document as any).activeElement !== freshView.dom
                ) {
                  freshView.focus();
                }
                if (editorRef.current) {
                  editorRef.current.focus();
                }
              }, 50);
            });
          });
        } else {
          // If we didn't have focus, just update state normally
          if (editorContent) {
            setContent(editorContent);
          }
          if (filteredThreads.length !== commentThreads.length) {
            setCommentThreads(filteredThreads);
          }
        }

        // Keep local edit flag active longer to prevent WebSocket restoration
        // This prevents any incoming WebSocket updates from restoring old content
        setTimeout(() => {
          isLocalEditRef.current = false;
          blockContentUpdatesRef.current = false; // Unblock content updates

          // Refresh comment panel AFTER blocking is removed
          // This ensures panel shows updated threads list without deleted threads
          // NOTE: We do this AFTER unblocking to ensure onThreadUpdate doesn't reload document
          if (commentPanelRef.current) {
            commentPanelRef.current.refresh();
          }
        }, 3000); // Very long timeout to ensure everything is stable

        // Hide loading indicator
        setIsDeletingComment(false);
      } catch (error) {
        console.error('Error deleting threads:', error);
        // Reset flags on error
        setTimeout(() => {
          isLocalEditRef.current = false;
          blockContentUpdatesRef.current = false;
        }, 500);
        // Hide loading indicator on error
        setIsDeletingComment(false);
      }
    },
    // document is intentionally excluded - it's not used in the callback
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [documentId, showComments]
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
          // CRITICAL: Block if we're in deletion mode
          if (!blockContentUpdatesRef.current) {
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
                onPositionsChange={handlePositionsChange}
                onThreadsDelete={handleThreadsDelete}
              />
              {commentPosition && (
                <CommentQuickCreate
                  position={commentPosition}
                  onCreate={handleCreateCommentAtPosition}
                  onCancel={() => setCommentPosition(null)}
                />
              )}
              {/* Loading indicator for comment deletion */}
              {isDeletingComment && (
                <div className='absolute top-4 right-4 bg-white rounded-lg shadow-lg px-4 py-2 flex items-center space-x-2 border border-gray-200 z-50'>
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600'></div>
                  <span className='text-sm text-gray-700'>
                    Удаление комментария...
                  </span>
                </div>
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
            onDeleteThread={(threadId: string) =>
              handleThreadsDelete([threadId])
            }
            editorRef={editorRef}
            onThreadUpdate={() => {
              // CRITICAL: Block document reload if we're in deletion mode
              if (blockContentUpdatesRef.current) {
                if (import.meta.env.MODE !== 'test') {
                  console.log(
                    'Document: Blocking onThreadUpdate - comment deletion in progress'
                  );
                }
                return;
              }

              // Reload threads to update markers
              // BUT: Do NOT reload document content - it might restore deleted text
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
                  // DO NOT reload document content here - it might be stale
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
