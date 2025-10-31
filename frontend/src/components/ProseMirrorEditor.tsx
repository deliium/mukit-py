import React, { useEffect, useRef } from 'react';
import 'prosemirror-view/style/prosemirror.css';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, Node as PMNode } from 'prosemirror-model';
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

type ProseMirrorEditorProps = {
  value?: object | string;
  onChange?: (json: object) => void;
  className?: string;
};

export const ProseMirrorEditor: React.FC<ProseMirrorEditorProps> = ({
  value,
  onChange,
  className,
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const updatingFromPropsRef = useRef(false);

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
          Enter: chainCommands(splitListItem(schema.nodes.list_item), exitCode),
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
      attributes: { class: 'prosemirror-editor p-4' },
    });

    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [onChange, value]);

  // Update document when external value changes (e.g., from server)
  useEffect(() => {
    const view = viewRef.current;
    if (!view || value === undefined) return;
    const nextDoc = getInitialDoc(schema, value);
    // Deep compare JSON to avoid unnecessary resets causing focus loss
    const currentJson = view.state.doc.toJSON();
    const nextJson = nextDoc.toJSON();
    if (JSON.stringify(currentJson) !== JSON.stringify(nextJson)) {
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

  return (
    <div className={className}>
      <Toolbar viewRef={viewRef} />
      <div ref={editorRef} className='pm-container min-h-[400px] bg-white' />
    </div>
  );
};

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
}> = ({ viewRef }) => {
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
    </div>
  );
};

export default ProseMirrorEditor;
