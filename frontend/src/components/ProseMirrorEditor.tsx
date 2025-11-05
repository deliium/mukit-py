import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';
import 'prosemirror-view/style/prosemirror.css';
import { EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, Node as PMNode } from 'prosemirror-model';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import {
  baseKeymap,
  toggleMark,
  setBlockType,
  chainCommands,
  exitCode,
} from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { history, undo, redo } from 'prosemirror-history';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import {
  addListNodes,
  wrapInList,
  splitListItem,
  liftListItem,
  sinkListItem,
} from 'prosemirror-schema-list';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';

// Build a schema with list support
const nodes = addListNodes(basicSchema.spec.nodes, 'paragraph block*', 'block');
const schema = new Schema({ nodes, marks: basicSchema.spec.marks });

export interface ProseMirrorEditorRef {
  getContent: () => object | null;
  focus: () => void;
  getView: () => EditorView | null | undefined;
}

type ProseMirrorEditorProps = {
  value?: object | string;
  onChange?: (json: object) => void;
  className?: string;
  onCommentClick?: (position: number, coords: { x: number; y: number }) => void;
  onMarkerClick?: (threadId: string) => void;
  commentThreads?: Array<{
    id: string;
    position: string | null;
    is_resolved: boolean;
  }>;
  onPositionsChange?: (updates: Map<string, number>) => void;
  onThreadsDelete?: (threadIds: string[]) => void;
};

export const ProseMirrorEditor = forwardRef<
  ProseMirrorEditorRef,
  ProseMirrorEditorProps
