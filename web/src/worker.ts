/// <reference lib="webworker" />
import type { Request, Response, Program, Snapshot, EngineError, Samples } from './types';

type Module = {
  getValue(pointer: number, type: string): number;
  stringToUTF8(text: string, pointer: number, maxBytes: number): void;
  _malloc(n: number): number;
  _free(p: number): void;
  UTF8ToString(p: number): string;
  ccall(name: string, result: string | null, types: string[], args: (string | number)[]): number;
};
let module: Module | undefined;
let session = 0;
let currentSource = '',
  currentSeed = '';
let program: Program;
let publishProgram = true;
let snapshot: Snapshot;
let checkpoints: { steps: number; handle: number; bytes: number }[] = [];
const BUDGET = 64 * 1024 * 1024;
const emit = (response: Response) => self.postMessage(response);
const call = (name: string, types: string[] = [], args: (string | number)[] = []) =>
  module!.ccall(`qode_web_${name}`, 'number', types, args);
function json<T>(name: string, types: string[], args: (string | number)[]): T {
  const pointer = call(name, types, args);
  if (!pointer)
    throw {
      error: 'memory',
      message: 'The engine reached its memory limit. Reset or use a smaller circuit.',
    };
  try {
    return JSON.parse(module!.UTF8ToString(pointer)) as T;
  } finally {
    module!._free(pointer);
  }
}
function clearCheckpoints() {
  for (const c of checkpoints) call('drop', ['number'], [c.handle]);
  checkpoints = [];
}
function checkpoint() {
  if (program.qubits.length > 12 || checkpoints.some((c) => c.steps === snapshot.steps)) return;
  const bytes = call('bytes', ['number'], [session]);
  // Evict oldest noninitial checkpoint before allocating a replacement.
  while (checkpoints.length > 1 && checkpoints.reduce((n, c) => n + c.bytes, 0) + bytes > BUDGET) {
    call('drop', ['number'], [checkpoints[1].handle]);
    checkpoints.splice(1, 1);
  }
  if (checkpoints.reduce((n, c) => n + c.bytes, 0) + bytes > BUDGET) return;
  const handle = call('clone', ['number'], [session]);
  if (!handle) throw { error: 'memory', message: 'Unable to save a debugger checkpoint.' };
  checkpoints.push({ steps: snapshot.steps, handle, bytes });
  checkpoints.sort((a, b) => a.steps - b.steps);
}
function read() {
  snapshot = json<Snapshot>('state', ['number'], [session]);
}
function send(busy = false, samples?: Samples) {
  emit({
    type: 'state',
    program: publishProgram ? program : undefined,
    snapshot,
    busy,
    samples,
    checkpointBytes: checkpoints.reduce((n, c) => n + c.bytes, 0),
  });
  publishProgram = false;
}
function step() {
  const status = call('step', ['number'], [session]);
  if (status > 1)
    throw {
      error: 'runtime',
      message: `Execution stopped (${['ok', 'done', 'syntax', 'semantic', 'limit', 'memory', 'invalid', 'cancelled'][status]}). Try fewer inspection statements or a smaller circuit.`,
    };
  return status;
}
async function handle(request: Request) {
  if (request.source.includes('\0') || new TextEncoder().encode(request.source).length > 1048576)
    throw {
      error: 'source',
      message: 'Source must be at most 1 MiB and contain no NUL bytes.',
    };
  if (!/^\d+$/.test(request.seed) || BigInt(request.seed) > 18446744073709551615n)
    throw {
      error: 'seed',
      message: 'Seed must be an unsigned 64-bit integer.',
    };
  if (
    request.action === 'sample' &&
    (!Number.isInteger(request.shots) || request.shots < 1 || request.shots > 100000)
  )
    throw { error: 'shots', message: 'Shots must be between 1 and 100,000.' };
  if (!module) {
    const factory = (await import(/* @vite-ignore */ request.wasmUrl)).default;
    module = await factory({
      locateFile: (name: string) => new URL(name, request.wasmUrl).href,
    });
  }
  const changed = !session || request.source !== currentSource || request.seed !== currentSeed;
  if (changed) {
    clearCheckpoints();
    if (session) call('destroy', ['number'], [session]);
    session = 0;
    const out = module!._malloc(4);
    if (!out) throw { error: 'memory', message: 'Unable to allocate a session.' };
    let result: EngineError | { ok: boolean };
    try {
      const bytes = new TextEncoder().encode(request.source).length + 1;
      const sourcePointer = module!._malloc(bytes);
      if (!sourcePointer) throw { error: 'memory', message: 'Unable to allocate source.' };
      try {
        module!.stringToUTF8(request.source, sourcePointer, bytes);
        result = json(
          'compile',
          ['number', 'string', 'number'],
          [sourcePointer, request.seed, out],
        );
      } finally {
        module!._free(sourcePointer);
      }
      session = module!.getValue(out, '*');
    } finally {
      module!._free(out);
    }
    if ('error' in result) throw result;
    currentSource = request.source;
    currentSeed = request.seed;
    program = json<Program>('program', ['number'], [session]);
    publishProgram = true;
    read();
    checkpoint();
  }
  if (request.action === 'reset') {
    clearCheckpoints();
    call('reset', ['number', 'string'], [session, request.seed]);
    read();
    checkpoint();
  } else if (request.action === 'step') {
    if (program.qubits.length > 12)
      throw {
        error: 'limit',
        message: 'Interactive stepping supports up to 12 qubits. Run and Sample support 16.',
      };
    step();
    read();
    if (snapshot.steps % 32 === 0) checkpoint();
  } else if (request.action === 'back' && snapshot.steps) {
    const target = snapshot.steps - 1;
    const c = checkpoints.filter((c) => c.steps <= target).at(-1)!;
    if (call('restore', ['number', 'number'], [session, c.handle]) !== 0)
      throw { error: 'memory', message: 'Unable to restore checkpoint.' };
    read();
    while (snapshot.steps < target) {
      step();
      read();
    }
  } else if (request.action === 'run') {
    if (snapshot.done) {
      send();
      return;
    }
    let executed = snapshot.steps;
    while (!snapshot.done) {
      for (let i = 0; i < 128; i++) {
        if (step() === 1) break;
        executed++;
        if (program.qubits.length <= 12 && executed % 32 === 0) {
          read();
          checkpoint();
          if (snapshot.done) break;
        }
      }
      read();
      send(!snapshot.done);
      if (!snapshot.done) await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return;
  } else if (request.action === 'sample') {
    const result = json<Samples | EngineError>(
      'sample',
      ['number', 'number', 'string'],
      [session, request.shots, request.seed],
    );
    if ('error' in result) throw result;
    send(false, result);
    return;
  }
  if (request.action === 'compile') publishProgram = true;
  send();
}
let queue = Promise.resolve();
self.onmessage = (event: MessageEvent<Request>) => {
  queue = queue
    .then(() => handle(event.data))
    .catch((cause: unknown) => {
      const error: EngineError =
        typeof cause === 'object' && cause && 'error' in cause
          ? (cause as EngineError)
          : {
              error: 'engine',
              message: cause instanceof Error ? cause.message : String(cause),
            };
      clearCheckpoints();
      if (session) call('destroy', ['number'], [session]);
      session = 0;
      emit({ type: 'error', error });
    });
};
