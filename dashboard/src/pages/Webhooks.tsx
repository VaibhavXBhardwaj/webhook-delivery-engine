import { useEffect, useState } from 'react';
import { RefreshCw, X, CheckCircle, XCircle, Clock, Plus, Trash2, Edit2, BarChart2 } from 'lucide-react';
import { api } from '../lib/api';
import { statusBadge, Badge } from '../components/Badge';

interface Webhook {
  id: string;
  url: string;
  eventTypes: string[];
  status: string;
  failureCount: number;
  createdAt: string;
}

interface HistoryData {
  webhook: { id: string; url: string; status: string; failureCount: number };
  stats: {
    total: number;
    successful: number;
    failed: number;
    pending: number;
    dlq: number;
    successRate: string;
    avgResponseTimeMs: number;
  };
  attempts: Array<{
    id: string;
    status: string;
    httpStatusCode: number | null;
    responseTimeMs: number | null;
    attemptNumber: number;
    errorMessage: string | null;
    createdAt: string;
    event: { eventType: string };
  }>;
}

interface AnalyticsData {
  webhook: { id: string; url: string; status: string; eventTypes: string[]; failureCount: number; createdAt: string };
  stats: {
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    dlqCount: number;
    successRate: string;
    responseTime: { avg: number; min: number; max: number };
  };
  recentAttempts: Array<{
    id: string;
    status: string;
    httpStatusCode: number | null;
    responseTimeMs: number | null;
    attemptNumber: number;
    createdAt: string;
    event: { eventType: string; createdAt: string };
  }>;
}

const EVENT_TYPES = [
  'payment.success', 'payment.failed', 'order.created',
  'order.updated', 'order.cancelled', 'user.created',
  'user.deleted', 'subscription.created', 'subscription.cancelled', '*',
];

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

type DrawerMode = 'history' | 'analytics' | 'add' | 'edit';

