interface AdminSummaryCardProps {
  label: string;
  value: string;
  description?: string;
}

export default function AdminSummaryCard({ label, value, description }: AdminSummaryCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-gray-500">{label}</div>
      <div className="mt-3 text-3xl font-bold text-gray-900">{value}</div>
      {description && <div className="mt-2 text-sm text-gray-500">{description}</div>}
    </div>
  );
}