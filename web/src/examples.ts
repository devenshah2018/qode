const sources = import.meta.glob('../../examples/*.qc', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const metadata = [
  [
    'bell',
    '01',
    'Entanglement',
    'Two qubits. One shared outcome.',
    'Apply H to Alice, then CX. Notice that both qubits become mixed on their own, while the joint state has only 00 and 11.',
  ],
  [
    'superposition',
    '02',
    'Superposition',
    'A quantum coin, before the toss.',
    'H creates equal amplitudes. Measurement selects one branch and changes the state. Reset and change the seed to try again.',
  ],
  [
    'interference',
    '03',
    'Interference',
    'Two paths can cancel.',
    'The first H creates two paths. The second H recombines their amplitudes and returns the qubit to 0.',
  ],
  [
    'ghz',
    '04',
    'Three-way correlation',
    'Extend the Bell idea to three qubits.',
    'Each qubit looks random, but the only measurement strings are 000 and 111. Try the sampler.',
  ],
  [
    'grover',
    '05',
    'Grover search',
    'Amplify the answer you are looking for.',
    'The oracle marks 11 with a phase. The diffusion sequence turns that invisible phase into a certain measurement outcome.',
  ],
  [
    'teleportation',
    '06',
    'Teleportation',
    'Move a state using two classical bits.',
    'The message begins in a complex state. Entanglement, measurements, and corrections recreate its Bloch vector on Bob. Compare the two inspections.',
  ],
] as const;
export const examples = metadata.map(([id, number, title, subtitle, lesson]) => ({
  id,
  number,
  title,
  subtitle,
  lesson,
  source: sources[`../../examples/${id}.qc`],
}));
