import type { DSSScoreBreakdown } from "../types";

interface DSSScoreBreakdownCardProps {
  ahpScore: number | null;
  aiScore: number | null;
  fitScore: number | null;
  finalScore: number;
  recommendationLabel: string;
  explanation: string | null;
  breakdown: DSSScoreBreakdown | null;
}

function ScoreBar({ label, value, maxValue = 1, color }: {
  label: string;
  value: number | null;
  maxValue?: number;
  color: string;
}) {
  const pct = value != null ? Math.min(100, (value / maxValue) * 100) : 0;
  const available = value != null;

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">
          {available ? (maxValue === 1 ? `${(value! * 100).toFixed(1)}%` : `${value!.toFixed(1)}`) : "Không có dữ liệu"}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        {available && (
          <div
            className={`h-2.5 rounded-full ${color}`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}

const LABEL_INFO: Record<string, { color: string; icon: string }> = {
  "Ưu tiên lựa chọn": { color: "text-green-600", icon: "⭐" },
  "Đáng cân nhắc": { color: "text-blue-600", icon: "👍" },
  "Theo dõi thêm": { color: "text-yellow-600", icon: "👀" },
  "Không khuyến nghị": { color: "text-gray-500", icon: "⚠️" },
};

export default function DSSScoreBreakdownCard({
  ahpScore,
  aiScore,
  fitScore,
  finalScore,
  recommendationLabel,
  explanation,
  breakdown,
}: DSSScoreBreakdownCardProps) {
  const labelInfo = LABEL_INFO[recommendationLabel] || LABEL_INFO["Không khuyến nghị"];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        🎯 Đánh giá tổng hợp DSS
      </h3>

      {/* Final score display */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary-600">{finalScore.toFixed(1)}</div>
          <div className="text-xs text-gray-500">Điểm tổng hợp</div>
        </div>
        <div className="flex-1">
          <div className={`text-lg font-semibold ${labelInfo.color} flex items-center gap-2`}>
            <span>{labelInfo.icon}</span>
            <span>{recommendationLabel}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Khuyến nghị</div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-800 mb-3">Chi tiết điểm thành phần</h4>
        <ScoreBar label="Điểm AHP" value={ahpScore} color="bg-indigo-500" />
        <ScoreBar label="Điểm AI" value={aiScore} color="bg-purple-500" />
        <ScoreBar label="Điểm phù hợp cơ bản" value={fitScore != null ? fitScore / 100 : null} color="bg-teal-500" />
      </div>

      {/* Weight info */}
      {breakdown && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Trọng số thành phần</h4>
          <div className="flex gap-3 text-xs text-gray-600">
            <span className="bg-indigo-50 px-2 py-1 rounded">
              AHP: {(breakdown.components.ahp.weight * 100).toFixed(0)}%
            </span>
            <span className="bg-purple-50 px-2 py-1 rounded">
              AI: {(breakdown.components.ai.weight * 100).toFixed(0)}%
            </span>
            <span className="bg-teal-50 px-2 py-1 rounded">
              Phù hợp: {(breakdown.components.fit.weight * 100).toFixed(0)}%
            </span>
          </div>
          {/* Show which components were unavailable */}
          {(!breakdown.components.ahp.available || !breakdown.components.ai.available) && (
            <p className="text-xs text-gray-400 mt-2">
              {!breakdown.components.ahp.available && "⚠️ Chưa có dữ liệu AHP. "}
              {!breakdown.components.ai.available && "⚠️ Chưa có dữ liệu định giá AI. "}
              Trọng số đã được phân bổ lại cho các thành phần khả dụng.
            </p>
          )}
        </div>
      )}

      {/* Explanation */}
      {explanation && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-800 mb-1">Giải thích quyết định</h4>
          <p className="text-sm text-blue-700 leading-relaxed">💡 {explanation}</p>
        </div>
      )}
    </div>
  );
}
