import { useEffect, useRef } from 'react';
import { Compartment, EditorState, StateEffect, StateField } from '@codemirror/state';
import {
  EditorView,
  Decoration,
  keymap,
  lineNumbers,
  highlightActiveLine,
  type DecorationSet,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { StreamLanguage, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

const activeLine = StateEffect.define<number>();
const activeField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, transaction) {
    value = value.map(transaction.changes);
    for (const effect of transaction.effects)
      if (effect.is(activeLine)) {
        value =
          effect.value > 0 && effect.value <= transaction.state.doc.lines
            ? Decoration.set([
                Decoration.line({ class: 'executing-line' }).range(
                  transaction.state.doc.line(effect.value).from,
                ),
              ])
            : Decoration.none;
      }
    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});
const language = StreamLanguage.define({
  startState: () => ({ comment: false }),
  token(stream, state) {
    if (state.comment) {
      if (stream.skipTo(']')) {
        stream.next();
        state.comment = false;
      } else stream.skipToEnd();
      return 'comment';
    }
    if (stream.eatSpace()) return null;
    if (stream.match('//')) {
      stream.skipToEnd();
      return 'comment';
    }
    if (stream.eat('[')) {
      state.comment = true;
      return 'comment';
    }
    if (stream.match(/"(?:[^"\\]|\\.)*"/)) return 'string';
    if (stream.match(/\b(?:qubit|bit|if|measure|inspect|print|reset|halt|state|probabilities)\b/))
      return 'keyword';
    if (stream.match(/\b(?:h|x|y|z|i|s|sdg|t|tdg|rx|ry|rz|cx|ccx|cz|cs|ct|swap|cswap)\b/))
      return 'function';
    if (stream.match(/\bpi\b|\b\d+(?:\.\d+)?\b/)) return 'number';
    stream.next();
    return null;
  },
});
const theme = EditorView.theme(
  {
    '&': {
      height: '100%',
      backgroundColor: '#152925',
      color: '#e7efe8',
      fontSize: '14px',
    },
    '.cm-scroller': {
      fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
      lineHeight: '1.8',
    },
    '.cm-content': { padding: '18px 0', caretColor: '#b9e4ce' },
    '.cm-gutters': { background: '#152925', color: '#8aaba0', border: 'none' },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 18px 0 12px' },
    '.cm-activeLine': { background: '#ffffff05' },
    '.executing-line': {
      background: '#b6df7a24',
      boxShadow: 'inset 3px 0 #bfdf8e',
    },
    '&.cm-focused': { outline: 'none' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      background: '#577f6e66',
    },
  },
  { dark: true },
);
const colors = HighlightStyle.define([
  { tag: tags.keyword, color: '#bedea0' },
  { tag: tags.function(tags.variableName), color: '#f7c27e' },
  { tag: tags.string, color: '#ead3ad' },
  { tag: tags.comment, color: '#96aca1', fontStyle: 'italic' },
  { tag: tags.number, color: '#b9c1f3' },
]);
export function Editor({
  source,
  line,
  onChange,
  onRun,
  disabled,
}: {
  source: string;
  line: number;
  onChange: (source: string) => void;
  onRun: () => void;
  disabled: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null);
  const lastEmitted = useRef(source),
    editable = useRef(new Compartment());
  const change = useRef(onChange),
    run = useRef(onRun);
  change.current = onChange;
  run.current = onRun;
  useEffect(() => {
    const editor = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: source,
        extensions: [
          lineNumbers(),
          history(),
          highlightActiveLine(),
          activeField,
          language,
          syntaxHighlighting(colors),
          theme,
          editable.current.of([
            EditorView.editable.of(!disabled),
            EditorState.readOnly.of(disabled),
          ]),
          keymap.of([
            {
              key: 'Mod-Enter',
              run: () => {
                run.current();
                return true;
              },
            },
            indentWithTab,
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          EditorView.contentAttributes.of({
            'aria-label': 'Qode source code',
            spellcheck: 'false',
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              lastEmitted.current = update.state.doc.toString();
              change.current(lastEmitted.current);
            }
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
    // The editor owns its state; external updates are applied by the next effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const v = view.current;
    if (v && source !== lastEmitted.current && source !== v.state.doc.toString())
      v.dispatch({
        changes: { from: 0, to: v.state.doc.length, insert: source },
      });
  }, [source]);
  useEffect(() => {
    view.current?.dispatch({ effects: activeLine.of(line) });
  }, [line]);
  useEffect(() => {
    view.current?.dispatch({
      effects: editable.current.reconfigure([
        EditorView.editable.of(!disabled),
        EditorState.readOnly.of(disabled),
      ]),
    });
  }, [disabled]);
  return <div className="editor" ref={host} />;
}
