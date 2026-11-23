import type { Snapshot, Samples } from '../types';
import { Icon } from './Icon';
import { Observation } from './Observation';
import { Bloch } from './Bloch';
import { number, download } from '../format';
type Props = {
  snapshot?: Snapshot;
  samples?: Samples;
  busy: boolean;
  seed: string;
  shots: number;
  tab: 'amplitudes' | 'qubits' | 'output';
  setTab: (tab: 'amplitudes' | 'qubits' | 'output') => void;
  changeSeed: (seed: string) => void;
  setShots: (shots: number) => void;
  sample: () => void;
};
export function StateInspector({
  snapshot,
  samples,
  busy,
  seed,
  shots,
  tab,
  setTab,
  changeSeed,
  setShots,
  sample,
}: Props) {
  return (
    <section className="inspector" aria-label="Quantum state inspector">
      <div className="panel-heading">
        <h2>State</h2>
        <span className="live-label">
          {snapshot ? `${snapshot.stateSize} BASIS STATES` : 'AWAITING EXECUTION'}
        </span>
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
              else if (event.key === 'ArrowLeft') target = (index + tabs.length - 1) % tabs.length;
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
        tabIndex={0}
      >
        {tab === 'amplitudes' && (
          <>
            <div className="legend">
              <span>
                <i className="legend-square" />
                Probability
              </span>
              <span>Phase in degrees</span>
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
                          background: 'var(--ink)',
                        }}
                      />
                    </div>
                    <div className="amplitude-detail">
                      <span>
                        {number(a.re)} {a.im < 0 ? '−' : '+'} {number(Math.abs(a.im))}i
                      </span>
                      <span>
                        φ{' '}
                        {a.probability > 0
                          ? `${number((Math.atan2(a.im, a.re) * 180) / Math.PI, 1)}°`
                          : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">Run or step to inspect your state.</div>
            )}
            <p className="caption">
              Complex amplitudes interfere. Their squared magnitudes give measurement probabilities.
              {snapshot?.stateTruncated
                ? ' Showing the 64 largest entries; the complete state remains in the engine.'
                : ''}
            </p>
          </>
        )}
        {tab === 'qubits' && (
          <>
            <p className="caption">
              A mixed qubit can be entangled with others. Its shorter Bloch vector is intentional.
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
            {snapshot?.observations.map((record, i) => (
              <Observation key={i} record={record} />
            ))}
          </>
        )}
      </div>
      <div className="sampling">
        <div className="section-label">
          <h2>Sample the circuit</h2>
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
              aria-invalid={!Number.isInteger(shots) || shots < 1 || shots > 100000}
              aria-describedby="shot-help"
              type="number"
              min="1"
              max="100000"
              value={shots}
              disabled={busy}
              onChange={(event) => setShots(Number(event.target.value))}
            />
          </label>
          <button
            className="secondary"
            disabled={busy || !Number.isInteger(shots) || shots < 1 || shots > 100000}
            onClick={() => sample()}
          >
            <Icon name="spark" /> Sample
          </button>
        </div>
        {(!Number.isInteger(shots) || shots < 1 || shots > 100000) && (
          <p className="input-error" id="shot-help">
            Enter 1–100,000 shots to sample. Run and Step remain available.
          </p>
        )}
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
          <Icon name="download" /> Export results
        </button>
      </div>
    </section>
  );
}
