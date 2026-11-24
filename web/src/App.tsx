import { Suspense, lazy, useEffect, useState } from 'react';
import { examples } from './examples';
import { Header } from './components/Header';
import { Icon } from './components/Icon';
import { Circuit } from './components/Circuit';
import { StateInspector } from './components/StateInspector';
import { useWorkbench } from './useWorkbench';
import { download } from './format';
import { EMPTY_SOURCE } from './workspace';
import './ide.css';
const Editor = lazy(() => import('./Editor').then((module) => ({ default: module.Editor })));
export default function App() {
  const w = useWorkbench();
  const [circuitOpen, setCircuitOpen] = useState(true);
  const [consoleView, setConsoleView] = useState<'problems' | 'console' | 'build'>('build');
  const [filename, setFilename] = useState('main.qc');
  useEffect(() => {
    if (w.error) setConsoleView('problems');
  }, [w.error]);
  const replaceSource = (source: string, name: string) => {
    if (
      !w.selected &&
      w.source.trim() &&
      w.source !== EMPTY_SOURCE &&
      source !== w.source &&
      !confirm('Replace the current file? Export your code first to keep a separate copy.')
    )
      return;
    w.edit(source, 'external');
    setFilename(name);
  };
  return (
    <div className="app-shell ide-shell">
      <Header page="workbench" />
      <main id="main-content" className="ide-main">
        <h1 className="sr-only">Qode IDE</h1>
        <div className="ide-commandbar">
          <div className="ide-file-tools">
            <button disabled={w.busy} onClick={() => replaceSource(EMPTY_SOURCE, 'main.qc')}>
              New file
            </button>
            <button disabled={w.busy} onClick={() => w.file.current?.click()}>
              Import
            </button>
            <button onClick={() => download(filename, w.source, 'text/plain')}>Export code</button>
            <button onClick={w.share}>Share</button>
            <details className="template-menu">
              <summary>Templates</summary>
              <nav aria-label="Code templates">
                {examples.map((e) => (
                  <button
                    key={e.id}
                    disabled={w.busy}
                    onClick={(event) => {
                      replaceSource(e.source, `${e.id}.qc`);
                      event.currentTarget.closest('details')?.removeAttribute('open');
                    }}
                  >
                    {e.title}
                    <small>{e.subtitle}</small>
                  </button>
                ))}
              </nav>
            </details>
          </div>
          <span className="ide-local">
            LOCAL RUNTIME <span> / </span> WASM
          </span>
        </div>
        <input
          ref={w.file}
          hidden
          type="file"
          accept=".qc,text/plain"
          onChange={async (event) => {
            const input = event.currentTarget,
              f = input.files?.[0];
            if (!f) return;
            try {
              if (f.size > 1048576) {
                w.setToast('Source files must be at most 1 MiB.');
                return;
              }
              const text = new TextDecoder('utf-8', { fatal: true }).decode(await f.arrayBuffer());
              replaceSource(text, f.name.endsWith('.qc') ? f.name : 'main.qc');
            } catch {
              w.setToast('Import requires a readable file with valid UTF-8 encoding.');
            } finally {
              input.value = '';
            }
          }}
        />
        <div className="ide-layout">
          <section className="workbench ide-editor-pane" aria-label="Source editor and debugger">
            <div className="editor-bar">
              <div className="filename">
                <Icon name="code" />
                {filename}
                <span className="file-state">{w.program ? 'compiled' : 'modified'}</span>
              </div>
              <span>Qode</span>
            </div>
            <div className="controls">
              <div className="transport">
                <button
                  className="compile-button"
                  disabled={w.busy}
                  title="Check syntax and semantics without executing (Ctrl/Cmd + Shift + Enter)"
                  onClick={() => {
                    setConsoleView('build');
                    w.execute('compile');
                  }}
                >
                  Compile
                </button>
                <button
                  className="primary"
                  disabled={w.busy || w.snapshot?.done}
                  onClick={() => w.execute('run')}
                >
                  <Icon name="play" />
                  Run
                </button>
                <button
                  disabled={w.busy || w.snapshot?.done || (w.program?.qubits.length ?? 0) > 12}
                  onClick={() => w.execute('step')}
                >
                  <Icon name="step" />
                  Step
                </button>
                <button
                  disabled={w.busy || !w.snapshot?.steps || (w.program?.qubits.length ?? 0) > 12}
                  onClick={() => w.execute('back')}
                >
                  <Icon name="back" />
                  Back
                </button>
                <button disabled={w.busy} onClick={() => w.execute('reset')}>
                  <Icon name="reset" />
                  Reset
                </button>
                <button disabled={!w.busy} onClick={w.stop}>
                  <Icon name="stop" />
                  Stop
                </button>
              </div>
              <div className="status" role="status">
                {w.status}
              </div>
            </div>
            <div className="editor-wrap">
              <Suspense fallback={<div className="empty">Loading editor…</div>}>
                <Editor
                  source={w.source}
                  revision={w.sourceRevision}
                  line={w.error?.line ?? (w.snapshot?.done ? 0 : w.next?.line) ?? 0}
                  onChange={w.edit}
                  onRun={() => {
                    if (!w.busy) w.execute('run');
                  }}
                  onCompile={() => {
                    if (!w.busy) {
                      setConsoleView('build');
                      w.execute('compile');
                    }
                  }}
                  error={!!w.error}
                  disabled={w.busy}
                />
              </Suspense>
            </div>
            <div className="debug-position">
              <span>
                {w.snapshot?.done
                  ? 'EXECUTION FINISHED'
                  : w.next
                    ? `NEXT  ${w.next.op.toUpperCase()}  /  ${filename}:${w.next.line}:${w.next.column}`
                    : 'NO ACTIVE INSTRUCTION'}
              </span>
              <span>Step {w.snapshot?.steps ?? 0}</span>
            </div>
            <section className="ide-console" aria-label="Diagnostics and console">
              <div className="console-bar">
                <nav aria-label="Console views">
                  <button
                    aria-pressed={consoleView === 'problems'}
                    onClick={() => setConsoleView('problems')}
                  >
                    Problems <span>{w.error ? 1 : 0}</span>
                  </button>
                  <button
                    aria-pressed={consoleView === 'console'}
                    onClick={() => setConsoleView('console')}
                  >
                    Console{' '}
                    <span>
                      {w.snapshot?.observations.filter((o) => o.kind === 'print').length ?? 0}
                    </span>
                  </button>
                  <button
                    aria-pressed={consoleView === 'build'}
                    onClick={() => setConsoleView('build')}
                  >
                    Build log
                  </button>
                </nav>
                <button onClick={w.clearLogs} disabled={!w.logs.length}>
                  Clear log
                </button>
              </div>
              <div
                className="console-body"
                tabIndex={0}
                aria-label={
                  consoleView === 'problems'
                    ? 'Problems'
                    : consoleView === 'console'
                      ? 'Program console'
                      : 'Build log'
                }
              >
                {consoleView === 'problems' &&
                  (w.error ? (
                    <div className="error" role="alert">
                      <strong>
                        {filename}
                        {w.error.line ? `:${w.error.line}:${w.error.column}` : ''} · {w.error.error}
                      </strong>
                      <p>{w.error.message}</p>
                      {w.error.line && (
                        <pre>
                          {w.source.split('\n')[w.error.line - 1]}
                          {'\n'}
                          {' '.repeat(Math.min(1000, Math.max(0, (w.error.column ?? 1) - 1)))}^
                        </pre>
                      )}
                    </div>
                  ) : (
                    <p className="console-empty">
                      No diagnostics. Compile to validate the current source.
                    </p>
                  ))}
                {consoleView === 'console' &&
                  (w.snapshot?.observations.some((o) => o.kind === 'print') ? (
                    w.snapshot.observations
                      .filter((o) => o.kind === 'print')
                      .map((o, i) => (
                        <div className="console-entry" key={i}>
                          <span>L{o.line}</span>
                          <pre>{o.text}</pre>
                        </div>
                      ))
                  ) : (
                    <p className="console-empty">
                      Program output appears here. Use print "message"; in your source.
                    </p>
                  ))}
                {consoleView === 'build' &&
                  (w.logs.length ? (
                    w.logs.map((log, i) => (
                      <div className={`build-entry ${log.kind}`} key={i}>
                        <span>{log.kind === 'error' ? 'ERR' : 'OK'}</span>
                        {log.message}
                      </div>
                    ))
                  ) : (
                    <p className="console-empty">
                      Compile checks declarations, operands, and syntax. Ctrl/Cmd + Shift + Enter.
                    </p>
                  ))}
              </div>
            </section>
          </section>
          <aside className="results-pane" aria-label="Runtime inspector">
            <section className={`circuit-panel ${circuitOpen ? '' : 'panel-collapsed'}`}>
              <div className="section-label">
                <h2>
                  <button
                    className="panel-toggle"
                    aria-label={circuitOpen ? 'Collapse Circuit' : 'Expand Circuit'}
                    aria-expanded={circuitOpen}
                    aria-controls="circuit-body"
                    onClick={() => setCircuitOpen(!circuitOpen)}
                  >
                    <span aria-hidden="true">{circuitOpen ? '⌄' : '›'}</span>Circuit
                  </button>
                </h2>
                <span>
                  {w.program
                    ? `${w.program.qubits.length} qubits · ${w.program.instructions.length} instructions`
                    : 'Compile source to generate circuit'}
                </span>
              </div>
              <div id="circuit-body" className="circuit-body" hidden={!circuitOpen}>
                <Circuit program={w.program} pc={w.snapshot?.pc ?? 0} />
              </div>
            </section>
            <StateInspector
              snapshot={w.snapshot}
              samples={w.samples}
              busy={w.busy}
              seed={w.seed}
              shots={w.shots}
              tab={w.tab}
              setTab={w.setTab}
              changeSeed={w.changeSeed}
              setShots={w.setShots}
              sample={() => w.execute('sample')}
            />
          </aside>
        </div>
        <div className="ide-statusbar">
          <span>
            Qode 1.0 <span className="status-separator">/</span> {w.source.split('\n').length} lines{' '}
            <span className="status-separator">/</span> UTF-8
          </span>
          <span>Autosaved locally · Run ≤16 qubits · Debug ≤12</span>
        </div>
      </main>
      {w.toast && (
        <div className="toast" role="status">
          {w.toast}
        </div>
      )}
    </div>
  );
}
