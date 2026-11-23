import type { Reduced } from '../types';
import { number } from '../format';
export function Bloch({ q }: { q: Reduced }) {
  const mixed = q.purity < 1 - 1e-8,
    // Orthonormal camera rows: every unit Bloch vector projects inside the sphere.
    azimuth = Math.PI / 6,
    elevation = Math.PI / 9,
    vx = 50 + 29 * (Math.cos(azimuth) * q.x - Math.sin(azimuth) * q.y),
    vy =
      44 +
      29 *
        (Math.sin(elevation) * Math.sin(azimuth) * q.x +
          Math.sin(elevation) * Math.cos(azimuth) * q.y -
          Math.cos(elevation) * q.z);
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
          <circle cx="50" cy="44" r="29" fill="none" stroke="var(--border-strong)" />
          <ellipse cx="50" cy="44" rx="29" ry="9" fill="none" stroke="var(--border)" />
          <path
            d="M50 16.75V71.25M24.89 39.04L75.11 48.96M64.5 35.41L35.5 52.59"
            fill="none"
            stroke="var(--border)"
          />
          <text x="46" y="8">
            0
          </text>
          <text x="47" y="89">
            1
          </text>
          <line x1="50" y1="44" x2={vx} y2={vy} stroke="var(--accent-light)" strokeWidth="2.5" />
          <circle cx={vx} cy={vy} r="4" fill={mixed ? 'var(--amber)' : 'var(--accent-light)'} />
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
