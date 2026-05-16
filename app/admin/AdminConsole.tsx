'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Tab = 'sources' | 'tasks' | 'settings';

interface ApiSourceFull {
  id: string;
  name: string;
  provider: string;
  docUrl: string | null;
  baseUrl: string;
  endpoint: string;
  method: string;
  authType: string;
  apiKeyEnvName: string | null;
  model: string | null;
  requestContentType: string;
  requestBodyTemplate: unknown;
  promptFieldPath: string | null;
  aspectRatioFieldPath: string | null;
  taskIdPath: string | null;
  imageUrlPath: string | null;
  callbackSupported: boolean;
  callbackUrlFieldPath: string | null;
  pollingSupported: boolean;
  statusEndpoint: string | null;
  statusMethod: string | null;
  statusTaskIdParam: string | null;
  statusPath: string | null;
  successStatusValue: string | null;
  failedStatusValue: string | null;
  errorMessagePath: string | null;
  supportedAspectRatios: string[];
  notes: string | null;
  enabled: boolean;
  isDefault: boolean;
  apiKeyEnvConfigured: boolean | null;
}

interface TaskRow {
  id: string;
  taskId: string | null;
  apiSourceId: string;
  apiSourceName: string;
  status: string;
  prompt: string;
  aspectRatio: string | null;
  imageUrl: string | null;
  error: string | null;
  rawResponse: unknown;
  rawCallback: unknown;
  createdAt: string;
  updatedAt: string;
}

interface Settings {
  siteUrl: string;
  adminPasswordConfigured: boolean;
  sessionSecretConfigured: boolean;
  ai: {
    provider: string;
    openaiConfigured: boolean;
    openaiModel: string;
    openaiBaseUrl: string;
  };
  apiKeyEnv: Array<{ envName: string; configured: boolean; usedBy: string[] }>;
  sourceCount: number;
  enabledCount: number;
  hasDefault: boolean;
}

const DEFAULT_RATIOS = ['auto', '1:1', '16:9', '9:16', '4:3', '3:4'];

function emptyForm(): ApiSourceFull {
  return {
    id: '',
    name: '',
    provider: '',
    docUrl: '',
    baseUrl: '',
    endpoint: '',
    method: 'POST',
    authType: 'bearer_token',
    apiKeyEnvName: '',
    model: '',
    requestContentType: 'application/json',
    requestBodyTemplate: {},
    promptFieldPath: '',
    aspectRatioFieldPath: '',
    taskIdPath: '',
    imageUrlPath: '',
    callbackSupported: false,
    callbackUrlFieldPath: '',
    pollingSupported: false,
    statusEndpoint: '',
    statusMethod: '',
    statusTaskIdParam: '',
    statusPath: '',
    successStatusValue: '',
    failedStatusValue: '',
    errorMessagePath: '',
    supportedAspectRatios: DEFAULT_RATIOS.slice(),
    notes: '',
    enabled: true,
    isDefault: false,
    apiKeyEnvConfigured: null,
  };
}

