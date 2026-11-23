import type { Observation as Record } from '../types';
import { Bloch } from './Bloch';
import { number } from '../format';
export function Observation({ record }: { record: Record }) {
  const s = record.snapshot;
  return (
    <article className="observation">
      <small>
        LINE {record.line} · {record.kind.toUpperCase()}
      </small>
      {record.text !== undefined ? (
        <pre>{record.text}</pre>
      ) : (
        <>
          <strong>
            {record.view === 'qubit'
              ? `Qubit ${s?.qubits[record.qubit ?? 0]}`
              : record.view === 'state'
                ? 'Complex state'
                : 'Measurement probabilities'}
          </strong>
          {record.view === 'qubit' && s?.reduced[record.qubit ?? 0] ? (
            <Bloch q={s.reduced[record.qubit ?? 0]} />
          ) : (
            <div className="observation-table">
              <table>
                <thead>
                  <tr>
                    <th>Basis</th>
                    {record.view === 'state' && <th>Amplitude</th>}
                    <th>Probability</th>
                    {record.view === 'state' && <th>Phase</th>}
                  </tr>
                </thead>
                <tbody>
                  {s?.amplitudes.slice(0, 8).map((a) => (
                    <tr key={a.basis}>
                      <td>
                        <code>|{a.basis || '∅'}⟩</code>
                      </td>
                      {record.view === 'state' && (
                        <td>
                          <code>
                            {number(a.re)} {a.im < 0 ? '−' : '+'} {number(Math.abs(a.im))}i
                          </code>
                        </td>
                      )}
                      <td>{number(a.probability * 100, 2)}%</td>
                      {record.view === 'state' && (
                        <td>
                          {a.probability > 0
                            ? `${number((Math.atan2(a.im, a.re) * 180) / Math.PI, 1)}°`
                            : '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {s && (
            <>
              <p className="caption">
                Recorded at step {s.steps}.{' '}
                {s.stateTruncated ? 'Snapshot contains the 64 largest amplitudes. ' : ''}
                {s.amplitudes.length > 8 && record.view !== 'qubit'
                  ? 'Showing 8 entries; expand the snapshot for all recorded values.'
                  : ''}
              </p>
              <details>
                <summary>View recorded snapshot</summary>
                <pre>{JSON.stringify(s, null, 2)}</pre>
              </details>
            </>
          )}
        </>
      )}
    </article>
  );
}
