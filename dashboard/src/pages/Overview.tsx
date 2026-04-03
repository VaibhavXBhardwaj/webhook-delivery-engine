import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { StatCard } from '../components/StatCard';

interface OverviewData {
  totalWebhooks: number;
  activeWebhooks: number;
  suspendedWebhooks: number;
  totalEvents: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  pendingDeliveries: number;
  dlqCount: number;
  successRate: string;
  avgResponseTimeMs: number;
  last24Hours: {
    events: number;
    deliveries: number;
    successRate: string;
  };
}

export function Overview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/analytics/overview');
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const sr = data ? parseFloat(data.successRate) : 0;
  const srColor = sr >= 80 ? 'text-green-400' : sr < 50 ? 'text-red-400' : 'text-yellow-400';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">Overview</h1>
          <p className="text-sm text-zinc-500 mt-0.5">System health and delivery analytics</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#222] rounded-lg text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#111] border border-[#222] rounded-xl p-5 h-28 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <StatCard
              label="Total Webhooks"
              value={data.totalWebhooks}
              sub={`${data.activeWebhooks} active · ${data.suspendedWebhooks} suspended`}
              valueColor="text-indigo-400"
            />
            <StatCard
              label="Success Rate"
              value={data.successRate}
              sub={`${data.successfulDeliveries} of ${data.totalDeliveries} deliveries`}
              valueColor={srColor}
            />
            <StatCard
              label="Avg Response Time"
              value={`${data.avgResponseTimeMs}ms`}
              sub="across successful deliveries"
              valueColor="text-indigo-400"
            />
            <StatCard
              label="Dead Letter Queue"
              value={data.dlqCount}
              sub={data.dlqCount > 0 ? 'needs attention' : 'all clear'}
              valueColor={data.dlqCount > 0 ? 'text-red-400' : 'text-green-400'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-[#111] border border-[#222] rounded-xl p-5">
              <p className="text-sm font-medium text-white mb-4">Last 24 Hours</p>
              <div className="space-y-3">
                {[
                  { label: 'Events fired', value: data.last24Hours.events },
                  { label: 'Deliveries attempted', value: data.last24Hours.deliveries },
                  { label: 'Success rate', value: data.last24Hours.successRate },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-0">
                    <span className="text-sm text-zinc-500">{label}</span>
                    <span className="text-sm text-white font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#111] border border-[#222] rounded-xl p-5">
              <p className="text-sm font-medium text-white mb-4">Delivery Breakdown</p>
              <div className="space-y-3">
                {[
                  { label: 'Successful', value: data.successfulDeliveries, color: 'text-green-400' },
                  { label: 'Failed', value: data.failedDeliveries, color: 'text-red-400' },
                  { label: 'Pending', value: data.pendingDeliveries, color: 'text-yellow-400' },
                  { label: 'In DLQ', value: data.dlqCount, color: 'text-red-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-0">
                    <span className="text-sm text-zinc-500">{label}</span>
                    <span className={`text-sm font-medium ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <p className="text-sm font-medium text-white mb-4">All Time Stats</p>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Total Events', value: data.totalEvents },
                { label: 'Total Deliveries', value: data.totalDeliveries },
                { label: 'Active Webhooks', value: data.activeWebhooks },
                { label: 'Suspended', value: data.suspendedWebhooks },
              ].map(({ label, value }) => (
                <div key={label} className="text-center p-4 bg-[#1a1a1a] rounded-lg">
                  <p className="text-2xl font-semibold text-white">{value}</p>
                  <p className="text-xs text-zinc-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}