>(
  (
    {
      value,
      onChange,
      className,
      onCommentClick,
      onMarkerClick,
      commentThreads = [],
      onPositionsChange,
      onThreadsDelete,
    },
    ref
  ) => {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const viewRef = useRef<EditorView | null>(null);
    const updatingFromPropsRef = useRef(false);
    const localThreadPositionsRef = useRef<Map<string, number>>(new Map());
    const commentThreadsRef = useRef(commentThreads);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      getContent: () => {
        if (viewRef.current) {
          return viewRef.current.state.doc.toJSON();
        }
        return null;
      },
      focus: () => {
        if (viewRef.current && viewRef.current.dom) {
          viewRef.current.focus();
        }
      },
      getView: () => viewRef.current,
    }));

    useEffect(() => {
      if (!editorRef.current) return;

      const doc = getInitialDoc(schema, value);
      const state = EditorState.create({
        doc,
        plugins: [
          history(),
          keymap({
            'Mod-z': undo,
            'Shift-Mod-z': redo,
            'Mod-b': toggleMark(schema.marks.strong),
            'Mod-i': toggleMark(schema.marks.em),
            'Shift-Ctrl-0': setBlockType(schema.nodes.paragraph),
            'Shift-Ctrl-1': setBlockType(schema.nodes.heading, { level: 1 }),
            'Shift-Ctrl-2': setBlockType(schema.nodes.heading, { level: 2 }),
            'Shift-Ctrl-3': setBlockType(schema.nodes.heading, { level: 3 }),
            'Shift-Ctrl-8': wrapInList(schema.nodes.bullet_list),
            'Shift-Ctrl-9': wrapInList(schema.nodes.ordered_list),
            Enter: chainCommands(
              splitListItem(schema.nodes.list_item),
              exitCode
            ),
            'Mod-]': sinkListItem(schema.nodes.list_item),
            'Mod-[': liftListItem(schema.nodes.list_item),
          }),
          keymap(baseKeymap),
          dropCursor(),
          gapCursor(),
        ],
      });

      const view = new EditorView(editorRef.current, {
        state,
        dispatchTransaction(tr) {
          // CRITICAL: Save focus state BEFORE applying transaction
          // This ensures we capture the state before any DOM changes
          const hadFocusBefore =
            typeof document !== 'undefined' &&
            document &&
            (document as any).activeElement === view.dom;
          const selectionBefore = view.state.selection;
          const docSizeBefore = view.state.doc.content.size;

          // DEBUG: Log cursor state BEFORE transaction
          if (import.meta.env.MODE !== 'test') {
            console.log('🔍 [CURSOR DEBUG] BEFORE transaction:', {
              hadFocus: hadFocusBefore,
              selection: selectionBefore
                ? {
                    anchor: selectionBefore.anchor,
                    head: selectionBefore.head,
                    from: selectionBefore.from,
                    to: selectionBefore.to,
                  }
                : null,
              docSize: docSizeBefore,
              activeElement:
                typeof document !== 'undefined' && document
                  ? (document as any).activeElement?.tagName
                  : null,
              timestamp: new Date().toISOString(),
            });
          }

          const newState = view.state.apply(tr);
          view.updateState(newState);

          // DEBUG: Log cursor state after every editor change
          if (import.meta.env.MODE !== 'test') {
            const selection = newState.selection;
            console.log('🔍 [CURSOR DEBUG] AFTER transaction:', {
              selection: selection
                ? {
                    anchor: selection.anchor,
                    head: selection.head,
                    from: selection.from,
                    to: selection.to,
                    empty: selection.empty,
                    $anchor: selection.$anchor
                      ? {
                          pos: selection.$anchor.pos,
                          depth: selection.$anchor.depth,
                          parentOffset: selection.$anchor.parentOffset,
                        }
                      : null,
                    $head: selection.$head
                      ? {
                          pos: selection.$head.pos,
                          depth: selection.$head.depth,
                          parentOffset: selection.$head.parentOffset,
                        }
                      : null,
                  }
                : null,
              docSize: newState.doc.content.size,
              docSizeDiff: docSizeBefore - newState.doc.content.size,
              activeElement:
                typeof document !== 'undefined' && document
                  ? (document as any).activeElement?.tagName
                  : null,
              hasFocus:
                typeof document !== 'undefined' &&
                document &&
                (document as any).activeElement === view.dom,
              focusLost:
                hadFocusBefore &&
                typeof document !== 'undefined' &&
                document &&
                (document as any).activeElement !== view.dom,
              transactionSteps: tr.steps.length,
              transactionDocChanged: tr.docChanged,
              transactionSelectionSet: tr.selectionSet,
              timestamp: new Date().toISOString(),
            });
          }

          // Update comment positions if document changed
          // Use ref to get current commentThreads to avoid dependency issues
          const currentThreads = commentThreadsRef.current || [];
          if (tr.docChanged && currentThreads.length > 0) {
            const positionUpdates = new Map<string, number>();
            const threadsToDelete: string[] = [];
            const docSize = newState.doc.content.size;

            currentThreads.forEach(thread => {
              // Use local position if available, otherwise parse from thread.position
              const currentPos =
                localThreadPositionsRef.current.get(thread.id) ??
                (thread.position
                  ? parseInt(thread.position.replace('pos:', ''), 10)
                  : null);

              if (
                currentPos !== null &&
                !isNaN(currentPos) &&
                currentPos >= 0
              ) {
                // Use mapping to transform position
                const newPos = tr.mapping.map(currentPos);

                // Check if position is still valid
                // If position is outside document bounds, mark for deletion
                if (newPos < 0 || newPos > docSize) {
                  threadsToDelete.push(thread.id);
                  // Remove from local positions
                  localThreadPositionsRef.current.delete(thread.id);
                } else {
                  // Check if the position was in a deleted range
                  // Mapping's mapResult provides information about whether position was deleted
                  const mapResult = tr.mapping.mapResult(currentPos);

                  // If position was deleted (deleted flag is set), mark for deletion
                  if (mapResult.deleted) {
                    threadsToDelete.push(thread.id);
                    // Remove from local positions
                    localThreadPositionsRef.current.delete(thread.id);
                  } else if (newPos !== currentPos) {
                    positionUpdates.set(thread.id, newPos);
                    // Update local ref immediately
                    localThreadPositionsRef.current.set(thread.id, newPos);
                  }
                }
              }
            });

            // Call asynchronously to not block transaction
            // Use requestAnimationFrame to preserve focus better
            requestAnimationFrame(() => {
              // CRITICAL: Save focus state right before calling onThreadsDelete
              // This state will be used in handleThreadsDelete to restore focus
              if (threadsToDelete.length > 0 && onThreadsDelete) {
                // Get current focus state right before deletion
                const currentHadFocus =
                  typeof document !== 'undefined' &&
                  document &&
                  (document as any).activeElement === view.dom;
                // CRITICAL: Use newState.selection instead of view.state.selection
                // because newState already has the transaction applied with correct mapping
                // This ensures the cursor position is correctly adjusted after deletion
                const currentSelection = newState.selection;
                const currentDocSize = newState.doc.content.size;

                // DEBUG: Log focus state right before thread deletion
                if (import.meta.env.MODE !== 'test') {
                  console.log(
                    '🔍 [CURSOR DEBUG] Right before thread deletion:',
                    {
                      hadFocus: currentHadFocus,
                      selection: currentSelection
                        ? {
                            anchor: currentSelection.anchor,
                            head: currentSelection.head,
                            from: currentSelection.from,
                            to: currentSelection.to,
                          }
                        : null,
                      docSize: currentDocSize,
                      activeElement:
                        typeof document !== 'undefined' && document
                          ? (document as any).activeElement?.tagName
                          : null,
                      threadsToDelete,
                      timestamp: new Date().toISOString(),
                    }
                  );
                }

                // CRITICAL: Save focus state globally so handleThreadsDelete can access it
                // This ensures we have the state captured at the exact moment before deletion
                // The state will be used immediately in handleThreadsDelete
                if (typeof window !== 'undefined') {
                  (window as any).__threadDeletionFocusState = {
                    hadFocus: currentHadFocus,
                    selection: currentSelection
                      ? {
                          anchor: currentSelection.anchor,
                          head: currentSelection.head,
                          from: currentSelection.from,
                          to: currentSelection.to,
                        }
                      : null,
                    docSize: currentDocSize,
                    timestamp: new Date().toISOString(),
                  };
                }

                onThreadsDelete(threadsToDelete);
              }
              if (positionUpdates.size > 0 && onPositionsChange) {
                onPositionsChange(positionUpdates);
              }
              // Trigger marker update after positions change
              if (editorRef.current) {
                const event = new CustomEvent('markerupdate');
                editorRef.current.dispatchEvent(event);
              }

              // CRITICAL: Call onChange AFTER onThreadsDelete to prevent focus loss
              // If we're deleting threads, onChange will be called after deletion is handled
              // This prevents handleContentChange from causing re-renders that steal focus
              if (tr.docChanged && onChange && !updatingFromPropsRef.current) {
                // Only call onChange if we're NOT deleting threads in this transaction
                // If we are deleting threads, onChange will be handled by handleThreadsDelete
                if (threadsToDelete.length === 0) {
                  onChange(newState.doc.toJSON());
                }
              }
            });
          } else {
            // If no threads to process, call onChange immediately but still in requestAnimationFrame
            // to prevent synchronous state updates that might cause focus loss
            if (tr.docChanged && onChange && !updatingFromPropsRef.current) {
              requestAnimationFrame(() => {
                onChange(newState.doc.toJSON());
              });
            }
          }
        },
        handleClick(view, pos, event) {
          // Handle Ctrl/Cmd + Click to create comment
          if (
            onCommentClick &&
            (event.ctrlKey || event.metaKey) &&
            !event.shiftKey &&
            !event.altKey
          ) {
            event.preventDefault();
            const coords = view.coordsAtPos(pos);
            onCommentClick(pos, { x: coords.left, y: coords.top });
            return true;
          }
          return false;
        },
        attributes: { class: 'prosemirror-editor p-4' },
      });

      viewRef.current = view;
      return () => {
        view.destroy();
        viewRef.current = null;
      };
      // NOTE: commentThreads is intentionally NOT in dependencies
      // to prevent editor re-creation and focus loss when comments are deleted
      // Comment threads are accessed via commentThreadsRef.current inside dispatchTransaction
    }, [onChange, value, onCommentClick, onPositionsChange, onThreadsDelete]);

    // Update document when external value changes (e.g., from server)
    useEffect(() => {
      const view = viewRef.current;
      if (!view || value === undefined) return;
      const nextDoc = getInitialDoc(schema, value);
      // Deep compare JSON to avoid unnecessary resets causing focus loss
      const currentJson = view.state.doc.toJSON();
      const nextJson = nextDoc.toJSON();
      const currentStr = JSON.stringify(currentJson);
      const nextStr = JSON.stringify(nextJson);

      // Only update if content is actually different
      if (currentStr !== nextStr) {
        // Check if the new content is empty or significantly smaller - might be a reset
        // If current content has text and new content is empty, don't update
        const currentHasContent = currentStr.length > 50; // Rough check for non-empty
        const nextHasContent = nextStr.length > 50;

        if (currentHasContent && !nextHasContent) {
          console.log(
            'ProseMirrorEditor: Ignoring update - would clear content'
          );
          return;
        }

        // Also check if the difference is just whitespace or formatting
        // If current content is more substantial, be cautious about overwriting
        if (currentHasContent && currentStr.length > nextStr.length * 1.5) {
          console.log(
            'ProseMirrorEditor: Ignoring update - new content is significantly smaller'
          );
          return;
        }

        // Additional protection: if current content is newer (based on size/complexity)
        // and new content looks like an old version being restored, ignore it
        // This prevents restoring deleted text when comments are auto-deleted
        if (
          currentHasContent &&
          nextHasContent &&
          currentStr.length > nextStr.length &&
          currentStr.length - nextStr.length > 20 // Significant difference
        ) {
          // ALWAYS ignore if current content is significantly larger
          // This prevents restoration of deleted content after comment deletion
          console.log(
            'ProseMirrorEditor: Ignoring update - current content is larger (might restore deleted content)'
          );
          return;
        }

        // EXTRA protection: if we're updating from props but content size decreased significantly,
        // and current content has more text, this might be restoration after comment deletion
        // Check if the difference is more than just formatting
        if (
          currentHasContent &&
          nextHasContent &&
          currentStr.length > nextStr.length + 100 // Large difference
        ) {
          console.log(
            'ProseMirrorEditor: Ignoring update - large size difference (possibly restoring deleted text)'
          );
          return;
        }

        // Preserve focus when updating
        const hadFocus = document.activeElement === view.dom;
        // Preserve selection before update
        const selectionBefore = view.state.selection;

        // DEBUG: Log cursor state before value prop update
        if (import.meta.env.MODE !== 'test') {
          console.log('🔍 [CURSOR DEBUG] Before value prop update:', {
            hadFocus,
            selectionBefore: selectionBefore
              ? {
                  anchor: selectionBefore.anchor,
                  head: selectionBefore.head,
                  from: selectionBefore.from,
                  to: selectionBefore.to,
                }
              : null,
            docSize: view.state.doc.content.size,
            activeElement: document.activeElement?.tagName,
            timestamp: new Date().toISOString(),
          });
        }

        updatingFromPropsRef.current = true;
        const tr = view.state.tr.replaceWith(
          0,
          view.state.doc.content.size,
          nextDoc.content
        );
        view.dispatch(tr);
        updatingFromPropsRef.current = false;

        // DEBUG: Log cursor state after value prop update
        if (import.meta.env.MODE !== 'test') {
          const selectionAfter = view.state.selection;
          console.log('🔍 [CURSOR DEBUG] After value prop update:', {
            hadFocus,
            selectionAfter: selectionAfter
              ? {
                  anchor: selectionAfter.anchor,
                  head: selectionAfter.head,
                  from: selectionAfter.from,
                  to: selectionAfter.to,
                }
              : null,
            docSize: view.state.doc.content.size,
            activeElement: document.activeElement?.tagName,
            focusRestored: document.activeElement === view.dom,
            timestamp: new Date().toISOString(),
          });
        }

        // Restore selection immediately after update to prevent focus loss
        if (selectionBefore && view.state) {
          try {
            const docSize = view.state.doc.content.size;
            if (
              selectionBefore.anchor >= 0 &&
              selectionBefore.head >= 0 &&
              selectionBefore.anchor <= docSize &&
              selectionBefore.head <= docSize
            ) {
              const restoredSelection = TextSelection.create(
                view.state.doc,
                selectionBefore.anchor,
                selectionBefore.head
              );
              const restoreTr = view.state.tr.setSelection(restoredSelection);
              view.dispatch(restoreTr);
            }
          } catch (e) {
            // Ignore selection restoration errors
          }
        }

        // Restore focus and selection if editor had focus before update
        if (hadFocus && view.dom) {
          // Selection is already restored above, just restore focus

          // Immediately try to restore focus synchronously
          if (document.activeElement !== view.dom) {
            view.focus();
          }

          // Aggressively restore focus with multiple attempts
          // Use both requestAnimationFrame and setTimeout for maximum reliability
          requestAnimationFrame(() => {
            if (view.dom && document.activeElement !== view.dom) {
              view.focus();
            }
          });
          setTimeout(() => {
            if (view.dom && document.activeElement !== view.dom) {
              view.focus();
            }
          }, 0);
          setTimeout(() => {
            if (view.dom && document.activeElement !== view.dom) {
              view.focus();
            }
          }, 10);
          setTimeout(() => {
            if (view.dom && document.activeElement !== view.dom) {
              view.focus();
            }
          }, 50);
        }
      }
    }, [value]);

    // Update ref when commentThreads change
    useEffect(() => {
      commentThreadsRef.current = commentThreads;
      // Initialize local positions from commentThreads
      commentThreads.forEach(thread => {
        if (thread.position) {
          const pos = parseInt(thread.position.replace('pos:', ''), 10);
          if (!isNaN(pos) && pos >= 0) {
            localThreadPositionsRef.current.set(thread.id, pos);
          }
        }
      });

      // Trigger marker update after ref is updated
      // This ensures markers reflect the latest commentThreads without re-running the marker effect
      requestAnimationFrame(() => {
        if (editorRef.current) {
          const event = new CustomEvent('markerupdate');
          editorRef.current.dispatchEvent(event);
        }
      });
    }, [commentThreads]);

    // Create comment markers overlay
    useEffect(() => {
      if (!viewRef.current || !editorRef.current) return;

      const editorElement = editorRef.current;
      const view = viewRef.current;
      const markers: HTMLElement[] = [];

      const updateMarkers = () => {
        if (!viewRef.current) return;
        const currentView = viewRef.current;

        // Preserve focus and selection before DOM manipulation
        const hadFocus = document.activeElement === view.dom;
        const currentSelection = view.state.selection;
        const selectionAnchor = currentSelection.anchor;
        const selectionHead = currentSelection.head;

        // Remove existing markers
        markers.forEach(marker => {
          if (marker.parentNode) {
            marker.parentNode.removeChild(marker);
          }
        });
        markers.length = 0;

        // Use ref to get current commentThreads to avoid re-running effect
        const currentThreads = commentThreadsRef.current || [];
        currentThreads.forEach(thread => {
          // Use local position if available, otherwise parse from thread.position
          const pos =
            localThreadPositionsRef.current.get(thread.id) ??
            (thread.position
              ? parseInt(thread.position.replace('pos:', ''), 10)
              : null);

          if (
            pos === null ||
            isNaN(pos) ||
            pos < 0 ||
            pos > currentView.state.doc.content.size
          )
            return;

          try {
            // Get coordinates for this position
            const coords = currentView.coordsAtPos(pos);
            if (!coords) return;

            const editorRect = editorElement.getBoundingClientRect();
            const marker = document.createElement('div');
            marker.className = `comment-marker absolute w-3 h-3 rounded-full cursor-pointer z-10 transition-all hover:scale-125 ${
              thread.is_resolved
                ? 'bg-green-500 border-2 border-green-600'
                : 'bg-yellow-500 border-2 border-yellow-600'
            }`;
            marker.style.left = `${coords.left - editorRect.left}px`;
            marker.style.top = `${coords.top - editorRect.top - 2}px`;
            marker.title = thread.is_resolved
              ? 'Resolved comment (click to view)'
              : 'Comment (click to view)';
            marker.setAttribute('data-thread-id', thread.id);
            // Add click handler to open comment panel and scroll to thread
            if (onMarkerClick) {
              marker.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                onMarkerClick(thread.id);
              });
            }
            markers.push(marker);
            editorElement.appendChild(marker);
          } catch (error) {
            console.error('Error creating comment marker:', error);
          }
        });

        // Restore focus and selection after DOM manipulation
        if (hadFocus && view.dom) {
          // Restore selection first if valid
          try {
            const docSize = currentView.state.doc.content.size;
            if (
              selectionAnchor >= 0 &&
              selectionHead >= 0 &&
              selectionAnchor <= docSize &&
              selectionHead <= docSize
            ) {
              const selection = TextSelection.create(
                currentView.state.doc,
                selectionAnchor,
                selectionHead
              );
              const tr = currentView.state.tr.setSelection(selection);
              currentView.dispatch(tr);
            }
          } catch (e) {
            // If selection restoration fails, just restore focus
          }

          // Restore focus immediately and with multiple attempts
          if (view.dom && document.activeElement !== view.dom) {
            view.focus();

            // DEBUG: Log focus restoration after marker update
            if (import.meta.env.MODE !== 'test') {
              console.log(
                '🔍 [CURSOR DEBUG] Focus restored after marker update:',
                {
                  activeElement: document.activeElement?.tagName,
                  selection: view.state.selection
                    ? {
                        anchor: view.state.selection.anchor,
                        head: view.state.selection.head,
                      }
                    : null,
                  timestamp: new Date().toISOString(),
                }
              );
            }
          }
          // Also try in next frame and with setTimeout for more reliability
          requestAnimationFrame(() => {
            if (view.dom && document.activeElement !== view.dom) {
              view.focus();
            }
          });
          setTimeout(() => {
            if (view.dom && document.activeElement !== view.dom) {
              view.focus();
            }
          }, 0);
          setTimeout(() => {
            if (view.dom && document.activeElement !== view.dom) {
              view.focus();
            }
          }, 10);
        }
      };

      updateMarkers();

      // Update markers on scroll, resize, or position changes
      const handleUpdate = () => {
        updateMarkers();
      };

      const editorContainer = editorElement.closest('.pm-container');
      if (editorContainer) {
        editorContainer.addEventListener('scroll', handleUpdate);
        window.addEventListener('resize', handleUpdate);
        // Listen for custom marker update events (triggered when positions change)
        editorElement.addEventListener('markerupdate', handleUpdate);
      }

      return () => {
        markers.forEach(marker => {
          if (marker.parentNode) {
            marker.parentNode.removeChild(marker);
          }
        });
        if (editorContainer) {
          editorContainer.removeEventListener('scroll', handleUpdate);
          window.removeEventListener('resize', handleUpdate);
          editorElement.removeEventListener('markerupdate', handleUpdate);
        }
      };
      // NOTE: commentThreads is intentionally NOT in dependencies
      // to prevent re-running this effect and losing focus when comments are deleted
      // Comment threads are accessed via commentThreadsRef.current
      // The effect runs once on mount and updates markers via markerupdate events
    }, [onMarkerClick]);

    return (
      <div className={className}>
        <Toolbar viewRef={viewRef} onCommentClick={onCommentClick} />
        <div
          ref={editorRef}
          className='pm-container min-h-[400px] bg-white relative'
          style={{ position: 'relative' }}
        />
      </div>
    );
  }
);

