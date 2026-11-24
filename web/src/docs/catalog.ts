import gettingStarted from '../../../docs/GETTING_STARTED.md?raw';
import compiler from '../../../docs/COMPILER.md?raw';
import debugging from '../../../docs/DEBUGGING.md?raw';
import syntax from '../../../docs/LANGUAGE.md?raw';
import gates from '../../../docs/GATES.md?raw';
import patterns from '../../../docs/PATTERNS.md?raw';
import concepts from '../../../docs/CONCEPTS.md?raw';
import cli from '../../../docs/CLI.md?raw';
import troubleshooting from '../../../docs/TROUBLESHOOTING.md?raw';
import migration from '../../../docs/MIGRATION.md?raw';
export const articles = [
  {
    id: 'getting-started',
    title: 'Workspace',
    group: 'Workspace',
    description: 'Open, edit, save, and share Qode source.',
    body: gettingStarted,
    file: 'GETTING_STARTED.md',
  },
  {
    id: 'compiler',
    title: 'Compiler',
    group: 'Workspace',
    description: 'Validate source, read diagnostics, and correct compilation errors.',
    body: compiler,
    file: 'COMPILER.md',
  },
  {
    id: 'debugging',
    title: 'Debugger & console',
    group: 'Workspace',
    description: 'Execution controls, source stepping, output, and inspector panels.',
    body: debugging,
    file: 'DEBUGGING.md',
  },
  {
    id: 'syntax',
    title: 'Language & syntax',
    group: 'Language',
    description: 'Declarations, statements, expressions, strings, and conditional gates.',
    body: syntax,
    file: 'LANGUAGE.md',
  },
  {
    id: 'gates',
    title: 'Gate reference',
    group: 'Language',
    description: 'Gate signatures, matrices, operands, and rotation parameters.',
    body: gates,
    file: 'GATES.md',
  },
  {
    id: 'patterns',
    title: 'Code examples',
    group: 'Language',
    description: 'Complete programs with expected outputs.',
    body: patterns,
    file: 'PATTERNS.md',
  },
  {
    id: 'concepts',
    title: 'State & results',
    group: 'Reference',
    description: 'Basis ordering, amplitudes, probabilities, measurements, and result limits.',
    body: concepts,
    file: 'CONCEPTS.md',
  },
  {
    id: 'cli',
    title: 'Command-line interface',
    group: 'Reference',
    description: 'Build the CLI, check source, execute programs, and sample results.',
    body: cli,
    file: 'CLI.md',
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    group: 'Reference',
    description: 'Resolve source errors, unexpected results, import failures, and resource limits.',
    body: troubleshooting,
    file: 'TROUBLESHOOTING.md',
  },
  {
    id: 'migration',
    title: 'Syntax migration',
    group: 'Reference',
    description: 'Replace legacy symbolic syntax with Qode 1.0 statements.',
    body: migration,
    file: 'MIGRATION.md',
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
