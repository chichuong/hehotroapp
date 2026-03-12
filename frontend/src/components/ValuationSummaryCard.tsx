import type { ValuationResponse } from "../types";
import { formatPrice } from "../utils/format";
import ValuationBadge from "./ValuationBadge";

interface ValuationSummaryCardProps {
  valuation: ValuationResponse;
}

export default function ValuationSummaryCard({
  valuation,
}: ValuationSummaryCardProps) {
  const hasValuation =
    valuation.predicted_price > 0 && valuation.valuation_label;

  if (!hasValuation) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          🤖 Định giá bằng AI
        </h3>
        <p className="text-sm text-gray-500">
          {valuation.confidence_note ||
            "Chưa có dữ liệu định giá AI cho bất động sản này."}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        🤖 Định giá bằng AI
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Giá niêm yết</span>
          <span className="text-gray-900 font-medium">
            {valuation.listed_price
              ? formatPrice(valuation.listed_price)
              : "N/A"}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Giá dự đoán</span>
          <span className="text-primary-600 font-bold">
            {formatPrice(valuation.predicted_price)}
          </span>
        </div>
        {valuation.valuation_gap != null && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Chênh lệch</span>
            <span
              className={`font-medium ${
                valuation.valuation_gap > 0
                  ? "text-green-600"
                  : valuation.valuation_gap < 0
                  ? "text-red-600"
                  : "text-gray-600"
              }`}
            >
              {valuation.valuation_gap > 0 ? "+" : ""}
              {formatPrice(Math.abs(valuation.valuation_gap))}
            </span>
          </div>
        )}
        {valuation.valuation_gap_percent != null && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Tỷ lệ chênh lệch</span>
            <span
              className={`font-medium ${
                valuation.valuation_gap_percent > 0
                  ? "text-green-600"
                  : valuation.valuation_gap_percent < 0
                  ? "text-red-600"
                  : "text-gray-600"
              }`}
            >
              {valuation.valuation_gap_percent > 0 ? "+" : ""}
              {valuation.valuation_gap_percent.toFixed(1)}%
            </span>
          </div>
        )}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">Kết luận định giá</span>
          <ValuationBadge
            label={valuation.valuation_label!}
            size="md"
          />
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400 italic">
          ⚠️ Lưu ý: Kết quả này được ước tính bằng mô hình AI từ dữ liệu lịch
          sử và chỉ mang tính tham khảo.
        </p>
      </div>
    </div>
  );
}
