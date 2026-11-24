import {
  activateHover,
  closeHoverTooltips,
  hasHoverTooltips,
  hoverTooltip,
  type EditorView,
} from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
type Help = { signature: string; description: string; example: string; chapter: string };
const gate = (signature: string, description: string, example: string): Help => ({
  signature,
  description,
  example,
  chapter: 'gates',
});
export const syntaxHelp: Record<string, Help> = {
  i: gate('i target;', 'Identity. Leaves the complete quantum state unchanged.', 'i q;'),
  h: gate(
    'h target;',
    'Hadamard mixes the |0⟩ and |1⟩ amplitudes. Applying H twice restores the original state.',
    'h q;',
  ),
  x: gate(
    'x target;',
    'Pauli X swaps the target’s |0⟩ and |1⟩ amplitudes: a quantum bit flip.',
    'x q;',
  ),
  y: gate(
    'y target;',
    'Pauli Y maps |0⟩ to i|1⟩ and |1⟩ to −i|0⟩. It changes both bit value and phase.',
    'y q;',
  ),
  z: gate(
    'z target;',
    'Pauli Z negates amplitudes where the target is 1. Probabilities alone stay unchanged.',
    'z q;',
  ),
  s: gate('s target;', 'Adds a phase of π/2 to the target’s |1⟩ component.', 's q;'),
  sdg: gate(
    'sdg target;',
    'Inverse S. Adds a phase of −π/2 to the target’s |1⟩ component.',
    's q; sdg q;',
  ),
  t: gate('t target;', 'Adds a phase of π/4 to the target’s |1⟩ component.', 't q;'),
  tdg: gate(
    'tdg target;',
    'Inverse T. Adds a phase of −π/4 to the target’s |1⟩ component.',
    't q; tdg q;',
  ),
  rx: gate(
    'rx(angle) target;',
    'Rotates around the X axis. Angles are constant expressions in radians.',
    'rx(pi / 2) q;',
  ),
  ry: gate(
    'ry(angle) target;',
    'Rotates around the Y axis. Angles are constant expressions in radians.',
    'ry(pi / 2) q;',
  ),
  rz: gate(
    'rz(angle) target;',
    'Rotates around the Z axis, changing relative phase. Angles are in radians.',
    'rz(-pi / 4) q;',
  ),
  cx: gate(
    'cx control, target;',
    'Controlled X flips the target in branches where the control is 1. A superposed control can create entanglement.',
    'h a;\ncx a, b;',
  ),
  cz: gate(
    'cz control, target;',
    'Negates the branch where both operands are 1. Controls come first.',
    'cz a, b;',
  ),
  cs: gate(
    'cs control, target;',
    'Applies S to the target when the control is 1: phase π/2 on the |11⟩ branch.',
    'cs a, b;',
  ),
  ct: gate(
    'ct control, target;',
    'Applies T to the target when the control is 1: phase π/4 on the |11⟩ branch.',
    'ct a, b;',
  ),
  ccx: gate(
    'ccx control1, control2, target;',
    'Toffoli. Flips the target only when both controls are 1. All operands must be distinct.',
    'ccx a, b, c;',
  ),
  swap: gate(
    'swap first, second;',
    'Exchanges the quantum states of two distinct qubits, including their correlations.',
    'swap a, b;',
  ),
  cswap: gate(
    'cswap control, first, second;',
    'Fredkin. Exchanges the last two qubits when the first qubit is 1. All operands must be distinct.',
    'cswap c, a, b;',
  ),
  qubit: {
    signature: 'qubit name;',
    description:
      'Declares a qubit initialized to |0⟩. Declare it before operations. The first declared qubit is basis bit zero, displayed on the right.',
    example: 'qubit q;',
    chapter: 'syntax',
  },
  bit: {
    signature: 'bit name;',
    description:
      'Declares a classical bit. It is uninitialized until written by measurement and cannot be read before then.',
    example: 'bit result;\nmeasure q -> result;',
    chapter: 'syntax',
  },
  measure: {
    signature: 'measure qubit -> bit;',
    description:
      'Samples a computational-basis outcome, writes it to a declared classical bit, and collapses the joint quantum state. Seed controls reproducibility.',
    example: 'measure q -> result;',
    chapter: 'syntax',
  },
  reset: {
    signature: 'reset qubit;',
    description:
      'Measures the qubit and flips a 1 outcome back to |0⟩. This can destroy entanglement with other qubits.',
    example: 'reset q;',
    chapter: 'syntax',
  },
  inspect: {
    signature: 'inspect state | probabilities | qubit name;',
    description:
      'Records a simulator observation without measuring or changing the state. Recorded snapshots appear in the inspector’s Output tab.',
    example: 'inspect state;\ninspect probabilities;\ninspect qubit q;',
    chapter: 'syntax',
  },
  state: {
    signature: 'inspect state;',
    description:
      'Records complex amplitudes and probabilities of the joint register without changing it.',
    example: 'inspect state;',
    chapter: 'syntax',
  },
  probabilities: {
    signature: 'inspect probabilities;',
    description:
      'Records computational-basis probabilities: the squared magnitude of each amplitude. This does not collapse the state.',
    example: 'inspect probabilities;',
    chapter: 'syntax',
  },
  print: {
    signature: 'print "text";',
    description:
      'Writes a string to the console without affecting quantum state. Quoted strings support escapes such as \\n and \\".',
    example: 'print "Ready\\n";',
    chapter: 'syntax',
  },
  if: {
    signature: 'if bit == 0|1 { gates }',
    description:
      'Executes a gate block when an initialized classical bit matches 0 or 1. Nested conditions are supported; general loops are not.',
    example: 'if result == 1 {\n    x q;\n}',
    chapter: 'syntax',
  },
  halt: {
    signature: 'halt;',
    description:
      'Ends execution immediately. It is optional: reaching the end of the source also completes the program.',
    example: 'halt;',
    chapter: 'syntax',
  },
  pi: {
    signature: 'pi',
    description:
      'The constant π in rotation-angle arithmetic. Expressions support +, −, *, /, unary signs, and parentheses.',
    example: 'ry(pi / 2) q;',
    chapter: 'syntax',
  },
};
export const qodeHover = hoverTooltip(
  (view, pos, side) => {
    const word = view.state.wordAt(pos);
    if (!word || (pos === word.from && side < 0) || (pos === word.to && side > 0)) return null;
    if (/comment|string/i.test(syntaxTree(view.state).resolveInner(word.from, 1).name)) return null;
    const name = view.state.sliceDoc(word.from, word.to),
      help = syntaxHelp[name];
    if (!Object.hasOwn(syntaxHelp, name)) return null;
    return {
      pos: word.from,
      end: word.to,
      above: true,
      create() {
        const dom = document.createElement('div');
        dom.className = 'qode-syntax-help';
        dom.id = 'qode-syntax-help';
        dom.setAttribute('role', 'tooltip');
        const title = document.createElement('strong');
        title.textContent = name;
        const signature = document.createElement('code');
        signature.textContent = help.signature;
        const description = document.createElement('p');
        description.textContent = help.description;
        const example = document.createElement('pre');
        example.textContent = help.example;
        const link = document.createElement('a');
        link.href = `${import.meta.env.BASE_URL}docs/#${help.chapter}`;
        link.textContent = 'Language reference';
        dom.append(title, signature, description, example, link);
        view.contentDOM.setAttribute('aria-describedby', dom.id);
        return {
          dom,
          destroy() {
            view.contentDOM.removeAttribute('aria-describedby');
          },
        };
      },
    };
  },
  { hoverTime: 250, hideOnChange: true },
);
export function showSyntaxHelp(view: EditorView) {
  activateHover(view, view.state.selection.main.head, -1, {
    tooltip: qodeHover,
    until: (tr) => tr.docChanged || !!tr.selection,
  });
  return true;
}
export function dismissSyntaxHelp(view: EditorView) {
  if (!hasHoverTooltips(view.state)) return false;
  view.dispatch({ effects: closeHoverTooltips });
  return true;
}
