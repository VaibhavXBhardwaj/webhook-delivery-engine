import { useState } from 'react';
import { Zap } from 'lucide-react';
import { api } from '../lib/api';

const EVENT_TYPES = [
  'payment.success',
  'payment.failed',
  'order.created',
  'order.updated',
  'order.cancelled',
  'user.created',
  'user.deleted',
  'subscription.created',
  'subscription.cancelled',
];

const DEFAULT_PAYLOAD = JSON.stringify({ amount: 1000, currency: 'INR', orderId: 'ord_123' }, null, 2);

export function Events() {
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [payload, setPayload] = useState(DEFAULT_PAYLOAD);
  const [idemKey, setIdemKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState('');

  async function fire() {
    setError('');
    let parsed;
    try { parsed = JSON.parse(payload); }
    catch { setError('Invalid JSON payload'); return; }

    setLoading(true);
    try {
      const body: any = { eventType, payload: parsed };
      if (idemKey.trim()) body.idempotencyKey = idemKey.trim();
      const res = await api.post('/events', body);
      setResponse(res);
    } catch {
      setError('Request failed. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  const deliveries = response?.data?.deliveries || [];
  const isDuplicate = response?.data?.duplicate;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Fire Event</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Send a test event to trigger webhook deliveries</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <p className="text-sm font-medium text-white mb-4">Event Details</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Event Type</label>
                <select
                  value={eventType}
                  onChange={e => setEventType(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Idempotency Key <span className="text-zinc-700">(optional)</span></label>
                <input
                  type="text"
                  value={idemKey}
                  onChange={e => setIdemKey(e.target.value)}
                  placeholder="Leave empty to skip"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Payload (JSON)</label>
                <textarea
                  value={payload}
                  onChange={e => setPayload(e.target.value)}
                  rows={8}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button
                onClick={fire}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Zap size={15} />
                {loading ? 'Firing...' : 'Fire Event'}
              </button>
            </div>
          </div>
        </div>

        <div>
          {response ? (
            <div className="bg-[#111] border border-[#222] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Response</p>
                {isDuplicate
                  ? <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">Duplicate</span>
                  : <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">Success</span>}
              </div>

              <div className="bg-[#1a1a1a] rounded-lg p-3">
                <p className="text-xs text-zinc-600 mb-1">Event ID</p>
                <p className="text-xs font-mono text-zinc-300">{response.data?.event?.id}</p>
              </div>

              <div>
                <p className="text-xs text-zinc-600 mb-2">Deliveries Queued ({deliveries.length})</p>
                {deliveries.length === 0 ? (
                  <p className="text-xs text-zinc-600">No matching webhooks found for this event type</p>
                ) : (
                  <div className="space-y-2">
                    {deliveries.map((d: any) => (
                      <div key={d.deliveryAttemptId} className="bg-[#1a1a1a] rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-400 font-mono truncate">{d.webhookId}</span>
                          <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">{d.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-zinc-600 mb-2">Raw Response</p>
                <pre className="bg-[#1a1a1a] rounded-lg p-3 text-xs text-green-400 font-mono overflow-auto max-h-48">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="bg-[#111] border border-[#222] rounded-xl p-5 h-full flex items-center justify-center">
              <div className="text-center">
                <Zap size={32} className="text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-600">Fire an event to see the response</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}