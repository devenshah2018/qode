export type Workspace = { source: string; seed: string; shots: number };
const STORE = 'qode.workspace.v1';
export const EMPTY_SOURCE = '// main.qc\n\n';
const defaultWorkspace: Workspace = { source: EMPTY_SOURCE, seed: '42', shots: 1024 };
function normalize(value: unknown, strict: boolean): Workspace | undefined {
  if (!value || typeof value !== 'object') return;
  const v = value as Partial<Workspace>;
  if (typeof v.source !== 'string' || new TextEncoder().encode(v.source).length > 1048576) return;
  const seed = typeof v.seed === 'string' ? v.seed : '42';
  const shots = typeof v.shots === 'number' && Number.isFinite(v.shots) ? v.shots : 1024;
  if (
    strict &&
    (!/^\d{1,20}$/.test(seed) ||
      BigInt(seed) > 18446744073709551615n ||
      !Number.isInteger(shots) ||
      shots < 1 ||
      shots > 100000)
  )
    return;
  return { source: v.source, seed, shots };
}
export function loadWorkspace(): Workspace & { notice?: string } {
  let saved: Workspace | undefined;
  try {
    saved = normalize(JSON.parse(localStorage.getItem(STORE) || 'null'), false);
  } catch {
    /* Storage is optional. */
  }
  if (location.hash.startsWith('#code=')) {
    try {
      const encoded = location.hash.slice(6);
      if (encoded.length > 1500000) throw new Error('Oversized share');
      const shared = normalize(
        JSON.parse(
          new TextDecoder('utf-8', { fatal: true }).decode(
            Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)),
          ),
        ),
        true,
      );
      if (shared) return shared;
    } catch {
      /* Retain the saved experiment on a malformed share. */
    }
    return {
      ...(saved ?? defaultWorkspace),
      notice: 'Could not open this share link. Your saved experiment was kept.',
    };
  }
  return saved ?? defaultWorkspace;
}
export function saveWorkspace(value: Workspace) {
  try {
    localStorage.setItem(STORE, JSON.stringify(value));
  } catch {
    /* Editing remains available without storage. */
  }
}
export function consumeShare() {
  if (location.hash.startsWith('#code='))
    history.replaceState(null, '', location.pathname + location.search);
}
export function workspaceLink(value: Workspace): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  if (bytes.length > 100000)
    throw new Error('This program is too large for a share link. Export the .qc file instead.');
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `${new URL(import.meta.env.BASE_URL, location.origin).href}#code=${btoa(binary)}`;
}
