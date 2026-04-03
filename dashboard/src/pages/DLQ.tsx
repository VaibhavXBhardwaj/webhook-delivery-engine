import { useEffect, useState } from 'react';
import { RefreshCw, RotateCcw, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { Badge } from '../components/Badge';

interface DLQItem {
  id: string;
  lastError: string | null;
  totalAttempts: number;
  movedAt: string;
  event: { id: string; eventType: string; createdAt: string };
  webhook: { id: string; url: string; status: string };
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function DLQ() {
  const [items, setItems] = useState<DLQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/dlq');
      setItems(res.data || []);
    } finally {
      setLoading(false);
    }
  }

  async function retry(id: string) {
    setRetrying(id);
    try {
      await api.post(`/dlq/${id}/retry`);
      setToast('Retry queued successfully');
      setTimeout(() => setToast(''), 3000);
      load();
    } catch {
      setToast('Retry failed');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setRetrying(null);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">Dead Letter Queue</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Events that failed all delivery attempts</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#222] rounded-lg text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {items.length > 0 && (
        <div className="flex items-center gap-3 bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-6">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">
            {items.length} event{items.length > 1 ? 's' : ''} failed all delivery attempts and need attention
          </p>
        </div>
      )}

      <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-600 text-sm">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-green-400 text-lg">✓</span>
            </div>
            <p className="text-sm text-zinc-500">Dead Letter Queue is empty</p>
            <p className="text-xs text-zinc-700 mt-1">All events delivered successfully</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#222]">
                {['Event Type', 'Webhook URL', 'Last Error', 'Attempts', 'Failed', 'Action'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs text-zinc-600 uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} className={`border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors ${i === items.length - 1 ? 'border-0' : ''}`}>
                  <td className="px-5 py-4">
                    <Badge label={item.event.eventType} variant="accent" />
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-zinc-300 font-mono truncate block max-w-[160px]" title={item.webhook.url}>
                      {item.webhook.url}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs text-red-400 truncate block max-w-[180px]" title={item.lastError || ''}>
                      {item.lastError || '-'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-yellow-400 font-medium">{item.totalAttempts}</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-zinc-500">{timeAgo(item.movedAt)}</td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => retry(item.id)}
                      disabled={retrying === item.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw size={12} className={retrying === item.id ? 'animate-spin' : ''} />
                      Retry
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#111] border border-[#222] rounded-xl px-5 py-3.5 text-sm text-white flex items-center gap-2 shadow-2xl">
          <span className="text-green-400">●</span>
          {toast}
        </div>
      )}
    </div>
  );
}