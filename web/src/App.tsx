import { Suspense, lazy } from 'react';
import { examples } from './examples';
import { Header } from './components/Header';
import { Icon } from './components/Icon';
import { Circuit } from './components/Circuit';
import { StateInspector } from './components/StateInspector';
import { useWorkbench } from './useWorkbench';
import { download } from './format';

const Editor = lazy(() => import('./Editor').then((module) => ({ default: module.Editor })));

const explanations: Record<string, string> = {
  h: 'Hadamard mixes the complex amplitudes of 0 and 1. Their signs and phases determine how they interfere later.',
  cx: 'Controlled X flips the target only in branches where the control is 1. On a superposed control, it can create entanglement.',
  measure:
    'Measurement draws an outcome from squared amplitude magnitudes, then collapses and normalizes the surviving branch.',
  reset:
    'Reset measures this qubit and flips a 1 outcome back to 0. It may destroy correlations with other qubits.',
  inspect:
    'Inspection reads the simulated state without changing it. This is a simulator capability, unlike physical measurement.',
  if: 'A classical bit chooses whether the enclosed gates execute. A skipped block leaves the quantum state unchanged.',
  z: 'Z changes the sign of amplitudes whose target is 1. Probabilities stay the same until later interference.',
  cz: 'Controlled Z changes the sign of the branch in which both qubits are 1.',
  print: 'Text output annotates your experiment. It has no effect on the quantum state.',
  halt: 'Halt ends execution. The engine also stops naturally at the end of the program.',
};
export default function App() {
  const {
    sourceRevision,
    stop,
    tab,
    setTab,
    source,
    seed,
    shots,
    setShots,
    program,
    snapshot,
    samples,
    error,
    busy,
    status,
    toast,
    selected,
    next,
    execute,
    edit,
    changeSeed,
    share,
    file,
    setToast,
  } = useWorkbench();
  const currentLine = error?.line ?? next?.line ?? 0;
  return (
    <div className="app-shell">
      <Header page="workbench" />
      <main id="main-content" className="workbench-main">
        <section className="intro">
          <div>
            <div className="eyebrow">QODE / INTERACTIVE QUANTUM LANGUAGE</div>
            <h1>
              {selected?.title ?? 'Your experiment'}
              <span className="title-period">.</span>
            </h1>
            <p>
              {selected?.subtitle ??
                'Write a circuit, inspect its state, and follow each operation.'}
            </p>
          </div>
          <div className="intro-meta">
            <span>IDEAL STATEVECTOR SIMULATION</span>
            <p>Local execution. Nothing leaves your browser.</p>
            <a href={`${import.meta.env.BASE_URL}docs/`}>Read the handbook</a>
          </div>
        </section>
        <div className="experiment-picker">
          <span>EXPERIMENTS</span>
          <nav aria-label="Example circuits">
            {examples.map((e) => (
              <button
                key={e.id}
                className={selected?.id === e.id ? 'selected' : ''}
                disabled={busy}
                onClick={() => {
                  edit(e.source, 'external');
                  setTab('amplitudes');
                }}
              >
                {e.title}
              </button>
            ))}
          </nav>
        </div>
        <div className="workspace">
          <section className="workbench" aria-label="Quantum workbench">
            <div className="editor-bar">
              <div className="filename">
                <Icon name="code" />
                {selected?.id ?? 'experiment'}.qc
                <span className="language-tag">QODE</span>
              </div>
              <div className="file-actions">
                <button disabled={busy} onClick={() => file.current?.click()}>
                  <Icon name="upload" /> Import
                </button>
                <button
                  onClick={() =>
                    download(`${selected?.id ?? 'experiment'}.qc`, source, 'text/plain')
                  }
                >
                  <Icon name="download" /> Export code
                </button>
                <button onClick={share}>
                  <Icon name="share" /> Share
                </button>
              </div>
            </div>
            <input
              ref={file}
              hidden
              type="file"
              accept=".qc,text/plain"
              onChange={async (event) => {
                const input = event.currentTarget;
                const f = input.files?.[0];
                if (!f) return;
                try {
                  if (f.size > 1048576) {
                    setToast('Source files must be at most 1 MiB.');
                    return;
                  }
                  edit(
                    new TextDecoder('utf-8', { fatal: true }).decode(await f.arrayBuffer()),
                    'external',
                  );
                } catch {
                  setToast('Import requires a readable file with valid UTF-8 encoding.');
                } finally {
                  input.value = '';
                }
              }}
            />
            <div className="editor-wrap">
              <Suspense fallback={<div className="empty">Loading editor…</div>}>
                <Editor
                  source={source}
                  revision={sourceRevision}
                  line={currentLine}
                  onChange={edit}
                  onRun={() => {
                    if (!busy) execute('run');
                  }}
                  disabled={busy}
                />
              </Suspense>
            </div>
            <div className="controls">
              <div className="transport">
                <button
                  className="primary"
                  disabled={busy || snapshot?.done}
                  onClick={() => execute('run')}
                >
                  <Icon name="play" /> Run
                </button>
                <button
                  disabled={busy || snapshot?.done || (program?.qubits.length ?? 0) > 12}
                  onClick={() => execute('step')}
                >
                  <Icon name="step" /> Step
                </button>
                <button
                  disabled={busy || !snapshot?.steps || (program?.qubits.length ?? 0) > 12}
                  onClick={() => execute('back')}
                >
                  <Icon name="back" /> Back
                </button>
                <button disabled={busy} onClick={() => execute('reset')}>
                  <Icon name="reset" /> Reset
                </button>
                <button className="stop" disabled={!busy} onClick={stop}>
                  <Icon name="stop" /> Stop
                </button>
              </div>
              <div className="status" role="status">
                <span className={busy ? 'status-dot busy' : 'status-dot'} />
                {status}
              </div>
            </div>
            {error && (
              <div className="error" role="alert">
                <strong>
                  {error.line ? `Line ${error.line}:${error.column} · ` : ''}
                  {error.error}
                </strong>
                <p>{error.message}</p>
              </div>
            )}
            <div className="step-explanation">
              <span className="step-label">{snapshot?.done ? 'COMPLETE' : 'UP NEXT'}</span>
              <div>
                <strong>
                  {snapshot?.done
                    ? 'Your circuit has finished.'
                    : next
                      ? `${next.op.toUpperCase()} · line ${next.line}`
                      : 'Compile your circuit to begin.'}
                </strong>
                <p>
                  {snapshot?.done
                    ? 'Reset to replay with the same seed, or sample to compare repeated outcomes.'
                    : next
                      ? (explanations[next.op] ??
                        'This gate changes complex amplitudes. Compare their values and relative phases with the measurement probabilities.')
                      : 'All operations run in the same C engine as the native CLI.'}
                </p>
              </div>
            </div>
            <details className="experiment-note">
              <summary>About this experiment</summary>
              <p>
                {selected?.lesson ??
                  'Declare your qubits and classical bits before operations. Use Step to inspect an execution, or Sample to estimate its measurement distribution.'}
              </p>
              <p>Step up to 12 qubits. Run up to 16. Ctrl/Cmd + Enter runs the program.</p>
            </details>
          </section>
          <section className="results-pane" aria-label="Simulation results">
            <section className="circuit-panel">
              <div className="section-label">
                <h2>Circuit</h2>
                <span>
                  {program
                    ? `${program.qubits.length} qubits · ${program.instructions.length} instructions`
                    : 'Your circuit will appear here'}
                </span>
              </div>
              <Circuit program={program} pc={snapshot?.pc ?? 0} />
            </section>
            <StateInspector
              snapshot={snapshot}
              samples={samples}
              busy={busy}
              seed={seed}
              shots={shots}
              tab={tab}
              setTab={setTab}
              changeSeed={changeSeed}
              setShots={setShots}
              sample={() => execute('sample')}
            />
          </section>
        </div>
        <footer>
          <span>
            <strong>Qode 1.0</strong> / C11 engine · WebAssembly runtime
          </span>
          <span>
            Ideal simulation · GPL-2.0 ·{' '}
            <a href={`${import.meta.env.BASE_URL}docs/#cli`}>CLI reference</a>
          </span>
        </footer>
      </main>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
