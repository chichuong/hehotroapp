interface DashboardStatCardProps {
  label: string;
  value: string;
  hint?: string;
}

export default function DashboardStatCard({ label, value, hint }: DashboardStatCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div className="mt-3 text-3xl font-bold text-gray-900">{value}</div>
      {hint && <div className="mt-2 text-sm text-gray-500">{hint}</div>}
    </div>
  );
}