export default function AdminConsole() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('sources');

  return (
    <div className="min-h-screen bg-[#f7f8fb]">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:py-8">
        <header className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold">Admin Console</h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage API sources, tasks, and settings.</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" className="btn-ghost text-xs">View site</a>
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={async () => {
                await fetch('/api/admin/logout', { method: 'POST' });
                router.replace('/admin/login');
              }}
            >
              Sign out
            </button>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-4">
          {/* Sidebar */}
          <aside className="col-span-12 md:col-span-3">
            <nav className="card p-2 flex md:flex-col gap-1 overflow-x-auto">
              {([
                { id: 'sources', label: 'API sources' },
                { id: 'tasks', label: 'Tasks' },
                { id: 'settings', label: 'Settings' },
              ] as Array<{ id: Tab; label: string }>).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`text-left px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
                    tab === t.id ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main */}
          <section className="col-span-12 md:col-span-9 space-y-4">
            {tab === 'sources' && <SourcesTab />}
            {tab === 'tasks' && <TasksTab />}
            {tab === 'settings' && <SettingsTab />}
          </section>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Sources Tab
// =============================================================
function SourcesTab() {
  const [items, setItems] = useState<ApiSourceFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ApiSourceFull | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/api-sources', { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load');
      setItems(json.items as ApiSourceFull[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onToggle = async (id: string) => {
    await fetch(`/api/admin/api-sources/${id}/toggle`, { method: 'POST' });
    load();
  };
  const onSetDefault = async (id: string) => {
    await fetch(`/api/admin/api-sources/${id}/set-default`, { method: 'POST' });
    load();
  };
  const onDelete = async (id: string) => {
    if (!confirm('Delete this API source? This cannot be undone.')) return;
    await fetch(`/api/admin/api-sources/${id}`, { method: 'DELETE' });
    load();
  };

  if (creating || editing) {
    return (
      <SourceEditor
        initial={editing || emptyForm()}
        isNew={creating}
        onCancel={() => { setEditing(null); setCreating(false); }}
        onSaved={() => { setEditing(null); setCreating(false); load(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 sm:p-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold">API sources</h2>
          <p className="text-xs text-gray-500 mt-0.5">Configure providers used to generate images.</p>
        </div>
        <button className="btn-primary text-sm" onClick={() => setCreating(true)}>+ New API source</button>
      </div>

      {loading && <div className="card p-6 text-sm text-gray-500">Loading...</div>}
      {error && <div className="card p-6 text-sm text-red-600">{error}</div>}

      {!loading && items.length === 0 && (
        <div className="card p-6 text-sm text-gray-500">
          No API sources yet. Click <b>New API source</b> to add one (the seed should have created the default Kie.ai source).
        </div>
      )}

      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.id} className="card p-4 sm:p-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900 truncate">{it.name}</h3>
                  {it.isDefault && <span className="pill bg-brand-50 text-brand-700">default</span>}
                  <span className={`pill ${it.enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {it.enabled ? 'enabled' : 'disabled'}
                  </span>
                  {it.apiKeyEnvName && (
                    <span className={`pill ${it.apiKeyEnvConfigured ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {it.apiKeyEnvName}: {it.apiKeyEnvConfigured ? 'configured' : 'missing'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 break-all">
                  {it.provider} · {it.method} {it.baseUrl}{it.endpoint}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary text-xs" onClick={() => setEditing(it)}>Edit</button>
                <button className="btn-secondary text-xs" onClick={() => onToggle(it.id)}>
                  {it.enabled ? 'Disable' : 'Enable'}
                </button>
                {!it.isDefault && (
                  <button className="btn-secondary text-xs" onClick={() => onSetDefault(it.id)}>
                    Set default
                  </button>
                )}
                <button className="btn-secondary text-xs text-red-600" onClick={() => onDelete(it.id)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================
// Source editor (with AI doc parser)
// =============================================================
function SourceEditor({
  initial,
  isNew,
  onCancel,
  onSaved,
}: {
  initial: ApiSourceFull;
  isNew: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ApiSourceFull>({ ...initial });
  const [bodyText, setBodyText] = useState<string>(() =>
    JSON.stringify(initial.requestBodyTemplate ?? {}, null, 2),
  );
  const [ratiosText, setRatiosText] = useState<string>(() =>
    (initial.supportedAspectRatios || []).join(', '),
  );
  const [docUrl, setDocUrl] = useState<string>(initial.docUrl || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);

  const update = <K extends keyof ApiSourceFull>(k: K, v: ApiSourceFull[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  };

  const parseDoc = async () => {
    if (!docUrl) { setError('Please enter a doc URL first'); return; }
    setError(null);
    setParseWarnings([]);
    setParsing(true);
    try {
      const res = await fetch('/api/admin/parse-api-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docUrl }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'AI parsing failed');
      const ai = json.apiSource as ApiSourceFull;

      // Merge into form (keep id and isDefault from existing)
      setForm((f) => ({
        ...f,
        name: ai.name || f.name || 'Untitled API source',
        provider: ai.provider || f.provider,
        docUrl: ai.docUrl || docUrl,
        baseUrl: ai.baseUrl || f.baseUrl,
        endpoint: ai.endpoint || f.endpoint,
        method: ai.method || f.method,
        authType: ai.authType || f.authType,
        apiKeyEnvName: ai.apiKeyEnvName || f.apiKeyEnvName,
        model: ai.model || f.model,
        requestContentType: ai.requestContentType || f.requestContentType,
        promptFieldPath: ai.promptFieldPath || f.promptFieldPath,
        aspectRatioFieldPath: ai.aspectRatioFieldPath || f.aspectRatioFieldPath,
        taskIdPath: ai.taskIdPath || f.taskIdPath,
        imageUrlPath: ai.imageUrlPath || f.imageUrlPath,
        callbackSupported: typeof ai.callbackSupported === 'boolean' ? ai.callbackSupported : f.callbackSupported,
        callbackUrlFieldPath: ai.callbackUrlFieldPath || f.callbackUrlFieldPath,
        pollingSupported: typeof ai.pollingSupported === 'boolean' ? ai.pollingSupported : f.pollingSupported,
        statusEndpoint: ai.statusEndpoint || f.statusEndpoint,
        statusMethod: ai.statusMethod || f.statusMethod,
        statusTaskIdParam: ai.statusTaskIdParam || f.statusTaskIdParam,
        statusPath: ai.statusPath || f.statusPath,
        successStatusValue: ai.successStatusValue || f.successStatusValue,
        failedStatusValue: ai.failedStatusValue || f.failedStatusValue,
        errorMessagePath: ai.errorMessagePath || f.errorMessagePath,
        notes: ai.notes || f.notes,
      }));
      const ratiosArr = Array.isArray(ai.supportedAspectRatios) ? ai.supportedAspectRatios : [];
      if (ratiosArr.length > 0) setRatiosText(ratiosArr.join(', '));

      // Body template
      try {
        if (ai.requestBodyTemplate && typeof ai.requestBodyTemplate === 'object') {
          setBodyText(JSON.stringify(ai.requestBodyTemplate, null, 2));
        } else if (typeof ai.requestBodyTemplate === 'string') {
          // try to pretty-print
          try { setBodyText(JSON.stringify(JSON.parse(ai.requestBodyTemplate), null, 2)); }
          catch { setBodyText(ai.requestBodyTemplate); }
        }
      } catch { /* keep current */ }

      setParseWarnings(json.warnings || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setParsing(false);
    }
  };

  const save = async () => {
    setError(null);
    let bodyParsed: unknown;
    try {
      bodyParsed = JSON.parse(bodyText);
    } catch (e) {
      setError(`Invalid JSON in requestBodyTemplate: ${(e as Error).message}`);
      return;
    }
    const ratios = ratiosText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const payload = {
      ...form,
      docUrl: docUrl || undefined,
      requestBodyTemplate: bodyParsed,
      supportedAspectRatios: ratios.length > 0 ? ratios : DEFAULT_RATIOS.slice(),
    };

    setSaving(true);
    try {
      const url = isNew ? '/api/admin/api-sources' : `/api/admin/api-sources/${form.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Save failed');
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 sm:p-6 flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-semibold">{isNew ? 'New API source' : `Edit: ${form.name || form.id}`}</h2>
        <div className="flex gap-2">
          <button className="btn-secondary text-sm" onClick={onCancel} disabled={saving}>Cancel</button>
          <button className="btn-primary text-sm" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* AI doc parser */}
      <div className="card p-4 sm:p-6">
        <h3 className="font-medium text-sm text-gray-800">AI: identify from doc URL</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Paste a public API docs URL. The AI will fill in fields below; you can still edit anything before saving.
        </p>
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <input
            className="input flex-1"
            placeholder="https://docs.example.com/api/text-to-image"
            value={docUrl}
            onChange={(e) => setDocUrl(e.target.value)}
          />
          <button className="btn-primary text-sm whitespace-nowrap" onClick={parseDoc} disabled={parsing}>
            {parsing ? 'Parsing...' : 'AI identify'}
          </button>
        </div>
        {parseWarnings.length > 0 && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 text-xs px-3 py-2">
            <div className="font-medium mb-1">AI warnings:</div>
            <ul className="list-disc pl-5 space-y-0.5">
              {parseWarnings.map((w, i) => (<li key={i}>{w}</li>))}
            </ul>
          </div>
        )}
        {error && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {/* Identity */}
      <div className="card p-4 sm:p-6 space-y-3">
        <h3 className="font-medium text-sm text-gray-800">Identity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Name"><input className="input" value={form.name} onChange={(e) => update('name', e.target.value)} /></Field>
          <Field label="Provider"><input className="input" value={form.provider} onChange={(e) => update('provider', e.target.value)} /></Field>
          <Field label="Doc URL"><input className="input" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} /></Field>
          <Field label="Notes"><input className="input" value={form.notes || ''} onChange={(e) => update('notes', e.target.value)} /></Field>
        </div>
      </div>

      {/* Endpoint & auth */}
      <div className="card p-4 sm:p-6 space-y-3">
        <h3 className="font-medium text-sm text-gray-800">Endpoint &amp; Auth</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Base URL"><input className="input" value={form.baseUrl} onChange={(e) => update('baseUrl', e.target.value)} placeholder="https://api.example.com" /></Field>
          <Field label="Endpoint"><input className="input" value={form.endpoint} onChange={(e) => update('endpoint', e.target.value)} placeholder="/v1/images" /></Field>
          <Field label="Method">
            <select className="select" value={form.method} onChange={(e) => update('method', e.target.value)}>
              {['POST', 'GET', 'PUT', 'PATCH'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Content type">
            <input className="input" value={form.requestContentType} onChange={(e) => update('requestContentType', e.target.value)} />
          </Field>
          <Field label="Auth type">
            <select className="select" value={form.authType} onChange={(e) => update('authType', e.target.value)}>
              <option value="bearer_token">bearer_token</option>
              <option value="api_key_header">api_key_header (x-api-key)</option>
              <option value="api_key_query">api_key_query (?api_key=)</option>
              <option value="none">none</option>
            </select>
          </Field>
          <Field label="API key env name (e.g. KIE_API_KEY)">
            <input className="input" value={form.apiKeyEnvName || ''} onChange={(e) => update('apiKeyEnvName', e.target.value)} />
          </Field>
          <Field label="Model id (passed as {{model}})">
            <input className="input" value={form.model || ''} onChange={(e) => update('model', e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Body template */}
      <div className="card p-4 sm:p-6 space-y-3">
        <h3 className="font-medium text-sm text-gray-800">Request body template (JSON)</h3>
        <p className="text-xs text-gray-500">
          Use <code className="px-1 bg-gray-100 rounded">{'{{prompt}}'}</code>,&nbsp;
          <code className="px-1 bg-gray-100 rounded">{'{{aspectRatio}}'}</code>,&nbsp;
          <code className="px-1 bg-gray-100 rounded">{'{{callbackUrl}}'}</code>,&nbsp;
          <code className="px-1 bg-gray-100 rounded">{'{{model}}'}</code>.
        </p>
        <textarea
          className="textarea font-mono text-xs"
          rows={12}
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          spellCheck={false}
        />
      </div>

      {/* Field paths */}
      <div className="card p-4 sm:p-6 space-y-3">
        <h3 className="font-medium text-sm text-gray-800">Field paths (dot-notation)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="promptFieldPath"><input className="input" value={form.promptFieldPath || ''} onChange={(e) => update('promptFieldPath', e.target.value)} placeholder="input.prompt" /></Field>
          <Field label="aspectRatioFieldPath"><input className="input" value={form.aspectRatioFieldPath || ''} onChange={(e) => update('aspectRatioFieldPath', e.target.value)} placeholder="input.aspect_ratio" /></Field>
          <Field label="taskIdPath"><input className="input" value={form.taskIdPath || ''} onChange={(e) => update('taskIdPath', e.target.value)} placeholder="data.taskId" /></Field>
          <Field label="imageUrlPath"><input className="input" value={form.imageUrlPath || ''} onChange={(e) => update('imageUrlPath', e.target.value)} placeholder="data.imageUrl" /></Field>
          <Field label="errorMessagePath"><input className="input" value={form.errorMessagePath || ''} onChange={(e) => update('errorMessagePath', e.target.value)} placeholder="msg" /></Field>
          <Field label="callbackUrlFieldPath"><input className="input" value={form.callbackUrlFieldPath || ''} onChange={(e) => update('callbackUrlFieldPath', e.target.value)} placeholder="callBackUrl" /></Field>
        </div>
      </div>

      {/* Callback / polling */}
      <div className="card p-4 sm:p-6 space-y-3">
        <h3 className="font-medium text-sm text-gray-800">Callback / Polling</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={form.callbackSupported} onChange={(e) => update('callbackSupported', e.target.checked)} />
            <span>Callback supported</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={form.pollingSupported} onChange={(e) => update('pollingSupported', e.target.checked)} />
            <span>Polling supported</span>
          </label>
        </div>
        {form.pollingSupported && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="statusEndpoint"><input className="input" value={form.statusEndpoint || ''} onChange={(e) => update('statusEndpoint', e.target.value)} placeholder="/v1/jobs/status" /></Field>
            <Field label="statusMethod">
              <select className="select" value={form.statusMethod || ''} onChange={(e) => update('statusMethod', e.target.value)}>
                <option value="">(none)</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </Field>
            <Field label="statusTaskIdParam"><input className="input" value={form.statusTaskIdParam || ''} onChange={(e) => update('statusTaskIdParam', e.target.value)} placeholder="taskId" /></Field>
            <Field label="statusPath"><input className="input" value={form.statusPath || ''} onChange={(e) => update('statusPath', e.target.value)} placeholder="data.status" /></Field>
            <Field label="successStatusValue"><input className="input" value={form.successStatusValue || ''} onChange={(e) => update('successStatusValue', e.target.value)} placeholder="success" /></Field>
            <Field label="failedStatusValue"><input className="input" value={form.failedStatusValue || ''} onChange={(e) => update('failedStatusValue', e.target.value)} placeholder="failed" /></Field>
          </div>
        )}
      </div>

      {/* UI options */}
      <div className="card p-4 sm:p-6 space-y-3">
        <h3 className="font-medium text-sm text-gray-800">Front-end options</h3>
        <Field label="Supported aspect ratios (comma-separated)">
          <input className="input" value={ratiosText} onChange={(e) => setRatiosText(e.target.value)} placeholder="auto, 1:1, 16:9, 9:16, 4:3, 3:4" />
        </Field>
        <div className="flex flex-wrap gap-4 text-sm pt-1">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={form.enabled} onChange={(e) => update('enabled', e.target.checked)} />
            <span>Enabled</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => update('isDefault', e.target.checked)} />
            <span>Set as default</span>
          </label>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button className="btn-secondary text-sm" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn-primary text-sm" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

// =============================================================
// Tasks Tab
// =============================================================
function TasksTab() {
  const [items, setItems] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/admin/tasks?limit=50${statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : ''}`;
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load tasks');
      setItems(json.items as TaskRow[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="card p-4 sm:p-6 flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-semibold">Tasks</h2>
        <div className="flex items-center gap-2">
          <select className="select text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="pending">pending</option>
            <option value="processing">processing</option>
            <option value="success">success</option>
            <option value="failed">failed</option>
          </select>
          <button className="btn-secondary text-sm" onClick={load}>Refresh</button>
        </div>
      </div>

      {loading && <div className="card p-6 text-sm text-gray-500">Loading...</div>}
      {error && <div className="card p-6 text-sm text-red-600">{error}</div>}

      {!loading && items.length === 0 && (
        <div className="card p-6 text-sm text-gray-500">No tasks yet.</div>
      )}

      <div className="space-y-3">
        {items.map((t) => (
          <div key={t.id} className="card p-4">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusPill status={t.status} />
                  <span className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleString()}</span>
                  <span className="text-xs text-gray-400">· {t.apiSourceName}</span>
                </div>
                <p className="text-sm text-gray-800 mt-1.5 line-clamp-2 break-words">{t.prompt}</p>
                {t.error && <p className="text-xs text-red-600 mt-1">{t.error}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {t.imageUrl && (
                  <a className="btn-secondary text-xs" href={t.imageUrl} target="_blank" rel="noreferrer">Open image</a>
                )}
                <button className="btn-secondary text-xs" onClick={() => setOpenId(openId === t.id ? null : t.id)}>
                  {openId === t.id ? 'Hide raw' : 'Raw'}
                </button>
              </div>
            </div>
            {openId === t.id && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <RawBox title="rawResponse" value={t.rawResponse} />
                <RawBox title="rawCallback" value={t.rawCallback} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RawBox({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
      <div className="text-xs font-medium text-gray-700 mb-1">{title}</div>
      <pre className="text-[11px] leading-snug whitespace-pre-wrap break-words text-gray-700 max-h-72 overflow-auto">
        {value ? JSON.stringify(value, null, 2) : '(empty)'}
      </pre>
    </div>
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

// =============================================================
// Settings Tab
// =============================================================
function SettingsTab() {
  const [s, setS] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings', { cache: 'no-store' });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to load settings');
        setS(json.settings as Settings);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="card p-6 text-sm text-gray-500">Loading...</div>;
  if (error) return <div className="card p-6 text-sm text-red-600">{error}</div>;
  if (!s) return null;

  return (
    <div className="space-y-4">
      <div className="card p-4 sm:p-6">
        <h2 className="font-semibold mb-3">Settings</h2>
        <p className="text-xs text-gray-500 mb-4">
          Only configuration status is shown here. Real values never leave the server.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Stat label="Site URL" value={s.siteUrl || '(not set)'} />
          <Stat label="ADMIN_PASSWORD" value={s.adminPasswordConfigured ? 'configured' : 'missing'} good={s.adminPasswordConfigured} />
          <Stat label="SESSION_SECRET" value={s.sessionSecretConfigured ? 'configured' : 'missing'} good={s.sessionSecretConfigured} />
          <Stat label="AI provider" value={s.ai.provider} />
          <Stat label="OPENAI_API_KEY" value={s.ai.openaiConfigured ? 'configured' : 'missing'} good={s.ai.openaiConfigured} />
          <Stat label="OPENAI_MODEL" value={s.ai.openaiModel} />
          <Stat label="OPENAI_BASE_URL" value={s.ai.openaiBaseUrl} />
          <Stat label="API sources" value={`${s.enabledCount} enabled / ${s.sourceCount} total`} good={s.hasDefault} />
        </div>

        <h3 className="font-medium text-sm text-gray-800 mt-6 mb-2">Provider API key env vars</h3>
        {s.apiKeyEnv.length === 0 && <p className="text-xs text-gray-500">No sources require API key envs.</p>}
        <div className="space-y-2">
          {s.apiKeyEnv.map((e) => (
            <div key={e.envName} className="rounded-lg border border-gray-100 p-3 flex items-start justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-mono">{e.envName}</div>
                <div className="text-xs text-gray-500">Used by: {e.usedBy.join(', ')}</div>
              </div>
              <span className={`pill ${e.configured ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {e.configured ? 'configured' : 'missing'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-sm mt-0.5 font-mono break-all ${good === false ? 'text-amber-700' : good === true ? 'text-green-700' : 'text-gray-800'}`}>
        {value}
      </div>
    </div>
  );
}
