import { useMemo } from 'react';
import type { Program } from '../types';
export function Circuit({ program, pc }: { program?: Program; pc: number }) {
  const ops = useMemo(() => {
    const conditions: { end: number; label: string }[] = [];
    return (program?.instructions ?? []).flatMap((op, index) => {
      while (conditions.length && conditions[conditions.length - 1].end <= index) conditions.pop();
      if (op.op === 'if')
        conditions.push({
          end: op.jump,
          label: `if ${program?.bits[op.bit]} == ${op.conditionValue}`,
        });
      return op.qubits.length
        ? [{ ...op, index, context: conditions.map((c) => c.label).join(', ') }]
        : [];
    });
  }, [program]);
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
    <div className="circuit-scroll" tabIndex={0} role="region" aria-label="Quantum circuit diagram">
      <svg
        className="circuit"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Quantum circuit, ${program.qubits.length} qubits; showing ${shown.length} of ${ops.length} operations`}
      >
        {program.qubits.map((q, i) => (
          <g key={q}>
            <title>{q}</title>
            <text x="12" y={34 + i * 46} className="wire-label">
              {q.length > 10 ? `${q.slice(0, 9)}…` : q}
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
              <title>{`${op.op}${['rx', 'ry', 'rz'].includes(op.op) ? `(${op.angle.toPrecision(6)})` : ''} ${op.qubits.map((q) => program.qubits[q]).join(', ')}, line ${op.line}${op.op === 'measure' ? ` writes ${program.bits[op.bit]}` : ''}${op.context ? `, ${op.context}` : ''}}`}</title>
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
                    <title>{q}</title>
                    <rect x={x - 17} y={y - 16} width="34" height="32" rx="0" />
                    <text x={x} y={y + 5} textAnchor="middle">
                      {['swap', 'cswap'].includes(op.op)
                        ? '×'
                        : op.op === 'cx' || op.op === 'ccx'
                          ? '⊕'
                          : op.op === 'measure'
                            ? 'M'
                            : op.op === 'reset'
                              ? '|0⟩'
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
