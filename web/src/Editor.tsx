import { qodeHover, showSyntaxHelp, dismissSyntaxHelp } from './syntaxHelp';
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
      backgroundColor: '#191b1c',
      color: '#d7d9d6',
      fontSize: '14px',
    },
    '.cm-scroller': {
      fontFamily: '"JetBrains Mono Variable", "SFMono-Regular", Consolas, monospace',
      lineHeight: '1.8',
    },
    '.cm-content': { padding: '18px 0', caretColor: '#d8e7a5' },
    '.cm-gutters': { background: '#191b1c', color: '#858c8b', border: 'none' },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 18px 0 12px' },
    '.cm-activeLine': { background: '#ffffff04' },
    '.executing-line': {
      background: '#d8e7a512',
      boxShadow: 'inset 3px 0 #c1d694',
    },
    '&.cm-focused': { outline: 'none' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      background: '#444b43',
    },
  },
  { dark: true },
);
const colors = HighlightStyle.define([
  { tag: tags.keyword, color: '#d8e7a5' },
  { tag: tags.function(tags.variableName), color: '#d7d9d6' },
  { tag: tags.string, color: '#c6c4a5' },
  { tag: tags.comment, color: '#929a96', fontStyle: 'italic' },
  { tag: tags.number, color: '#d5b992' },
]);
export function Editor({
  source,
  revision,
  line,
  onChange,
  onRun,
  onCompile,
  error = false,
  disabled,
}: {
  source: string;
  revision: number;
  line: number;
  onChange: (source: string) => void;
  onRun: () => void;
  onCompile: () => void;
  error?: boolean;
  disabled: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null);
  const appliedRevision = useRef(revision),
    editable = useRef(new Compartment());
  const change = useRef(onChange),
    run = useRef(onRun),
    compile = useRef(onCompile);
  change.current = onChange;
  run.current = onRun;
  compile.current = onCompile;
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
          qodeHover,
          syntaxHighlighting(colors),
          theme,
          editable.current.of([
            EditorView.editable.of(!disabled),
            EditorState.readOnly.of(disabled),
          ]),
          keymap.of([
            { key: 'F1', run: showSyntaxHelp },
            { key: 'Escape', run: dismissSyntaxHelp },
            {
              key: 'Mod-Shift-Enter',
              run: () => {
                compile.current();
                return true;
              },
            },
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
            'aria-description': 'F1 shows syntax help at the cursor. Escape dismisses it.',
            spellcheck: 'false',
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              change.current(update.state.doc.toString());
            }
          }),
        ],
      }),
    });
    editor.scrollDOM.tabIndex = 0;
    editor.scrollDOM.setAttribute('role', 'region');
    editor.scrollDOM.setAttribute('aria-label', 'Source code viewport');
    editor.scrollDOM.style.outlineOffset = '-3px';
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
    if (!v || appliedRevision.current === revision) return;
    appliedRevision.current = revision;
    if (source !== v.state.doc.toString())
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: source } });
  }, [source, revision]);
  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    const effects: StateEffect<unknown>[] = [activeLine.of(line)];
    if (line > 0 && line <= editor.state.doc.lines)
      effects.push(EditorView.scrollIntoView(editor.state.doc.line(line).from, { y: 'nearest' }));
    editor.dispatch({ effects });
  }, [line]);
  useEffect(() => {
    view.current?.dispatch({
      effects: editable.current.reconfigure([
        EditorView.editable.of(!disabled),
        EditorState.readOnly.of(disabled),
      ]),
    });
  }, [disabled]);
  return <div className={error ? 'editor editor-error' : 'editor'} ref={host} />;
}
