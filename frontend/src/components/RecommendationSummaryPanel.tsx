import type { RecommendationsSummaryResponse } from "../types";

interface RecommendationSummaryPanelProps {
  summary: RecommendationsSummaryResponse | null;
  loading?: boolean;
}

const LABEL_COLORS: Record<string, string> = {
  "Ưu tiên lựa chọn": "bg-green-100 text-green-800",
  "Đáng cân nhắc": "bg-blue-100 text-blue-800",
  "Theo dõi thêm": "bg-yellow-100 text-yellow-700",
  "Không khuyến nghị": "bg-gray-100 text-gray-600",
};

export default function RecommendationSummaryPanel({ summary, loading }: RecommendationSummaryPanelProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
    );
  }

  if (!summary || summary.total_evaluated === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <p className="text-sm text-gray-500">
          Chưa có dữ liệu gợi ý. Nhấn &quot;Cập nhật gợi ý&quot; để bắt đầu phân tích.
        </p>
      </div>
    );
  }

  const priorityCount = summary.label_counts.find(
    (lc) => lc.label === "Ưu tiên lựa chọn"
  )?.count ?? 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Tổng quan gợi ý</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary-600">{summary.total_evaluated}</div>
          <div className="text-xs text-gray-500">Tổng BĐS đánh giá</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{priorityCount}</div>
          <div className="text-xs text-gray-500">Ưu tiên lựa chọn</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-700">
            {summary.average_final_score?.toFixed(1) ?? "—"}
          </div>
          <div className="text-xs text-gray-500">Điểm trung bình</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{summary.top_suburbs.length}</div>
          <div className="text-xs text-gray-500">Khu vực phù hợp</div>
        </div>
      </div>

      {/* Label distribution */}
      <div className="flex flex-wrap gap-2 mb-4">
        {summary.label_counts.map((lc) => (
          <span
            key={lc.label}
            className={`text-xs font-medium px-2 py-1 rounded-full ${LABEL_COLORS[lc.label] || "bg-gray-100 text-gray-600"}`}
          >
            {lc.label}: {lc.count}
          </span>
        ))}
      </div>

      {/* Top suburbs */}
      {summary.top_suburbs.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Khu vực phù hợp nhất</h4>
          <div className="flex flex-wrap gap-2">
            {summary.top_suburbs.map((suburb) => (
              <span
                key={suburb}
                className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded"
              >
                📍 {suburb}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
