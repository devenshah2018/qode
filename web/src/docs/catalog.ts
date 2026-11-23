import deployment from '../../../docs/DEPLOYMENT.md?raw';
import gettingStarted from '../../../docs/GETTING_STARTED.md?raw';
import concepts from '../../../docs/CONCEPTS.md?raw';
import syntax from '../../../docs/LANGUAGE.md?raw';
import gates from '../../../docs/GATES.md?raw';
import patterns from '../../../docs/PATTERNS.md?raw';
import debugging from '../../../docs/DEBUGGING.md?raw';
import architecture from '../../../docs/ARCHITECTURE.md?raw';
import webArchitecture from '../../../docs/WEB_ARCHITECTURE.md?raw';
import embedding from '../../../docs/EMBEDDING.md?raw';
import cli from '../../../docs/CLI.md?raw';
import troubleshooting from '../../../docs/TROUBLESHOOTING.md?raw';
import verification from '../../../docs/VERIFICATION.md?raw';
import benchmarks from '../../../docs/BENCHMARKS.md?raw';
import migration from '../../../docs/MIGRATION.md?raw';
import contributing from '../../../CONTRIBUTING.md?raw';
import releasing from '../../../docs/RELEASING.md?raw';
export const articles = [
  {
    id: 'getting-started',
    title: 'Getting started',
    group: 'Start here',
    description: 'Write your first circuit and follow it from source to measurement.',
    body: gettingStarted,
    file: 'GETTING_STARTED.md',
  },
  {
    id: 'concepts',
    title: 'The quantum model',
    group: 'Start here',
    description: 'Amplitudes, interference, entanglement, and the meaning of a mixed qubit.',
    body: concepts,
    file: 'CONCEPTS.md',
  },
  {
    id: 'debugging',
    title: 'Using the debugger',
    group: 'Start here',
    description: 'Inspect a Bell pair one operation at a time.',
    body: debugging,
    file: 'DEBUGGING.md',
  },
  {
    id: 'syntax',
    title: 'Language & syntax',
    group: 'Language',
    description: 'The grammar, declarations, expressions, control flow, and exact execution rules.',
    body: syntax,
    file: 'LANGUAGE.md',
  },
  {
    id: 'gates',
    title: 'Every quantum gate',
    group: 'Language',
    description: 'Operations, matrices, parameters, controls, inverses, and worked examples.',
    body: gates,
    file: 'GATES.md',
  },
  {
    id: 'patterns',
    title: 'Circuit patterns',
    group: 'Language',
    description:
      'Runnable recipes for state preparation, phase, feed-forward, search, and teleportation.',
    body: patterns,
    file: 'PATTERNS.md',
  },
  {
    id: 'cli',
    title: 'Command-line interface',
    group: 'Build with Qode',
    description: 'Validate programs, run trajectories, and automate reproducible sampling.',
    body: cli,
    file: 'CLI.md',
  },
  {
    id: 'architecture',
    title: 'Engine architecture',
    group: 'Build with Qode',
    description: 'Compilation, instruction storage, statevector kernels, and sampling.',
    body: architecture,
    file: 'ARCHITECTURE.md',
  },
  {
    id: 'web-architecture',
    title: 'Web architecture',
    group: 'Build with Qode',
    description: 'Components, worker boundaries, memory ownership, state persistence, and replay.',
    body: webArchitecture,
    file: 'WEB_ARCHITECTURE.md',
  },
  {
    id: 'embedding',
    title: 'Embedding the C API',
    group: 'Build with Qode',
    description: 'Handles, lifetimes, typed failures, cancellation, and versioned results.',
    body: embedding,
    file: 'EMBEDDING.md',
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    group: 'Reference',
    description: 'Understand errors, restore a workspace, and diagnose surprising results.',
    body: troubleshooting,
    file: 'TROUBLESHOOTING.md',
  },
  {
    id: 'verification',
    title: 'Verification',
    group: 'Reference',
    description:
      'Numerical oracles, regression coverage, tolerances, sanitizers, and honest limits.',
    body: verification,
    file: 'VERIFICATION.md',
  },
  {
    id: 'benchmarks',
    title: 'Performance',
    group: 'Reference',
    description: 'Measured workloads, memory growth, and how to reproduce the benchmarks.',
    body: benchmarks,
    file: 'BENCHMARKS.md',
  },
  {
    id: 'migration',
    title: 'Prototype migration',
    group: 'Reference',
    description: 'Move existing symbolic scripts to the readable 1.0 language.',
    body: migration,
    file: 'MIGRATION.md',
  },
  {
    id: 'contributing',
    title: 'Contributing',
    group: 'Reference',
    description: 'Development setup, conventions, and the evidence expected from a change.',
    body: contributing,
    file: '../CONTRIBUTING.md',
  },
  {
    id: 'deployment',
    title: 'Deploy to Vercel',
    group: 'Reference',
    description: 'One-time setup, automated verification, deployment, and rollback.',
    body: deployment,
    file: 'DEPLOYMENT.md',
  },
  {
    id: 'releasing',
    title: 'Build & release',
    group: 'Reference',
    description: 'Create static, native, and source artifacts with reproducible packaging.',
    body: releasing,
    file: 'RELEASING.md',
  },
];
export const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
export function headings(body: string) {
  let inFence = false;
  return body.split('\n').flatMap((line) => {
    if (line.startsWith('```')) {
      inFence = !inFence;
      return [];
    }
    const match = !inFence && /^## (.+)$/.exec(line);
    return match ? [{ title: match[1], id: slug(match[1]) }] : [];
  });
}
