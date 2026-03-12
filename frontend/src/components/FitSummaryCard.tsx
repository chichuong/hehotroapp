import type { PropertyFitResponse } from "../types";

interface FitSummaryCardProps {
  fit: PropertyFitResponse;
}

const LABEL_COLORS: Record<string, string> = {
  "Rất phù hợp": "text-green-700 bg-green-50 border-green-200",
  "Khá phù hợp": "text-blue-700 bg-blue-50 border-blue-200",
  "Cần cân nhắc thêm": "text-yellow-700 bg-yellow-50 border-yellow-200",
  "Ít phù hợp": "text-gray-600 bg-gray-50 border-gray-200",
};

const CRITERIA_LABELS: Record<string, string> = {
  budget: "Ngân sách",
  location: "Vị trí",
  bedrooms: "Phòng ngủ",
  bathrooms: "Phòng tắm",
  parking: "Chỗ đậu xe",
  property_type: "Loại BĐS",
  year_built: "Năm xây dựng",
  family_suitability: "Phù hợp gia đình",
};

export default function FitSummaryCard({ fit }: FitSummaryCardProps) {
  const colorClass =
    LABEL_COLORS[fit.summary_label] || LABEL_COLORS["Ít phù hợp"];

  return (
    <div className={`rounded-xl border p-5 ${colorClass}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">
          Mức độ phù hợp với nhu cầu của bạn
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">
            {Math.round(fit.fit_score_basic)}%
          </span>
        </div>
      </div>

      <div className="mb-3">
        <span className="inline-block text-sm font-semibold px-3 py-1 rounded-full bg-white/60">
          {fit.summary_label}
        </span>
      </div>

      <p className="text-sm mb-4">{fit.summary_explanation}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fit.matched_criteria.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-1.5 flex items-center gap-1">
              ✅ Tiêu chí phù hợp
            </h4>
            <ul className="space-y-1">
              {fit.matched_criteria.map((c) => (
                <li key={c} className="text-sm flex items-center gap-1">
                  <span className="text-green-600">✓</span>
                  {CRITERIA_LABELS[c] || c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {fit.unmatched_criteria.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-1.5 flex items-center gap-1">
              ⚠️ Tiêu chí chưa phù hợp
            </h4>
            <ul className="space-y-1">
              {fit.unmatched_criteria.map((c) => (
                <li key={c} className="text-sm flex items-center gap-1">
                  <span className="text-orange-500">✗</span>
                  {CRITERIA_LABELS[c] || c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
