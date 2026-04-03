type BadgeVariant = 'success' | 'error' | 'warning' | 'accent' | 'gray';

const styles: Record<BadgeVariant, string> = {
  success: 'bg-green-500/10 text-green-400 border border-green-500/20',
  error: 'bg-red-500/10 text-red-400 border border-red-500/20',
  warning: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  accent: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  gray: 'bg-white/5 text-zinc-400 border border-white/10',
};

export function Badge({ label, variant = 'gray' }: { label: string; variant?: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}>
      {label}
    </span>
  );
}

export function statusBadge(status: string) {
  const map: Record<string, BadgeVariant> = {
    ACTIVE: 'success',
    SUSPENDED: 'error',
    INACTIVE: 'gray',
    SUCCESS: 'success',
    FAILED: 'error',
    PENDING: 'warning',
    DLQ: 'error',
  };
  return <Badge label={status} variant={map[status] || 'gray'} />;
}