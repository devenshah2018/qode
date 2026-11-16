export type Instruction = {
  op: string;
  line: number;
  column: number;
  offset: number;
  length: number;
  qubits: number[];
  angle: number;
  jump: number;
  bit: number;
  conditionValue: number;
};
export type Program = {
  schemaVersion: number;
  qubits: string[];
  bits: string[];
  instructions: Instruction[];
};
export type Amplitude = {
  basis: string;
  re: number;
  im: number;
  probability: number;
};
export type Reduced = {
  name: string;
  x: number;
  y: number;
  z: number;
  purity: number;
};
export type Snapshot = {
  schemaVersion: number;
  seed: string;
  pc: number;
  steps: number;
  done: boolean;
  stateSize: number;
  stateTruncated: boolean;
  norm: number;
  qubits: string[];
  bits: { name: string; value: number | null }[];
  amplitudes: Amplitude[];
  reduced: Reduced[];
  observations: Observation[];
};
export type Observation = {
  kind: 'print' | 'inspect';
  line: number;
  text?: string;
  view?: string;
  qubit?: number;
  snapshot?: Omit<Snapshot, 'observations'>;
};
export type Samples = {
  schemaVersion: number;
  seed: string;
  shots: number;
  optimized: boolean;
  qubits: string[];
  bits: string[];
  counts: Record<string, number>;
};
export type EngineError = {
  error: string;
  message: string;
  line?: number;
  column?: number;
  offset?: number;
};
export type Action = 'compile' | 'step' | 'run' | 'back' | 'reset' | 'sample';
export type Request = {
  action: Action;
  source: string;
  seed: string;
  shots: number;
  wasmUrl: string;
};
export type Response =
  | {
      type: 'state';
      program?: Program;
      snapshot: Snapshot;
      samples?: Samples;
      busy: boolean;
      checkpointBytes: number;
    }
  | { type: 'error'; error: EngineError };
