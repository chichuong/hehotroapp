import { useState, useEffect } from "react";
import { dssApi } from "../api/dss";
import type { PropertyAHPScoreResponse } from "../types";
import LoadingSpinner from "./LoadingSpinner";

const LABEL_COLORS: Record<string, string> = {
  "Ưu tiên xem": "text-green-700 bg-green-50 border-green-200",
  "Đáng cân nhắc": "text-blue-700 bg-blue-50 border-blue-200",
  "Theo dõi thêm": "text-yellow-700 bg-yellow-50 border-yellow-200",
  "Không phù hợp": "text-gray-600 bg-gray-50 border-gray-200",
};

interface AHPScoreSectionProps {
  propertyId: number;
}

export default function AHPScoreSection({ propertyId }: AHPScoreSectionProps) {
  const [data, setData] = useState<PropertyAHPScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    dssApi
      .getPropertyAHPScore(propertyId)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) return <LoadingSpinner />;
  if (error || !data) return null; // Silently hide if no AHP matrix configured

  const colorClass =
    LABEL_COLORS[data.summary_label] || LABEL_COLORS["Không phù hợp"];

  return (
    <div className={`rounded-xl border p-5 ${colorClass}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">
          Điểm đánh giá theo tiêu chí cá nhân (AHP)
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">
            {(data.score * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="mb-4">
        <span className="inline-block text-sm font-semibold px-3 py-1 rounded-full bg-white/60">
          {data.summary_label}
        </span>
      </div>

      {/* Criteria Breakdown */}
      {data.criteria_breakdown.length > 0 && (
        <div className="space-y-2 mb-4">
          <h4 className="text-sm font-semibold">Chi tiết từng tiêu chí</h4>
          {data.criteria_breakdown
            .sort((a, b) => b.contribution - a.contribution)
            .map((item) => (
              <div key={item.criteria_code} className="flex items-center gap-2">
                <span className="w-28 text-xs font-medium flex-shrink-0">
                  {item.criteria_name}
                </span>
                <div className="flex-1 bg-white/40 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-current opacity-40 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(item.normalized_value * 100, 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs w-20 text-right flex-shrink-0">
                  {(item.contribution * 100).toFixed(1)}% (w:{" "}
                  {(item.weight * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Weights Used */}
      {data.weights_used.length > 0 && (
        <div className="pt-3 border-t border-current/10">
          <h4 className="text-xs font-semibold mb-2 opacity-70">
            Trọng số đã sử dụng
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.weights_used
              .sort((a, b) => b.weight - a.weight)
              .map((w) => (
                <span
                  key={w.criteria_id}
                  className="text-xs bg-white/40 px-2 py-1 rounded"
                >
                  {w.criteria_name}: {(w.weight * 100).toFixed(1)}%
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
