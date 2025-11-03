import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';
import 'prosemirror-view/style/prosemirror.css';
import { EditorState } from 'prosemirror-state';
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
    },
    ref
  ) => {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const viewRef = useRef<EditorView | null>(null);
    const updatingFromPropsRef = useRef(false);

    // Expose getContent method to parent
    useImperativeHandle(ref, () => ({
      getContent: () => {
        if (viewRef.current) {
          return viewRef.current.state.doc.toJSON();
        }
        return null;
      },
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
          const newState = view.state.apply(tr);
          view.updateState(newState);
          if (tr.docChanged && onChange && !updatingFromPropsRef.current) {
            onChange(newState.doc.toJSON());
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
    }, [onChange, value, onCommentClick]);

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

        updatingFromPropsRef.current = true;
        const tr = view.state.tr.replaceWith(
          0,
          view.state.doc.content.size,
          nextDoc.content
        );
        view.dispatch(tr);
        updatingFromPropsRef.current = false;
      }
    }, [value]);

    // Create comment markers overlay
    useEffect(() => {
      if (!viewRef.current || !editorRef.current) return;

      const editorElement = editorRef.current;
      const view = viewRef.current;
      const markers: HTMLElement[] = [];

      const updateMarkers = () => {
        // Remove existing markers
        markers.forEach(marker => {
          if (marker.parentNode) {
            marker.parentNode.removeChild(marker);
          }
        });
        markers.length = 0;

        commentThreads.forEach(thread => {
          if (!thread.position) return;

          try {
            // Parse position (format: "pos:123")
            const pos = parseInt(thread.position.replace('pos:', ''), 10);
            if (isNaN(pos) || pos < 0 || pos > view.state.doc.content.size)
              return;

            // Get coordinates for this position
            const coords = view.coordsAtPos(pos);
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
      };

      updateMarkers();

      // Update markers on scroll or resize
      const handleUpdate = () => {
        updateMarkers();
      };

      const editorContainer = editorElement.closest('.pm-container');
      if (editorContainer) {
        editorContainer.addEventListener('scroll', handleUpdate);
        window.addEventListener('resize', handleUpdate);
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
        }
      };
    }, [commentThreads, onMarkerClick]);

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
