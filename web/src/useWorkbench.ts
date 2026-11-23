import { useCallback, useEffect, useRef, useState } from 'react';
import { examples } from './examples';
import { loadWorkspace, saveWorkspace, workspaceLink, consumeShare } from './workspace';
import type { Action, EngineError, Program, Response, Samples, Snapshot } from './types';
export function useWorkbench() {
  const [starting] = useState(loadWorkspace);
  const [source, setSource] = useState(() => starting.source),
    [seed, setSeed] = useState(() => starting.seed),
    [shots, setShots] = useState(() => starting.shots);
  const [program, setProgram] = useState<Program>(),
    [snapshot, setSnapshot] = useState<Snapshot>(),
    [samples, setSamples] = useState<Samples>();
  const [error, setError] = useState<EngineError>(),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState('Loading engine'),
    [toast, setToast] = useState(starting.notice ?? '');
  const [sourceRevision, setSourceRevision] = useState(0);
  const [tab, setTab] = useState<'amplitudes' | 'qubits' | 'output'>('amplitudes');
  const worker = useRef<Worker | null>(null),
    file = useRef<HTMLInputElement>(null),
    values = useRef({ source, seed, shots });
  values.current = { source, seed, shots };
  const active = useRef(false);
  const selected = examples.find((e) => e.source === source),
    next = program?.instructions[snapshot?.pc ?? 0];
  const stop = useCallback(() => {
    const retired = worker.current;
    worker.current = null;
    retired?.terminate();
    active.current = false;
    setSnapshot(undefined);
    setProgram(undefined);
    setSamples(undefined);
    setError(undefined);
    setBusy(false);
    setStatus('Stopped · reset to start again');
  }, []);
  const execute = useCallback((action: Action) => {
    if (active.current) return;
    active.current = true;
    if (!worker.current) {
      const w = new Worker(new URL('./worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.current = w;
      w.onmessage = (event: MessageEvent<Response>) => {
        if (worker.current !== w) return;
        const data = event.data;
        if (data.type === 'error') {
          active.current = false;
          setSnapshot(undefined);
          setProgram(undefined);
          setSamples(undefined);
          setError(data.error);
          setBusy(false);
          setStatus('Needs attention');
          return;
        }
        if (data.program) setProgram(data.program);
        setSnapshot(data.snapshot);
        active.current = data.busy;
        setBusy(data.busy);
        setError(undefined);
        if (data.samples) {
          setSamples(data.samples);
          setStatus(`${data.samples.shots.toLocaleString()} shots complete`);
        } else
          setStatus(
            data.busy
              ? 'Running'
              : data.snapshot.done
                ? 'Execution complete'
                : `Ready · step ${data.snapshot.steps}`,
          );
      };
      w.onerror = () => {
        if (worker.current !== w) return;
        active.current = false;
        setSnapshot(undefined);
        setProgram(undefined);
        setSamples(undefined);
        setError({
          error: 'load',
          message: 'Unable to load the engine. Check the connection, then Reset to retry.',
        });
        setBusy(false);
        w.terminate();
        worker.current = null;
      };
    }
    setBusy(true);
    setError(undefined);
    setSamples(undefined);
    setStatus(action === 'sample' ? 'Sampling' : action === 'run' ? 'Running' : 'Working');
    worker.current.postMessage({
      action,
      ...values.current,
      wasmUrl: new URL(`${import.meta.env.BASE_URL}wasm/qode.js`, location.origin).href,
    });
  }, []);
  useEffect(() => {
    saveWorkspace(values.current);
    consumeShare();
    execute('compile');
    return () => {
      const retired = worker.current;
      worker.current = null;
      retired?.terminate();
      active.current = false;
    };
  }, [execute]);
  useEffect(() => {
    const timer = setTimeout(() => saveWorkspace({ source, seed, shots }), 300);
    return () => clearTimeout(timer);
  }, [source, seed, shots]);
  useEffect(() => {
    const flush = () => saveWorkspace(values.current);
    window.addEventListener('pagehide', flush);
    return () => {
      flush();
      window.removeEventListener('pagehide', flush);
    };
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  function edit(value: string, origin: 'editor' | 'external' = 'editor') {
    if (value === values.current.source) return;
    stop();
    values.current = { ...values.current, source: value };
    setSource(value);
    if (origin === 'external') setSourceRevision((revision) => revision + 1);
    setSnapshot(undefined);
    setProgram(undefined);
    setSamples(undefined);
    setError(undefined);
    setStatus('Edited · ready to compile');
  }
  function changeSeed(value: string) {
    stop();
    values.current = { ...values.current, seed: value };
    setSeed(value);
    setSnapshot(undefined);
    setProgram(undefined);
    setSamples(undefined);
    setError(undefined);
    setStatus('Seed changed · ready');
  }
  useEffect(() => {
    const importShare = () => {
      if (!location.hash.startsWith('#code=')) return;
      saveWorkspace(values.current);
      const incoming = loadWorkspace();
      stop();
      values.current = { source: incoming.source, seed: incoming.seed, shots: incoming.shots };
      setSource(incoming.source);
      setSourceRevision((revision) => revision + 1);
      setSeed(incoming.seed);
      setShots(incoming.shots);
      saveWorkspace(values.current);
      consumeShare();
      setToast(incoming.notice ?? 'Shared experiment loaded.');
      execute('compile');
    };
    window.addEventListener('hashchange', importShare);
    return () => window.removeEventListener('hashchange', importShare);
  }, [execute, stop]);
  async function share() {
    try {
      await navigator.clipboard.writeText(workspaceLink(values.current));
      setToast('Share link copied. It includes your code, seed, and shot count.');
    } catch (cause) {
      setToast(
        cause instanceof Error && cause.message.includes('too large')
          ? cause.message
          : 'Clipboard unavailable. Use Export code to share this experiment.',
      );
    }
  }

  return {
    sourceRevision,
    stop,
    tab,
    setTab,
    source,
    seed,
    shots,
    setShots,
    program,
    snapshot,
    samples,
    error,
    busy,
    status,
    toast,
    selected,
    next,
    execute,
    edit,
    changeSeed,
    share,
    file,
    setToast,
  };
}