export function Webhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('history');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Add/Edit form state
  const [formUrl, setFormUrl] = useState('');
  const [formEventTypes, setFormEventTypes] = useState<string[]>(['payment.success']);
  const [formStatus, setFormStatus] = useState('ACTIVE');
  const [editingId, setEditingId] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/webhooks');
      setWebhooks(res.data || []);
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 3000);
  }

  function openDrawer(mode: DrawerMode) {
    setDrawerMode(mode);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setFormError('');
  }

  async function viewHistory(id: string) {
    openDrawer('history');
    setDrawerLoading(true);
    setHistory(null);
    try {
      const res = await api.get(`/webhooks/${id}/history`);
      setHistory(res.data);
    } finally {
      setDrawerLoading(false);
    }
  }

  async function viewAnalytics(id: string) {
    openDrawer('analytics');
    setDrawerLoading(true);
    setAnalytics(null);
    try {
      const res = await api.get(`/analytics/webhook/${id}`);
      setAnalytics(res.data);
    } finally {
      setDrawerLoading(false);
    }
  }

  function openAdd() {
    setFormUrl('');
    setFormEventTypes(['payment.success']);
    setFormError('');
    openDrawer('add');
  }

  function openEdit(w: Webhook) {
    setEditingId(w.id);
    setFormUrl(w.url);
    setFormEventTypes(w.eventTypes);
    setFormStatus(w.status);
    setFormError('');
    openDrawer('edit');
  }

  async function handleAdd() {
    if (!formUrl.trim()) { setFormError('URL is required'); return; }
    if (formEventTypes.length === 0) { setFormError('Select at least one event type'); return; }
    setFormLoading(true);
    setFormError('');
    try {
      const res = await api.post('/webhooks', { url: formUrl, eventTypes: formEventTypes });
      if (res.success) {
        showToast('Webhook registered successfully');
        closeDrawer();
        load();
      } else {
        setFormError(res.message || res.errors?.[0]?.message || 'Failed to create webhook');
      }
    } catch {
      setFormError('Request failed');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleEdit() {
    setFormLoading(true);
    setFormError('');
    try {
      const res = await api.put(`/webhooks/${editingId}`, {
        url: formUrl,
        eventTypes: formEventTypes,
        status: formStatus,
      });
      if (res.success) {
        showToast('Webhook updated successfully');
        closeDrawer();
        load();
      } else {
        setFormError(res.message || 'Failed to update webhook');
      }
    } catch {
      setFormError('Request failed');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this webhook? This cannot be undone.')) return;
    try {
      const res = await api.delete(`/webhooks/${id}`);
      if (res.success) {
        showToast('Webhook deleted');
        load();
      } else {
        showToast('Failed to delete', 'error');
      }
    } catch {
      showToast('Failed to delete', 'error');
    }
  }

  async function reactivate(id: string) {
    try {
      const res = await api.post(`/webhooks/${id}/reactivate`);
      if (res.success) {
        showToast('Webhook reactivated');
        load();
      } else {
        showToast('Failed to reactivate', 'error');
      }
    } catch {
      showToast('Failed to reactivate', 'error');
    }
  }

  function toggleEventType(et: string) {
    setFormEventTypes(prev =>
      prev.includes(et) ? prev.filter(e => e !== et) : [...prev, et]
    );
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">Webhooks</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Manage registered webhook endpoints</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#222] rounded-lg text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm text-white font-medium transition-colors"
          >
            <Plus size={15} />
            Add Webhook
          </button>
        </div>
      </div>

      <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-600 text-sm">Loading webhooks...</div>
        ) : webhooks.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-zinc-500 text-sm mb-3">No webhooks registered yet</p>
            <button
              onClick={openAdd}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Register your first webhook
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#222]">
                {['URL', 'Event Types', 'Status', 'Failures', 'Created', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs text-zinc-600 uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {webhooks.map((w, i) => (
                <tr key={w.id} className={`border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors ${i === webhooks.length - 1 ? 'border-0' : ''}`}>
                  <td className="px-5 py-4">
                    <span className="text-sm text-zinc-300 font-mono truncate block max-w-[180px]" title={w.url}>{w.url}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {w.eventTypes.map(e => <Badge key={e} label={e} variant="accent" />)}
                    </div>
                  </td>
                  <td className="px-5 py-4">{statusBadge(w.status)}</td>
                  <td className="px-5 py-4">
                    <span className={`text-sm font-medium ${w.failureCount > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                      {w.failureCount}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-zinc-500">{timeAgo(w.createdAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => viewHistory(w.id)} className="px-2.5 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-xs text-zinc-400 hover:text-white transition-colors" title="Delivery History">
                        History
                      </button>
                      <button onClick={() => viewAnalytics(w.id)} className="p-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-zinc-400 hover:text-indigo-400 transition-colors" title="Analytics">
                        <BarChart2 size={13} />
                      </button>
                      <button onClick={() => openEdit(w)} className="p-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-zinc-400 hover:text-white transition-colors" title="Edit">
                        <Edit2 size={13} />
                      </button>
                      {w.status === 'SUSPENDED' && (
                        <button onClick={() => reactivate(w.id)} className="px-2.5 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400 hover:bg-green-500/20 transition-colors">
                          Reactivate
                        </button>
                      )}
                      <button onClick={() => handleDelete(w.id)} className="p-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-zinc-400 hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 bg-black/60 z-40" onClick={closeDrawer} />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 bottom-0 w-[520px] bg-[#111] border-l border-[#222] z-50 overflow-y-auto transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-white">
              {drawerMode === 'history' && 'Delivery History'}
              {drawerMode === 'analytics' && 'Webhook Analytics'}
              {drawerMode === 'add' && 'Register Webhook'}
              {drawerMode === 'edit' && 'Edit Webhook'}
            </h2>
            <button onClick={closeDrawer} className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors">
              <X size={16} className="text-zinc-500" />
            </button>
          </div>

          {/* ADD FORM */}
          {drawerMode === 'add' && (
            <div className="space-y-5">
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Webhook URL</label>
                <input
                  type="text"
                  value={formUrl}
                  onChange={e => setFormUrl(e.target.value)}
                  placeholder="https://your-server.com/webhook"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-2 block">Event Types <span className="text-zinc-700">(select all that apply)</span></label>
                <div className="flex flex-wrap gap-2">
                  {EVENT_TYPES.map(et => (
                    <button
                      key={et}
                      onClick={() => toggleEventType(et)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                        formEventTypes.includes(et)
                          ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                          : 'bg-[#1a1a1a] border-[#333] text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {et}
                    </button>
                  ))}
                </div>
              </div>
              {formError && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">
                  <p className="text-xs text-red-400">{formError}</p>
                </div>
              )}
              <button
                onClick={handleAdd}
                disabled={formLoading}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {formLoading ? 'Registering...' : 'Register Webhook'}
              </button>
            </div>
          )}

          {/* EDIT FORM */}
          {drawerMode === 'edit' && (
            <div className="space-y-5">
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Webhook URL</label>
                <input
                  type="text"
                  value={formUrl}
                  onChange={e => setFormUrl(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-2 block">Event Types</label>
                <div className="flex flex-wrap gap-2">
                  {EVENT_TYPES.map(et => (
                    <button
                      key={et}
                      onClick={() => toggleEventType(et)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                        formEventTypes.includes(et)
                          ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                          : 'bg-[#1a1a1a] border-[#333] text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {et}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Status</label>
                <select
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              {formError && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">
                  <p className="text-xs text-red-400">{formError}</p>
                </div>
              )}
              <button
                onClick={handleEdit}
                disabled={formLoading}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {formLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* HISTORY */}
          {drawerMode === 'history' && (
            drawerLoading ? (
              <div className="text-center text-zinc-600 text-sm py-12">Loading...</div>
            ) : history ? (
              <>
                <div className="font-mono text-xs text-zinc-500 bg-[#1a1a1a] rounded-lg px-3 py-2 mb-6 truncate">
                  {history.webhook.url}
                </div>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                    <p className="text-xl font-semibold text-white">{history.stats.total}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">Total</p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                    <p className="text-xl font-semibold text-green-400">{history.stats.successRate}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">Success Rate</p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                    <p className="text-xl font-semibold text-indigo-400">{history.stats.avgResponseTimeMs}ms</p>
                    <p className="text-xs text-zinc-600 mt-0.5">Avg Latency</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                    <p className="text-lg font-semibold text-green-400">{history.stats.successful}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">Successful</p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                    <p className="text-lg font-semibold text-red-400">{history.stats.failed}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">Failed</p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                    <p className="text-lg font-semibold text-red-400">{history.stats.dlq}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">In DLQ</p>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 uppercase tracking-wider mb-3">Recent Attempts</p>
                <div className="space-y-2">
                  {history.attempts.map(a => (
                    <div key={a.id} className="bg-[#1a1a1a] rounded-lg p-3 flex items-center gap-3">
                      {a.status === 'SUCCESS'
                        ? <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                        : a.status === 'PENDING'
                        ? <Clock size={16} className="text-yellow-400 flex-shrink-0" />
                        : <XCircle size={16} className="text-red-400 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-white">{a.event?.eventType}</span>
                          <span className="text-xs text-zinc-600">#{a.attemptNumber}</span>
                          {a.httpStatusCode && <span className="text-xs font-mono text-zinc-500">{a.httpStatusCode}</span>}
                        </div>
                        {a.errorMessage && <p className="text-xs text-red-400 truncate mt-0.5">{a.errorMessage}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {a.responseTimeMs && <p className="text-xs text-zinc-400">{a.responseTimeMs}ms</p>}
                        <p className="text-xs text-zinc-600">{timeAgo(a.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null
          )}

          {/* ANALYTICS */}
          {drawerMode === 'analytics' && (
            drawerLoading ? (
              <div className="text-center text-zinc-600 text-sm py-12">Loading analytics...</div>
            ) : analytics ? (
              <>
                <div className="font-mono text-xs text-zinc-500 bg-[#1a1a1a] rounded-lg px-3 py-2 mb-6 truncate">
                  {analytics.webhook.url}
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-[#1a1a1a] rounded-lg p-4">
                    <p className="text-2xl font-semibold text-green-400">{analytics.stats.successRate}</p>
                    <p className="text-xs text-zinc-600 mt-1">Success Rate</p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-4">
                    <p className="text-2xl font-semibold text-indigo-400">{analytics.stats.responseTime.avg}ms</p>
                    <p className="text-xs text-zinc-600 mt-1">Avg Response</p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-4">
                    <p className="text-2xl font-semibold text-white">{analytics.stats.totalDeliveries}</p>
                    <p className="text-xs text-zinc-600 mt-1">Total Deliveries</p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-4">
                    <p className="text-2xl font-semibold text-red-400">{analytics.stats.dlqCount}</p>
                    <p className="text-xs text-zinc-600 mt-1">In DLQ</p>
                  </div>
                </div>
                <div className="bg-[#1a1a1a] rounded-lg p-4 mb-4">
                  <p className="text-xs text-zinc-600 mb-3">Response Time</p>
                  <div className="flex justify-between">
                    <div className="text-center">
                      <p className="text-sm font-medium text-white">{analytics.stats.responseTime.min}ms</p>
                      <p className="text-xs text-zinc-600">Min</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-indigo-400">{analytics.stats.responseTime.avg}ms</p>
                      <p className="text-xs text-zinc-600">Avg</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-white">{analytics.stats.responseTime.max}ms</p>
                      <p className="text-xs text-zinc-600">Max</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 uppercase tracking-wider mb-3">Recent Attempts</p>
                <div className="space-y-2">
                  {analytics.recentAttempts.map(a => (
                    <div key={a.id} className="bg-[#0a0a0a] rounded-lg p-3 flex items-center gap-3">
                      {a.status === 'SUCCESS'
                        ? <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                        : <XCircle size={14} className="text-red-400 flex-shrink-0" />}
                      <div className="flex-1">
                        <span className="text-xs text-white">{a.event?.eventType}</span>
                        <span className="text-xs text-zinc-600 ml-2">#{a.attemptNumber}</span>
                      </div>
                      <div className="text-right">
                        {a.responseTimeMs && <p className="text-xs text-zinc-400">{a.responseTimeMs}ms</p>}
                        <p className="text-xs text-zinc-600">{timeAgo(a.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 border rounded-xl px-5 py-3.5 text-sm text-white flex items-center gap-2 z-50 ${
          toastType === 'success'
            ? 'bg-[#111] border-green-500/30'
            : 'bg-[#111] border-red-500/30'
        }`}>
          <span className={toastType === 'success' ? 'text-green-400' : 'text-red-400'}>●</span>
          {toast}
        </div>
      )}
    </div>
  );
}