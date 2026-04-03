interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  valueColor?: string;
}

export function StatCard({ label, value, sub, valueColor = 'text-white' }: StatCardProps) {
  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-5">
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-3xl font-semibold ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}