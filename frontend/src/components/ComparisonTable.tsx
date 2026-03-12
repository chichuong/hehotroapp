import type { ComparisonPropertyItem } from "../types";
import { formatPrice } from "../utils/format";

interface ComparisonTableProps {
  items: ComparisonPropertyItem[];
  onRemove: (propertyId: number) => void | Promise<void>;
}

const ROWS: Array<{
  label: string;
  render: (item: ComparisonPropertyItem) => string;
}> = [
  { label: "Giá", render: (item) => (item.price ? formatPrice(item.price) : "Chưa có") },
  { label: "Khu vực", render: (item) => item.suburb || "Chưa có" },
  { label: "Số phòng", render: (item) => (item.rooms != null ? String(item.rooms) : "Chưa có") },
  { label: "Phòng tắm", render: (item) => (item.bathrooms != null ? String(item.bathrooms) : "Chưa có") },
  { label: "Chỗ đậu xe", render: (item) => (item.cars != null ? String(item.cars) : "Chưa có") },
  { label: "Năm xây dựng", render: (item) => (item.year_built != null ? String(item.year_built) : "Chưa có") },
  { label: "Điểm AHP", render: (item) => (item.ahp_score != null ? `${(item.ahp_score * 100).toFixed(1)} / 100` : "Chưa có") },
  { label: "Định giá AI", render: (item) => (item.predicted_price != null ? `${formatPrice(item.predicted_price)} • ${item.valuation_label || "Chưa gắn nhãn"}` : "Chưa có") },
  { label: "Điểm DSS", render: (item) => (item.final_dss_score != null ? `${item.final_dss_score.toFixed(1)} / 100` : "Chưa có") },
  { label: "Khuyến nghị", render: (item) => item.recommendation_label || "Chưa có" },
];

export default function ComparisonTable({ items, onRemove }: ComparisonTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="w-44 px-4 py-4 text-left font-semibold text-gray-700">Tiêu chí</th>
            {items.map((item) => (
              <th key={item.property_id} className="min-w-[240px] border-l border-gray-200 px-4 py-4 text-left align-top">
                <img
                  src={item.primary_image || "https://placehold.co/400x260?text=B%E1%BA%A5t+%C4%91%E1%BB%99ng+s%E1%BA%A3n"}
                  alt={item.title}
                  className="mb-3 h-36 w-full rounded-xl object-cover"
                />
                <div className="space-y-2">
                  <div className="line-clamp-2 font-semibold text-gray-900">{item.title}</div>
                  <div className="text-xs text-gray-500">{item.address}</div>
                  <button
                    type="button"
                    onClick={() => onRemove(item.property_id)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    Bỏ khỏi so sánh
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.label} className="border-t border-gray-200">
              <td className="bg-slate-50 px-4 py-3 font-medium text-gray-700">{row.label}</td>
              {items.map((item) => (
                <td key={`${item.property_id}-${row.label}`} className="border-l border-gray-200 px-4 py-3 text-gray-700">
                  {row.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}