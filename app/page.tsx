'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface ApiSourceLite {
  id: string;
  name: string;
  provider: string;
  model: string | null;
  supportedAspectRatios: string[];
  isDefault: boolean;
}

interface TaskStatus {
  taskId: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  prompt: string;
  aspectRatio: string | null;
  imageUrl: string | null;
  error: string | null;
  apiSourceName: string;
}

const DEFAULT_RATIOS = ['auto', '1:1', '16:9', '9:16', '4:3', '3:4'];

export default function HomePage() {
  const [sources, setSources] = useState<ApiSourceLite[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourcesError, setSourcesError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');

  const [submitting, setSubmitting] = useState(false);
  const [task, setTask] = useState<TaskStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A monotonically increasing token used to invalidate stale poll responses
  // when the user submits a new request before the previous one resolved.
  const submissionTokenRef = useRef(0);

  // Load API sources
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/api-sources', { cache: 'no-store' });
        const json = await res.json();
        if (cancelled) return;
        if (!json.success) throw new Error(json.error || 'Failed to load API sources');
        const items: ApiSourceLite[] = json.items || [];
        setSources(items);
        const def = items.find((s) => s.isDefault) || items[0];
        if (def) {
          setSelectedId(def.id);
          const ratios = def.supportedAspectRatios?.length ? def.supportedAspectRatios : DEFAULT_RATIOS;
          setAspectRatio(ratios.includes('1:1') ? '1:1' : ratios[0]);
        }
      } catch (e) {
        if (!cancelled) setSourcesError((e as Error).message);
      } finally {
        if (!cancelled) setSourcesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Reset aspect ratio when switching sources
  useEffect(() => {
    const s = sources.find((x) => x.id === selectedId);
    if (!s) return;
    const ratios = s.supportedAspectRatios?.length ? s.supportedAspectRatios : DEFAULT_RATIOS;
    if (!ratios.includes(aspectRatio)) {
      setAspectRatio(ratios.includes('1:1') ? '1:1' : ratios[0]);
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  const currentSource = useMemo(
    () => sources.find((s) => s.id === selectedId) || null,
    [sources, selectedId],
  );
  const ratiosForCurrent = useMemo(() => {
    if (!currentSource) return DEFAULT_RATIOS;
    return currentSource.supportedAspectRatios?.length
      ? currentSource.supportedAspectRatios
      : DEFAULT_RATIOS;
  }, [currentSource]);

  const startPolling = useCallback((taskId: string, token: number) => {
    let attempts = 0;
    const tick = async () => {
      // Bail out if a newer submission has started
      if (token !== submissionTokenRef.current) return;
      attempts += 1;
      try {
        const res = await fetch(`/api/task-status?taskId=${encodeURIComponent(taskId)}`, { cache: 'no-store' });
        const json = await res.json();
        // Re-check token in case the user submitted again while the request was in flight
        if (token !== submissionTokenRef.current) return;
        if (json.success && json.task) {
          setTask(json.task as TaskStatus);
          if (json.task.status === 'success' || json.task.status === 'failed') return;
        }
      } catch {
        // network blip - keep trying
      }
      // Up to ~3 minutes (60 * 3s)
      if (attempts < 60 && token === submissionTokenRef.current) {
        pollRef.current = setTimeout(tick, 3000);
      }
    };
    if (pollRef.current) clearTimeout(pollRef.current);
    pollRef.current = setTimeout(tick, 2000);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!prompt.trim()) {
      setErrorMsg('Please enter a prompt');
      return;
    }
    if (!selectedId) {
      setErrorMsg('Please choose an API source');
      return;
    }
    setSubmitting(true);
    setTask(null);
    // Invalidate any in-flight poll from a previous submission
    const token = ++submissionTokenRef.current;
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), aspectRatio, apiSourceId: selectedId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to start generation');

      const initial: TaskStatus = {
        taskId: json.taskId,
        status: json.status || (json.imageUrl ? 'success' : 'processing'),
        prompt: prompt.trim(),
        aspectRatio,
        imageUrl: json.imageUrl ?? null,
        error: null,
        apiSourceName: currentSource?.name || '',
      };
      setTask(initial);
      if (initial.status !== 'success' && initial.status !== 'failed') {
        startPolling(json.taskId, token);
      }
    } catch (e) {
      setErrorMsg((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyText = async (text: string, label: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showToast(`${label} copied`);
    } catch {
      showToast('Copy failed');
    }
  };

  const downloadImage = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `aig-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    } catch {
      // Fallback - open in a new tab
      window.open(url, '_blank', 'noopener');
      showToast('Open the image, then long-press to save');
    }
  };

  return (
    <main className="min-h-screen mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            AI Image Generator
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Generate images with one click. Switch providers anytime.
          </p>
        </div>
        <a
          href="/admin"
          className="text-xs text-gray-400 hover:text-gray-700 underline-offset-4 hover:underline"
        >
          Admin
        </a>
      </header>

      {/* Generation form */}
      <section className="card p-4 sm:p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="prompt">Prompt</label>
            <textarea
              id="prompt"
              className="textarea"
              placeholder="A cute cat sitting in a cyberpunk city, neon lights..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={4000}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="source">API source</label>
              <select
                id="source"
                className="select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={sourcesLoading || sources.length === 0}
              >
                {sourcesLoading && <option>Loading...</option>}
                {!sourcesLoading && sources.length === 0 && <option>No API source available</option>}
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.isDefault ? '· default' : ''}
                  </option>
                ))}
              </select>
              {sourcesError && (
                <p className="mt-1 text-xs text-red-600">{sourcesError}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="ratio">Aspect ratio</label>
              <select
                id="ratio"
                className="select"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
              >
                {ratiosForCurrent.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={submitting || sourcesLoading || sources.length === 0}
          >
            {submitting ? 'Submitting...' : 'Generate image'}
          </button>
        </form>
      </section>

      {/* Result */}
      {task && (
        <section className="card mt-5 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Result</h2>
            <StatusPill status={task.status} />
          </div>

          {task.status === 'failed' && (
            <div className="rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2">
              {task.error || 'Generation failed'}
            </div>
          )}

          {task.status !== 'success' && task.status !== 'failed' && (
            <div className="aspect-square w-full max-h-[480px] rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
              <div className="flex flex-col items-center text-gray-500">
                <Spinner />
                <p className="mt-3 text-sm">Generating, this can take 10-60 seconds...</p>
              </div>
            </div>
          )}

          {task.status === 'success' && task.imageUrl && (
            <div className="space-y-4">
              <div className="rounded-xl bg-gray-50 overflow-hidden border border-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={task.imageUrl}
                  alt={task.prompt}
                  className="w-full h-auto"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button type="button" className="btn-secondary" onClick={() => downloadImage(task.imageUrl!)}>
                  Download
                </button>
                <button type="button" className="btn-secondary" onClick={() => copyText(task.imageUrl!, 'Image URL')}>
                  Copy URL
                </button>
                <button type="button" className="btn-secondary col-span-2 sm:col-span-1" onClick={() => copyText(task.prompt, 'Prompt')}>
                  Copy prompt
                </button>
              </div>
            </div>
          )}

          <p className="mt-3 text-xs text-gray-400">
            Source: {task.apiSourceName || '—'} · Task: {task.taskId}
          </p>
        </section>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-gray-900 text-white text-xs shadow-lg">
          {toast}
        </div>
      )}

      <footer className="mt-10 mb-4 text-center text-xs text-gray-400">
        AI Image Generator Platform
      </footer>
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    processing: 'bg-blue-50 text-blue-700',
    success: 'bg-green-50 text-green-700',
    failed: 'bg-red-50 text-red-700',
  };
  return <span className={`pill ${map[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>;
}

function Spinner() {
  return (
    <span
      className="inline-block w-6 h-6 rounded-full border-2 border-gray-300 border-t-brand-500 animate-spin"
      role="status"
      aria-label="loading"
    />
  );
}
