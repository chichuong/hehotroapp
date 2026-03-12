interface SimpleBarChartItem {
  label: string;
  value: number;
  note?: string;
}

interface SimpleBarChartProps {
  title: string;
  items: SimpleBarChartItem[];
  emptyMessage: string;
  valueFormatter?: (value: number) => string;
}

export default function SimpleBarChart({
  title,
  items,
  emptyMessage,
  valueFormatter = (value) => value.toLocaleString("vi-VN"),
}: SimpleBarChartProps) {
  const max = Math.max(...items.map((item) => item.value), 0);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <div className="mt-4 space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">{emptyMessage}</p>
        ) : (
          items.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                <span className="text-sm text-gray-500">{valueFormatter(item.value)}</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-primary-500 to-cyan-500"
                  style={{ width: `${max > 0 ? (item.value / max) * 100 : 0}%` }}
                />
              </div>
              {item.note && <div className="mt-1 text-xs text-gray-500">{item.note}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}