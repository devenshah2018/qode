# Web application architecture

The browser app is a static, local-first application. It has two HTML entry points: the workbench at `/` and documentation at `/docs/`. Source links to the public GitHub repository. Neither page needs a database, a server function, or an API key.

## A page shell with clear boundaries

Shared navigation, icons, type, spacing, color, and focus states establish a common visual system. The workbench's page component arranges learning examples, source, controls, the circuit, and the state inspector. Individual components own the circuit projection, Bloch diagram, observation rendering, and editor integration.

The IDE controller owns the source buffer, bounded build log, execution settings and the worker lifecycle. Presentational components receive typed data and callbacks. They do not instantiate independent simulators, choose measurement outcomes, or reproduce gate math in JavaScript. This keeps every displayed quantum result tied to the same C engine as the CLI.

## Source to result

```text
UTF-8 source
  → C scanner and parser
  → semantic validation
  → immutable instructions with source spans
  → isolated statevector runtime
  → versioned JSON snapshot
  → worker message
  → React state inspector and circuit
```

CodeMirror edits source and highlights the next executable line. Compilation resolves named operands to integer indices. The simulator runs instructions against one joint complex vector. The worker serializes snapshots for the UI; the UI formats numbers and draws them without changing their meaning.

## The editor is an adapter

CodeMirror owns its document and selection. The React adapter applies explicit external document changes, updates read-only state through compartments, and reports user changes back to the controller. Execution-line effects are separate from source edits, so stepping can reveal the next line without forcing the editor to jump on every keystroke.

Ctrl/Cmd+Enter requests Run. Busy-state protection exists both in the controls and in the controller, so a rapid keyboard action cannot enqueue an unintended second execution before React has rendered the disabled state.

## Worker and memory ownership

The module worker asynchronously loads Emscripten's JavaScript factory and Wasm binary. The source is copied into allocated Wasm heap memory instead of being passed as a large temporary C-stack string. JSON is copied to JavaScript and freed after each call. A compiled program outlives its runtime and any checkpoints.

Program metadata is transferred once per new session. State updates contain the current instruction pointer, executed-step count, amplitudes, reduced states, classical values, and observations. The main thread can remain responsive while the worker computes. Stop terminates the worker and invalidates its runtime controls; it does not pretend that destroyed checkpoints are resumable.

Messages from a retired worker are ignored. Worker errors invalidate displayed session state before the next action creates a fresh session. Shot-count validation affects sampling, while ordinary compile/run/step/reset operations remain independent of the sampling form.

## Backward stepping

Every 32 executed instructions, the debugger may save a deep runtime checkpoint. A checkpoint includes quantum amplitudes, classical bits, PRNG state, instruction position, execution count, and observations.

Back restores the nearest preceding checkpoint and deterministically replays to one fewer executed instruction. It does not subtract one source line or one raw instruction address: conditional blocks can jump over instructions. Checkpoint payloads have a 64 MiB budget, retaining the initial state and evicting older noninitial entries. Interactive debugging is capped at 12 qubits.

## Display accuracy

The circuit is a bounded window of operations, with operand and condition information in accessible tooltips. Its active marker follows the instruction pointer; an operation behind the pointer may have been skipped by a condition.

Amplitudes retain real and imaginary components. The inspector formats probabilities separately and labels phase as undefined at zero amplitude. State inspections preserve complex values; probability inspections emphasize measurement probabilities. Recorded snapshots can be expanded independently of the current final state.

The Bloch view uses reduced states from the engine and an orthographic camera projection. Purity distinguishes mixed and pure states. Assistive labels and numeric coordinates accompany the drawing, and the chart never relies on color alone.

## Persistence and navigation

Local storage contains source and settings, not a complete runtime or cloud project. A page-hide flush protects recent edits before navigating to documentation. Returning to the workbench reconstructs a fresh experiment from saved source/settings; execution checkpoints are not persisted across a full page navigation.

Share payloads occupy the workbench URL fragment. Valid shares are consumed after loading so later reloads use the updated saved workspace. Malformed shares fall back to validated local work rather than overwriting it with a default example. Storage failures do not prevent editing, and clipboard failures produce a recoverable notice.

## Documentation rendering

Documentation uses repository Markdown as its content source. A catalog provides grouped navigation, reading metadata, search, and a table of contents. React Markdown renders text without enabling raw HTML. Runnable Qode blocks can be copied or opened in the workbench as shared source. Documentation loads no simulation worker.

Separate HTML output makes `/docs/` directly addressable without a server-side route handler. Section links use fragments and continue to work after refresh. Asset URLs derive from the configured Vite base. The default base is `/`; the optional GitHub Pages build explicitly overrides it to `/qode/`.

## Build and verification

TypeScript strict checks run before production bundling. The editor and documentation renderer are split into page-specific assets. Fonts are bundled locally; there is no third-party font request. The npm lockfile pins dependency versions, and the license-generation step includes notices for runtime packages and the toolchain.

Browser tests exercise transport controls, sampling, errors, file input, sharing, persistence, navigation, responsive layouts, documentation links, and recovery. Numerical correctness remains covered by native reference matrices and Qiskit differential tests; UI tests verify the presentation and lifecycle around those results.

## IDE layout and compilation

A blank file is the first-run default; templates are optional replacements. Source editing invalidates the old session immediately. The command bar exposes compile, run, step, back, reset, and stop. Compile invokes the existing validated instruction compiler without stepping; recompiling unchanged source preserves runtime position. The worker republishes program metadata for every explicit compile response.

The lower console separates diagnostics, print output, and a build log capped at 100 entries. Diagnostics show filename, line, column, and source context. Circuit and state views remain tied to the same worker snapshot. Desktop panes fit the viewport and scroll independently; narrow layouts stack the editor and inspector.

## Shared theme and editor help

Both entry points load `site-theme.css` after the common foundation styles, sharing palette and navigation rules. Documentation retains its reading layout while the IDE adds workspace-specific geometry.

Circuit, State, and Sample are independent disclosure panels: hidden bodies stay mounted so settings and selected views survive toggling. Flex sizing reallocates desktop space among expanded panels; mobile panels stack.

CodeMirror hover tooltips use a bundled syntax-reference table and the editor syntax tree to exclude comments and strings. F1 opens the same help at the cursor; Escape dismisses it. Tooltip text uses DOM text nodes, and links target the local documentation entry point. No network request or simulation is needed for help.
