import { LayoutDashboard, Webhook, Zap, AlertTriangle, LogOut } from 'lucide-react';
import { clearKey } from '../lib/api';

type Page = 'overview' | 'webhooks' | 'events' | 'dlq';

interface SidebarProps {
  current: Page;
  onChange: (page: Page) => void;
}

const links = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'events', label: 'Fire Event', icon: Zap },
  { id: 'dlq', label: 'Dead Letter Queue', icon: AlertTriangle },
] as const;

export function Sidebar({ current, onChange }: SidebarProps) {
  function logout() {
    clearKey();
    window.location.reload();
  }

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-56 bg-[#111] border-r border-[#222] flex flex-col">
      <div className="px-5 py-6 border-b border-[#222]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">WebhookEngine</p>
            <p className="text-xs text-zinc-600">Delivery System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id as Page)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              current === id
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
            }`}
          >
            <Icon size={16} />
            {label}
            {id === 'dlq' && current !== 'dlq' && (
              <span className="ml-auto w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-[#222]">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-600 hover:text-red-400 hover:bg-red-500/5 transition-all"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}