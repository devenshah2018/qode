import { Suspense, lazy, useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { examples } from './examples';
import type { Action, EngineError, Program, Reduced, Response, Samples, Snapshot } from './types';

const Editor = lazy(() => import('./Editor').then((module) => ({ default: module.Editor })));

const STORE = 'qode.workspace.v1';
function initial(): { source: string; seed: string; shots: number } {
  const fallback = { source: examples[0].source, seed: '42', shots: 1024 };
  try {
    const encoded = location.hash.startsWith('#code=') ? location.hash.slice(6) : '';
    const parsed = encoded
      ? JSON.parse(
          new TextDecoder('utf-8', { fatal: true }).decode(
            Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)),
          ),
        )
      : JSON.parse(localStorage.getItem(STORE) || 'null');
    if (
      parsed &&
      typeof parsed.source === 'string' &&
      new TextEncoder().encode(parsed.source).length <= 1048576
    )
      return {
        source: parsed.source,
        seed: typeof parsed.seed === 'string' ? parsed.seed : '42',
        shots: Number.isInteger(parsed.shots) ? parsed.shots : 1024,
      };
  } catch {
    /* A corrupt saved workspace must not prevent startup. */
  }
  return fallback;
}
const starting = initial();
function download(name: string, value: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const number = (n: number, digits = 3) => (Math.abs(n) < 1e-12 ? 0 : n).toFixed(digits);
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
function Circuit({ program, pc }: { program?: Program; pc: number }) {
  const ops = useMemo(
    () =>
      (program?.instructions ?? [])
        .map((op, index) => ({ ...op, index }))
        .filter((op) => op.qubits.length > 0),
    [program],
  );
  if (!program?.qubits.length)
    return <div className="empty small">Declare a qubit to see its circuit.</div>;
  let low = 0,
    high = ops.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (ops[mid].index < pc) low = mid + 1;
    else high = mid;
  }
  const position = Math.max(0, Math.min(low, ops.length - 1));
  const start = Math.min(Math.max(0, position - 6), Math.max(0, ops.length - 18));
  const shown = ops.slice(start, start + 18);
  const width = Math.max(620, 115 + shown.length * 56),
    height = 44 + program.qubits.length * 46;
  return (
    <div className="circuit-scroll">
      <svg
        className="circuit"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Quantum circuit, ${program.qubits.length} qubits; showing ${shown.length} of ${ops.length} operations`}
      >
        {program.qubits.map((q, i) => (
          <g key={q}>
            <text x="12" y={34 + i * 46} className="wire-label">
              {q}
            </text>
            <line x1="94" x2={width - 14} y1={30 + i * 46} y2={30 + i * 46} className="wire" />
          </g>
        ))}
        {shown.map((op, index) => {
          const x = 122 + index * 56,
            ys = op.qubits.map((q) => 30 + q * 46),
            active = op.index === pc;
          const controlled = ['cx', 'ccx', 'cz', 'cs', 'ct', 'cswap'].includes(op.op);
          return (
            <g key={op.index} className={active ? 'gate current-gate' : 'gate'}>
              <title>{`${op.op}, line ${op.line}${op.op === 'measure' ? ` → ${program.bits[op.bit]}` : ''}`}</title>
              {ys.length > 1 && (
                <line
                  x1={x}
                  x2={x}
                  y1={Math.min(...ys)}
                  y2={Math.max(...ys)}
                  className="connection"
                />
              )}
              {ys.map((y, q) => {
                const control = controlled && (q === 0 || (op.op === 'ccx' && q === 1));
                return control ? (
                  <circle key={q} cx={x} cy={y} r="5" className="control-dot" />
                ) : (
                  <g key={q}>
                    <rect x={x - 17} y={y - 16} width="34" height="32" rx="7" />
                    <text x={x} y={y + 5} textAnchor="middle">
                      {['swap', 'cswap'].includes(op.op)
                        ? '×'
                        : op.op === 'cx' || op.op === 'ccx'
                          ? '⊕'
                          : op.op === 'measure'
                            ? 'M'
                            : controlled
                              ? op.op.slice(1).toUpperCase()
                              : op.op.toUpperCase()}
                    </text>
                  </g>
                );
              })}
              {active && <circle cx={x} cy={height - 8} r="3" className="cursor-dot" />}
            </g>
          );
        })}
      </svg>
      {ops.length > shown.length && (
        <p className="caption">
          Circuit window: operations {start + 1}–{Math.min(start + 18, ops.length)} of {ops.length}
        </p>
      )}
    </div>
  );
}
function Bloch({ q }: { q: Reduced }) {
  const mixed = q.purity < 1 - 1e-8,
    vx = 50 + 29 * q.x + 12 * q.y,
    vy = 44 - 29 * q.z + 7 * q.y;
  return (
    <article className="bloch-card">
      <div className="bloch-heading">
        <strong>{q.name}</strong>
        <span className={mixed ? 'badge mixed' : 'badge'}>{mixed ? 'Mixed' : 'Pure'}</span>
      </div>
      <div className="bloch-body">
        <svg
          width="100"
          height="92"
          viewBox="0 0 100 92"
          role="img"
          aria-label={`${q.name} Bloch vector x ${number(q.x)}, y ${number(q.y)}, z ${number(q.z)}; purity ${number(q.purity)}`}
        >
          <circle cx="50" cy="44" r="29" fill="none" stroke="#c9d2c8" />
          <ellipse cx="50" cy="44" rx="29" ry="9" fill="none" stroke="#d7ddd3" />
          <path d="M50 9V79M15 44H85M32 33L69 55" fill="none" stroke="#d7ddd3" />
          <text x="46" y="8">
            0
          </text>
          <text x="47" y="89">
            1
          </text>
          <line x1="50" y1="44" x2={vx} y2={vy} stroke="#23705a" strokeWidth="2.5" />
          <circle cx={vx} cy={vy} r="4" fill={mixed ? '#bb753b' : '#23705a'} />
        </svg>
        <dl>
          <div>
            <dt>x</dt>
            <dd>{number(q.x)}</dd>
          </div>
          <div>
            <dt>y</dt>
            <dd>{number(q.y)}</dd>
          </div>
          <div>
            <dt>z</dt>
            <dd>{number(q.z)}</dd>
          </div>
          <div>
            <dt>purity</dt>
            <dd>{number(q.purity)}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
export default function App() {
  const [source, setSource] = useState(starting.source),
    [seed, setSeed] = useState(starting.seed),
    [shots, setShots] = useState(starting.shots);
  const [program, setProgram] = useState<Program>(),
    [snapshot, setSnapshot] = useState<Snapshot>(),
    [samples, setSamples] = useState<Samples>();
  const [error, setError] = useState<EngineError>(),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState('Loading engine'),
    [toast, setToast] = useState('');
  const [tab, setTab] = useState<'amplitudes' | 'qubits' | 'output'>('amplitudes');
  const worker = useRef<Worker | null>(null),
    file = useRef<HTMLInputElement>(null),
    values = useRef({ source, seed, shots });
  values.current = { source, seed, shots };
  const selected = examples.find((e) => e.source === source),
    next = program?.instructions[snapshot?.pc ?? 0];
  const stop = useCallback(() => {
    worker.current?.terminate();
    worker.current = null;
    setBusy(false);
    setStatus('Stopped · reset to start again');
  }, []);
  const execute = useCallback((action: Action) => {
    if (!worker.current) {
      const w = new Worker(new URL('./worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.current = w;
      w.onmessage = (event: MessageEvent<Response>) => {
        const data = event.data;
        if (data.type === 'error') {
          setError(data.error);
          setBusy(false);
          setStatus('Needs attention');
          return;
        }
        if (data.program) setProgram(data.program);
        setSnapshot(data.snapshot);
        setBusy(data.busy);
        setError(undefined);
        if (data.samples) {
          setSamples(data.samples);
          setStatus(`${data.samples.shots.toLocaleString()} shots complete`);
        } else
          setStatus(
            data.busy
              ? 'Running'
              : data.snapshot.done
                ? 'Execution complete'
                : `Ready · step ${data.snapshot.steps}`,
          );
      };
      w.onerror = () => {
        setError({
          error: 'load',
          message: 'Unable to load the engine. Check the connection, then Reset to retry.',
        });
        setBusy(false);
        w.terminate();
        worker.current = null;
      };
    }
    setBusy(true);
    setError(undefined);
    if (action !== 'sample') setSamples(undefined);
    setStatus(action === 'sample' ? 'Sampling' : action === 'run' ? 'Running' : 'Working');
    worker.current.postMessage({
      action,
      ...values.current,
      wasmUrl: new URL(`${import.meta.env.BASE_URL}wasm/qode.js`, location.origin).href,
    });
  }, []);
  useEffect(() => {
    execute('compile');
    return () => worker.current?.terminate();
  }, [execute]);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORE, JSON.stringify({ source, seed, shots }));
      } catch {
        /* Private browsing / storage quotas: editing still works. */
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [source, seed, shots]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  function edit(value: string) {
    if (value === values.current.source) return;
    stop();
    setSource(value);
    setSnapshot(undefined);
    setProgram(undefined);
    setSamples(undefined);
    setError(undefined);
    setStatus('Edited · ready to compile');
  }
  function changeSeed(value: string) {
    stop();
    setSeed(value);
    setSnapshot(undefined);
    setProgram(undefined);
    setSamples(undefined);
    setError(undefined);
    setStatus('Seed changed · ready');
  }
  async function share() {
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(values.current));
      if (bytes.length > 100000) {
        setToast('This program is too large for a share link. Export the .qc file instead.');
        return;
      }
      let binary = '';
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const url = `${location.origin}${location.pathname}#code=${btoa(binary)}`;
      await navigator.clipboard.writeText(url);
      setToast('Share link copied. It includes your code, seed, and shot count.');
    } catch {
      setToast('Clipboard unavailable. Use Export code to share this experiment.');
    }
  }
  const currentLine = error?.line ?? next?.line ?? 0;
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="Qode home">
          <span className="brand-mark">q</span>qode
          <span className="version">1.0</span>
        </a>
        <div className="top-note">A small language for big quantum ideas.</div>
        <a
          className="github"
          href="https://github.com/devenshah2018/qode"
          target="_blank"
          rel="noreferrer"
        >
          Source & docs <span aria-hidden="true">↗</span>
        </a>
      </header>
      <main>
        <section className="intro">
          <div>
            <div className="eyebrow">
              <span />
              THE QUANTUM WORKBENCH
            </div>
            <h1>
              Understand every <em>quantum step.</em>
            </h1>
            <p>
              Write a circuit. Follow its amplitudes. See exactly where the probabilities come from.
            </p>
          </div>
          <div className="local-note">
            <span className="local-icon" aria-hidden="true">
              ⌘
            </span>
            <div>
              <strong>Runs on your machine</strong>
              <span>C → WebAssembly · no accounts · no server</span>
            </div>
          </div>
        </section>
        <div className="workspace">
          <aside className="lessons">
            <div className="panel-heading">
              <h2>Explore the ideas</h2>
              <span>06</span>
            </div>
            <nav aria-label="Example circuits">
              {examples.map((e) => (
                <button
                  key={e.id}
                  className={`lesson ${selected?.id === e.id ? 'selected' : ''}`}
                  disabled={busy}
                  onClick={() => {
                    edit(e.source);
                    setTab('amplitudes');
                  }}
                >
                  <span className="lesson-number">{e.number}</span>
                  <span>
                    <strong>{e.title}</strong>
                    <small>{e.subtitle}</small>
                  </span>
                  <span className="lesson-arrow" aria-hidden="true">
                    ↗
                  </span>
                </button>
              ))}
            </nav>
            <div className="lesson-note">
              <span className="eyebrow">TRY THIS</span>
              <p>
                {selected?.lesson ??
                  'Start with explicit qubit and bit declarations. Use Step to watch each operation, or Sample for repeated measurements.'}
              </p>
              <div className="hint-key">
                <kbd>⌘ / Ctrl</kbd> + <kbd>Enter</kbd>
                <span>run your circuit</span>
              </div>
            </div>
            <div className="limits-note">
              Ideal statevector simulator.
              <br />
              Step ≤12 qubits · Run ≤16 qubits.
              <br />
              First qubit is the rightmost bit.
            </div>
          </aside>
          <section className="workbench" aria-label="Quantum workbench">
            <div className="editor-bar">
              <div className="filename">
                <span className="file-dot" />
                {selected?.id ?? 'experiment'}.qc
                <span className="language-tag">QODE</span>
              </div>
              <div className="file-actions">
                <button disabled={busy} onClick={() => file.current?.click()}>
                  Import
                </button>
                <button
                  onClick={() =>
                    download(`${selected?.id ?? 'experiment'}.qc`, source, 'text/plain')
                  }
                >
                  Export code
                </button>
                <button onClick={share}>Share ↗</button>
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
                  edit(new TextDecoder('utf-8', { fatal: true }).decode(await f.arrayBuffer()));
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
                  <span aria-hidden="true">▶</span> Run
                </button>
                <button
                  disabled={busy || snapshot?.done || (program?.qubits.length ?? 0) > 12}
                  onClick={() => execute('step')}
                >
                  Step →
                </button>
                <button
                  disabled={busy || !snapshot?.steps || (program?.qubits.length ?? 0) > 12}
                  onClick={() => execute('back')}
                >
                  ← Back
                </button>
                <button disabled={busy} onClick={() => execute('reset')}>
                  Reset
                </button>
                <button className="stop" disabled={!busy} onClick={stop}>
                  Stop
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
                        'This gate changes complex amplitudes. Watch the phase colors as well as the probabilities.')
                      : 'All operations run in the same C engine as the native CLI.'}
                </p>
              </div>
            </div>
          </section>
          <section className="inspector" aria-label="Quantum state inspector">
            <div className="panel-heading">
              <h2>State inspector</h2>
              <span className="live-label">LIVE</span>
            </div>
            <div className="inspector-summary">
              <div>
                <small>STATE NORM</small>
                <strong data-testid="norm">{snapshot ? number(snapshot.norm, 6) : '—'}</strong>
              </div>
              <div>
                <small>CLASSICAL BITS</small>
                <strong className="bit-values">
                  {snapshot?.bits.length
                    ? snapshot.bits.map((b) => (
                        <span key={b.name} title={b.name}>
                          {b.name}={b.value ?? '?'}
                        </span>
                      ))
                    : '—'}
                </strong>
              </div>
            </div>
            <div className="tabs" role="tablist" aria-label="State views">
              {(['amplitudes', 'qubits', 'output'] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  aria-controls={`panel-${t}`}
                  id={`tab-${t}`}
                  onClick={() => setTab(t)}
                  onKeyDown={(event) => {
                    const tabs = ['amplitudes', 'qubits', 'output'] as const;
                    const index = tabs.indexOf(t);
                    let target = index;
                    if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
                    else if (event.key === 'ArrowLeft')
                      target = (index + tabs.length - 1) % tabs.length;
                    else if (event.key === 'Home') target = 0;
                    else if (event.key === 'End') target = tabs.length - 1;
                    else return;
                    event.preventDefault();
                    setTab(tabs[target]);
                    document.getElementById(`tab-${tabs[target]}`)?.focus();
                  }}
                  tabIndex={tab === t ? 0 : -1}
                >
                  {t === 'amplitudes'
                    ? 'Amplitudes'
                    : t === 'qubits'
                      ? 'Qubits'
                      : `Output${snapshot?.observations.length ? ` (${snapshot.observations.length})` : ''}`}
                </button>
              ))}
            </div>
            <div
              className="inspector-content"
              role="tabpanel"
              id={`panel-${tab}`}
              aria-labelledby={`tab-${tab}`}
            >
              {tab === 'amplitudes' && (
                <>
                  <div className="legend">
                    <span>
                      <i className="legend-square" />
                      Probability
                    </span>
                    <span>Color = phase</span>
                  </div>
                  {snapshot ? (
                    <div className="amplitude-list">
                      {snapshot.amplitudes.map((a) => (
                        <div className="amplitude" key={a.basis}>
                          <div className="amplitude-title">
                            <code>|{a.basis || '∅'}⟩</code>
                            <strong>
                              {number(a.probability * 100, 2)}
                              <small>%</small>
                            </strong>
                          </div>
                          <div className="probability-track">
                            <div
                              style={{
                                width: `${Math.max(0, Math.min(100, a.probability * 100))}%`,
                                background: `hsl(${155 + (Math.atan2(a.im, a.re) * 180) / Math.PI} 35% 42%)`,
                              }}
                            />
                          </div>
                          <div className="amplitude-detail">
                            <span>
                              {number(a.re)} {a.im < 0 ? '−' : '+'} {number(Math.abs(a.im))}i
                            </span>
                            <span>φ {number((Math.atan2(a.im, a.re) * 180) / Math.PI, 1)}°</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty">Run or step to inspect your state.</div>
                  )}
                  <p className="caption">
                    Complex amplitudes interfere. Their squared magnitudes give measurement
                    probabilities.
                    {snapshot?.stateTruncated
                      ? ' Showing the 64 largest entries; the complete state remains in the engine.'
                      : ''}
                  </p>
                </>
              )}
              {tab === 'qubits' && (
                <>
                  <p className="caption">
                    A mixed qubit can be entangled with others. Its shorter Bloch vector is
                    intentional.
                  </p>
                  {snapshot?.reduced.map((q) => (
                    <Bloch key={q.name} q={q} />
                  ))}
                </>
              )}
              {tab === 'output' && (
                <>
                  {!snapshot?.observations.length && (
                    <div className="empty">Print and inspect statements appear here.</div>
                  )}
                  {snapshot?.observations.map((o, i) => (
                    <article className="observation" key={i}>
                      <small>
                        LINE {o.line} · {o.kind.toUpperCase()}
                      </small>
                      {o.text !== undefined ? (
                        <pre>{o.text}</pre>
                      ) : (
                        <>
                          <strong>
                            {o.view === 'qubit'
                              ? `Qubit ${o.snapshot?.qubits[o.qubit ?? 0]}`
                              : o.view}
                          </strong>
                          {o.view === 'qubit' && o.snapshot?.reduced[o.qubit ?? 0] ? (
                            <Bloch q={o.snapshot.reduced[o.qubit ?? 0]} />
                          ) : (
                            <p>
                              {o.snapshot?.amplitudes
                                .filter((a) => a.probability > 1e-12)
                                .slice(0, 8)
                                .map((a) => `|${a.basis}⟩ ${number(a.probability * 100, 1)}%`)
                                .join(' · ')}
                            </p>
                          )}
                        </>
                      )}
                    </article>
                  ))}
                </>
              )}
            </div>
            <div className="sampling">
              <div className="section-label">
                <h2>Repeat the experiment</h2>
                <span>SHOTS</span>
              </div>
              <div className="sample-inputs">
                <label>
                  Seed
                  <input
                    aria-label="Random seed"
                    value={seed}
                    disabled={busy}
                    inputMode="numeric"
                    onChange={(event) => changeSeed(event.target.value)}
                  />
                </label>
                <label>
                  Shots
                  <input
                    aria-label="Shot count"
                    type="number"
                    min="1"
                    max="100000"
                    value={shots}
                    disabled={busy}
                    onChange={(event) => setShots(Number(event.target.value))}
                  />
                </label>
                <button className="secondary" disabled={busy} onClick={() => execute('sample')}>
                  Sample ↗
                </button>
              </div>
              {samples && (
                <div className="histogram" data-testid="histogram">
                  <p className="caption">
                    Classical bits: {samples.bits.slice().reverse().join(' ')} ·{' '}
                    {samples.optimized ? 'terminal sampling' : 'independent executions'}
                  </p>
                  {Object.entries(samples.counts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 64)
                    .map(([key, count]) => (
                      <div className="histogram-row" key={key}>
                        <code>{key}</code>
                        <div>
                          <span
                            style={{
                              width: `${(count / samples.shots) * 100}%`,
                            }}
                          />
                        </div>
                        <strong>{count.toLocaleString()}</strong>
                      </div>
                    ))}
                  {Object.keys(samples.counts).length > 64 && (
                    <p className="caption">
                      Showing the 64 most frequent outcomes. Export includes all counts.
                    </p>
                  )}
                </div>
              )}
              <button
                className="export-results"
                disabled={!snapshot && !samples}
                onClick={() =>
                  download(
                    'qode-results.json',
                    JSON.stringify(samples ?? snapshot, null, 2),
                    'application/json',
                  )
                }
              >
                Export results ↓
              </button>
            </div>
          </section>
        </div>
        <footer>
          <span>
            <strong>Small core. Visible mechanics.</strong> A quantum language built in C, brought
            to the browser.
          </span>
          <span>
            Ideal simulation · GPL-2.0 ·{' '}
            <a href="https://github.com/devenshah2018/qode#quick-start">Use the CLI ↗</a>
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
