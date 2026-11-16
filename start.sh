#!/usr/bin/env bash
# Build the shared quantum engine and start the local browser playground.
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    cat <<'HELP'
Usage: ./start.sh [Vite options]

Installs frontend dependencies when needed, builds WebAssembly, and starts Qode.
Requires Node >=22.12, npm, CMake, Make, and Emscripten on PATH.

Examples:
  ./start.sh
  ./start.sh --port 5180
  ./start.sh --open

Open the printed Local URL. Press Ctrl+C to stop.
HELP
    exit 0
fi

for command in node npm cmake make emcmake emcc; do
    if ! command -v "$command" >/dev/null 2>&1; then
        printf 'Missing prerequisite: %s. See README.md for setup instructions.\n' "$command" >&2
        exit 1
    fi
done

if ! node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 12) ? 0 : 1)'; then
    printf 'Qode requires Node >=22.12; found %s.\n' "$(node --version)" >&2
    exit 1
fi

# Use the working Node on PATH unless the caller explicitly selected another one.
# This also handles Emscripten configurations pointing at an obsolete Node install.
export EM_NODE_JS="${EM_NODE_JS:-$(command -v node)}"

DEPENDENCY_STAMP="web/node_modules/.qode-dependencies"
DEPENDENCY_HASH="$(node <<'NODE'
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const hash = createHash('sha256');
for (const path of ['web/package.json', 'web/package-lock.json']) {
    hash.update(readFileSync(path)).update('\0');
}
hash.update(process.versions.node).update(process.platform).update(process.arch);
console.log(hash.digest('hex'));
NODE
)"

if [[ ! -x web/node_modules/.bin/vite || ! -f "$DEPENDENCY_STAMP" ]] ||
    [[ "$(cat "$DEPENDENCY_STAMP" 2>/dev/null || true)" != "$DEPENDENCY_HASH" ]]; then
    printf 'Installing Qode frontend dependencies...\n'
    npm --prefix web ci
    printf '%s\n' "$DEPENDENCY_HASH" > "$DEPENDENCY_STAMP"
fi

printf 'Building the Qode WebAssembly engine...\n'
make wasm

printf '\nStarting Qode. Open the printed Local URL; press Ctrl+C to stop.\n\n'
exec npm --prefix web run dev -- "$@"