function getInitialDoc(schema: Schema, value?: object | string): PMNode {
  try {
    if (value && typeof value === 'object') {
      return schema.nodeFromJSON(value as any);
    }
  } catch {
    // fallback to plain-text initialization
  }

  const text = typeof value === 'string' ? value : '';
  const paragraph = schema.nodes.paragraph.create(
    undefined,
    text ? schema.text(text) : undefined
  );
  const doc = schema.node('doc', undefined, [paragraph]);
  return doc;
}

const Toolbar: React.FC<{
  viewRef: React.MutableRefObject<EditorView | null>;
  onCommentClick?: (position: number, coords: { x: number; y: number }) => void;
}> = ({ viewRef, onCommentClick }) => {
  const run = (cmd: any) => () => {
    const view = viewRef.current;
    if (view) cmd(view.state, view.dispatch, view);
  };

  return (
    <div className='flex items-center gap-2 border-b bg-gray-50 px-3 py-2'>
      <button className='btn' onClick={run(toggleMark(schema.marks.strong))}>
        B
      </button>
      <button className='btn italic' onClick={run(toggleMark(schema.marks.em))}>
        I
      </button>
      <button
        className='btn'
        onClick={run(setBlockType(schema.nodes.paragraph))}
      >
        P
      </button>
      <button
        className='btn'
        onClick={run(setBlockType(schema.nodes.heading, { level: 1 }))}
      >
        H1
      </button>
      <button
        className='btn'
        onClick={run(setBlockType(schema.nodes.heading, { level: 2 }))}
      >
        H2
      </button>
      <button
        className='btn'
        onClick={run(wrapInList(schema.nodes.bullet_list))}
      >
        • List
      </button>
      <button
        className='btn'
        onClick={run(wrapInList(schema.nodes.ordered_list))}
      >
        1. List
      </button>
      <button className='btn' onClick={run(undo)}>
        Undo
      </button>
      <button className='btn' onClick={run(redo)}>
        Redo
      </button>
      <div className='ml-2 border-l border-gray-300 pl-2'>
        <button
          className='btn flex items-center gap-1 relative group'
          title={
            navigator.platform.toUpperCase().indexOf('MAC') >= 0
              ? 'Add comment: Click here or Cmd+Click on text to add a comment'
              : 'Add comment: Click here or Ctrl+Click on text to add a comment'
          }
          onClick={e => {
            e.preventDefault();
            const view = viewRef.current;
            if (view && onCommentClick) {
              // Get current cursor position
              const { from } = view.state.selection;
              // Get coordinates for the comment input dialog
              const coords = view.coordsAtPos(from);
              // Trigger comment creation at cursor position
              onCommentClick(from, { x: coords.left, y: coords.top });
            }
          }}
        >
          <ChatBubbleLeftRightIcon className='h-4 w-4' />
          <span className='text-xs'>Comment</span>
          <span className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity'>
            {navigator.platform.toUpperCase().indexOf('MAC') >= 0
              ? 'Click here or Cmd+Click to comment'
              : 'Click here or Ctrl+Click to comment'}
          </span>
        </button>
      </div>
    </div>
  );
};

ProseMirrorEditor.displayName = 'ProseMirrorEditor';

export default ProseMirrorEditor;
