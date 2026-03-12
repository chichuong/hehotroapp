import type { PropertyExplainabilityResponse } from "../types";

interface ExplanationPanelProps {
  explainability: PropertyExplainabilityResponse;
}

function sentimentClass(sentiment: "positive" | "negative" | "neutral") {
  if (sentiment === "positive") return "bg-green-50 text-green-700 border-green-200";
  if (sentiment === "negative") return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

export default function ExplanationPanel({ explainability }: ExplanationPanelProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Vì sao bất động sản này được đánh giá như vậy?
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Điểm DSS hiện tại là <strong>{explainability.final_score.toFixed(1)}/100</strong> với mức khuyến nghị <strong>{explainability.recommendation_label}</strong>.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {explainability.score_components.map((component) => (
          <div key={component.key} className="rounded-xl border border-gray-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-gray-900">{component.label}</div>
            <div className="mt-2 text-2xl font-bold text-primary-700">
              {component.raw_score != null ? component.raw_score.toFixed(1) : "--"}
            </div>
            <div className="mt-1 text-xs text-gray-500">Trọng số: {component.weight.toFixed(0)}%</div>
            <div className="mt-1 text-xs text-gray-500">
              Điểm đóng góp: {component.weighted_score != null ? component.weighted_score.toFixed(1) : "--"}
            </div>
            {component.note && <p className="mt-3 text-xs leading-5 text-gray-600">{component.note}</p>}
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-green-100 bg-green-50 p-5">
          <h3 className="text-lg font-semibold text-green-900">Yếu tố tích cực</h3>
          <div className="mt-4 space-y-3">
            {explainability.strongest_positive_factors.length > 0 ? explainability.strongest_positive_factors.map((factor) => (
              <div key={`${factor.category}-${factor.title}`} className="rounded-lg border border-green-200 bg-white/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-green-900">{factor.title}</div>
                  {factor.impact_score != null && <div className="text-xs font-semibold text-green-700">+{factor.impact_score.toFixed(1)}</div>}
                </div>
                <p className="mt-1 text-sm text-green-800">{factor.detail}</p>
              </div>
            )) : <p className="text-sm text-green-800">Chưa có yếu tố nổi bật ở thời điểm hiện tại.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50 p-5">
          <h3 className="text-lg font-semibold text-amber-900">Yếu tố cần cân nhắc</h3>
          <div className="mt-4 space-y-3">
            {explainability.strongest_negative_factors.length > 0 ? explainability.strongest_negative_factors.map((factor) => (
              <div key={`${factor.category}-${factor.title}`} className="rounded-lg border border-amber-200 bg-white/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-amber-900">{factor.title}</div>
                  {factor.impact_score != null && <div className="text-xs font-semibold text-amber-700">{factor.impact_score.toFixed(1)}</div>}
                </div>
                <p className="mt-1 text-sm text-amber-900">{factor.detail}</p>
              </div>
            )) : <p className="text-sm text-amber-900">Hiện chưa có cảnh báo lớn từ dữ liệu đang có.</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-900">Đóng góp theo tiêu chí</h3>
        <div className="mt-4 space-y-3">
          {explainability.criteria_contributions.map((item) => (
            <div key={`${item.source}-${item.criteria_code}`} className={`rounded-xl border p-4 ${sentimentClass(item.sentiment)}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{item.criteria_name}</div>
                  <div className="mt-1 text-xs opacity-80">{item.description}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">
                    {item.contribution_score > 0 ? "+" : ""}{item.contribution_score.toFixed(1)}
                  </div>
                  <div className="text-xs opacity-80">
                    {item.weight != null ? `Trọng số ${item.weight.toFixed(0)}%` : "Theo luật hồ sơ"}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs opacity-80">
                {item.raw_value && <span>Giá trị thực tế: {item.raw_value}</span>}
                {item.normalized_value != null && <span>Chuẩn hóa: {item.normalized_value.toFixed(2)}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {explainability.ai_valuation_interpretation && (
        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-5">
          <h3 className="text-lg font-semibold text-blue-900">Diễn giải định giá AI</h3>
          <p className="mt-2 text-sm leading-6 text-blue-900">{explainability.ai_valuation_interpretation}</p>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-gray-200 bg-slate-50 p-5">
        <h3 className="text-lg font-semibold text-gray-900">Tóm tắt đánh giá</h3>
        <p className="mt-2 text-sm leading-6 text-gray-700">{explainability.final_explanation_text}</p>
      </div>
    </section>
  );
}