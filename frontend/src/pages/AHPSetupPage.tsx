import { useState, useEffect, useCallback } from "react";
import { dssApi } from "../api/dss";
import type {
  DSSCriteria,
  AHPMatrixEntry,
  AHPWeightsResponse,
  AHPConsistencyResponse,
} from "../types";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

// AHP scale options for pairwise comparisons
const SCALE_OPTIONS = [
  { value: 9, label: "Trái quan trọng hơn rất nhiều", shortLabel: "9" },
  { value: 7, label: "Trái quan trọng hơn nhiều", shortLabel: "7" },
  { value: 5, label: "Trái quan trọng hơn", shortLabel: "5" },
  { value: 3, label: "Trái hơi quan trọng hơn", shortLabel: "3" },
  { value: 1, label: "Hai tiêu chí ngang nhau", shortLabel: "1" },
  { value: 1 / 3, label: "Phải hơi quan trọng hơn", shortLabel: "1/3" },
  { value: 1 / 5, label: "Phải quan trọng hơn", shortLabel: "1/5" },
  { value: 1 / 7, label: "Phải quan trọng hơn nhiều", shortLabel: "1/7" },
  { value: 1 / 9, label: "Phải quan trọng hơn rất nhiều", shortLabel: "1/9" },
];

// Only use criteria that have actual data to score
const SCORABLE_CODES = new Set([
  "price",
  "area",
  "bedrooms",
  "bathrooms",
  "parking",
  "year_built",
]);

interface PairComparison {
  rowId: number;
  colId: number;
  rowName: string;
  colName: string;
  value: number;
}

export default function AHPSetupPage() {
  const [criteria, setCriteria] = useState<DSSCriteria[]>([]);
  const [pairs, setPairs] = useState<PairComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [weightsData, setWeightsData] = useState<AHPWeightsResponse | null>(null);
  const [consistencyData, setConsistencyData] = useState<AHPConsistencyResponse | null>(null);
  const [showMatrix, setShowMatrix] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  // Load criteria and existing matrix
  useEffect(() => {
    const loadData = async () => {
      try {
        const allCriteria = await dssApi.getCriteria();
        const scorable = allCriteria.filter((c) => SCORABLE_CODES.has(c.code));
        setCriteria(scorable);

        // Generate all unique pairs (upper triangle)
        const initialPairs: PairComparison[] = [];
        for (let i = 0; i < scorable.length; i++) {
          for (let j = i + 1; j < scorable.length; j++) {
            initialPairs.push({
              rowId: scorable[i].id,
              colId: scorable[j].id,
              rowName: scorable[i].name,
              colName: scorable[j].name,
              value: 1, // default: equal importance
            });
          }
        }

        // Try loading existing matrix
        try {
          const existing = await dssApi.getAHPMatrix();
          if (existing && existing.entries.length > 0) {
            setHasExisting(true);
            // Merge existing values into pairs
            const entryMap = new Map<string, number>();
            for (const e of existing.entries) {
              entryMap.set(`${e.criteria_id_row}-${e.criteria_id_col}`, e.value);
            }
            for (const pair of initialPairs) {
              const key = `${pair.rowId}-${pair.colId}`;
              const reverseKey = `${pair.colId}-${pair.rowId}`;
              if (entryMap.has(key)) {
                pair.value = entryMap.get(key)!;
              } else if (entryMap.has(reverseKey)) {
                const reverseVal = entryMap.get(reverseKey)!;
                pair.value = reverseVal !== 0 ? 1 / reverseVal : 1;
              }
            }
            // Load weights and consistency
            try {
              const [weights, consistency] = await Promise.all([
                dssApi.getAHPWeights(),
                dssApi.getAHPConsistency(),
              ]);
              setWeightsData(weights);
              setConsistencyData(consistency);
            } catch {
              // Weights not available yet
            }
          }
        } catch {
          // No existing matrix — that's fine
        }

        setPairs(initialPairs);
      } catch {
        setError("Không thể tải danh sách tiêu chí.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handlePairChange = useCallback((index: number, value: number) => {
    setPairs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], value };
      return updated;
    });
    // Clear previous results when user changes comparisons
    setWeightsData(null);
    setConsistencyData(null);
    setSuccess(null);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const entries: AHPMatrixEntry[] = pairs.map((p) => ({
        criteria_id_row: p.rowId,
        criteria_id_col: p.colId,
        value: p.value,
      }));

      if (hasExisting) {
        await dssApi.updateAHPMatrix(entries);
      } else {
        await dssApi.saveAHPMatrix(entries);
        setHasExisting(true);
      }

      // Load weights and consistency
      const [weights, consistency] = await Promise.all([
        dssApi.getAHPWeights(),
        dssApi.getAHPConsistency(),
      ]);
      setWeightsData(weights);
      setConsistencyData(consistency);
      setSuccess("Đã lưu ma trận so sánh thành công!");
    } catch {
      setError("Không thể lưu ma trận so sánh. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  // Build full matrix for visualization
  const buildFullMatrix = (): number[][] => {
    const n = criteria.length;
    const matrix: number[][] = Array.from({ length: n }, () =>
      Array(n).fill(1)
    );
    const idToIdx = new Map(criteria.map((c, i) => [c.id, i]));

    for (const pair of pairs) {
      const ri = idToIdx.get(pair.rowId);
      const ci = idToIdx.get(pair.colId);
      if (ri !== undefined && ci !== undefined) {
        matrix[ri][ci] = pair.value;
        matrix[ci][ri] = pair.value !== 0 ? 1 / pair.value : 0;
      }
    }
    return matrix;
  };

  const findClosestScale = (value: number): number => {
    let closest = SCALE_OPTIONS[0].value;
    let minDiff = Math.abs(value - closest);
    for (const opt of SCALE_OPTIONS) {
      const diff = Math.abs(value - opt.value);
      if (diff < minDiff) {
        minDiff = diff;
        closest = opt.value;
      }
    }
    return closest;
  };

  const formatFraction = (val: number): string => {
    if (val >= 1) return String(Math.round(val));
    const inv = Math.round(1 / val);
    return `1/${inv}`;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Thiết lập mức độ ưu tiên tiêu chí (AHP)
      </h1>
      <p className="text-gray-600 mb-8">
        AHP giúp hệ thống hiểu mức độ quan trọng tương đối giữa các tiêu chí
        khi lựa chọn bất động sản. Hãy so sánh từng cặp tiêu chí bên dưới.
      </p>

      {error && <ErrorMessage message={error} />}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm">
          {success}
        </div>
      )}

      {/* Consistency Warning */}
      {consistencyData && !consistencyData.is_consistent && (
        <div className="mb-6 bg-amber-50 border border-amber-300 rounded-lg p-4">
          <p className="text-amber-800 font-medium">⚠️ Cảnh báo nhất quán</p>
          <p className="text-amber-700 text-sm mt-1">
            Mức độ nhất quán của các so sánh tiêu chí chưa tốt (CR ={" "}
            {(consistencyData.cr * 100).toFixed(1)}%). Bạn nên điều chỉnh lại
            một số lựa chọn để kết quả đáng tin cậy hơn.
          </p>
        </div>
      )}

      {consistencyData && consistencyData.is_consistent && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">✅ Ma trận nhất quán</p>
          <p className="text-green-700 text-sm mt-1">
            {consistencyData.message} (CR = {(consistencyData.cr * 100).toFixed(1)}%)
          </p>
        </div>
      )}

      {/* Pairwise Comparison UI */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          So sánh cặp tiêu chí
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Tiêu chí nào quan trọng hơn đối với bạn? Kéo thanh trượt về phía tiêu
          chí bạn cho là quan trọng hơn.
        </p>

        <div className="space-y-6">
          {pairs.map((pair, idx) => (
            <div key={`${pair.rowId}-${pair.colId}`} className="border-b border-gray-100 pb-5 last:border-0 last:pb-0">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-primary-700 text-sm">
                  {pair.rowName}
                </span>
                <span className="text-xs text-gray-400">
                  {formatFraction(pair.value)}
                </span>
                <span className="font-medium text-indigo-700 text-sm">
                  {pair.colName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-6 text-right">9</span>
                <input
                  type="range"
                  min={0}
                  max={SCALE_OPTIONS.length - 1}
                  step={1}
                  value={SCALE_OPTIONS.findIndex(
                    (o) => Math.abs(o.value - findClosestScale(pair.value)) < 0.01
                  )}
                  onChange={(e) => {
                    const scaleIdx = parseInt(e.target.value);
                    handlePairChange(idx, SCALE_OPTIONS[scaleIdx].value);
                  }}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <span className="text-xs text-gray-400 w-6">1/9</span>
              </div>
              <p className="text-xs text-gray-500 text-center mt-1">
                {
                  SCALE_OPTIONS[
                    SCALE_OPTIONS.findIndex(
                      (o) =>
                        Math.abs(o.value - findClosestScale(pair.value)) < 0.01
                    )
                  ]?.label
                }
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-primary-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : hasExisting ? "Cập nhật ma trận" : "Lưu ma trận so sánh"}
          </button>
          <button
            onClick={() => setShowMatrix(!showMatrix)}
            className="bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            {showMatrix ? "Ẩn ma trận" : "Xem ma trận"}
          </button>
        </div>
      </div>

      {/* Matrix Visualization */}
      {showMatrix && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 overflow-x-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Ma trận so sánh cặp
          </h2>
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left bg-gray-50 rounded-tl-lg"></th>
                {criteria.map((c) => (
                  <th key={c.id} className="px-3 py-2 text-center bg-gray-50 font-medium text-gray-700">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {buildFullMatrix().map((row, ri) => (
                <tr key={criteria[ri].id} className="border-t border-gray-100">
                  <td className="px-3 py-2 bg-gray-50 font-medium text-gray-700">
                    {criteria[ri].name}
                  </td>
                  {row.map((val, ci) => (
                    <td
                      key={ci}
                      className={`px-3 py-2 text-center ${
                        ri === ci
                          ? "bg-gray-100 font-medium"
                          : val > 1
                          ? "text-primary-700 bg-primary-50"
                          : val < 1
                          ? "text-indigo-700 bg-indigo-50"
                          : ""
                      }`}
                    >
                      {formatFraction(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Criteria Weights Display */}
      {weightsData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Trọng số tiêu chí
          </h2>
          <div className="space-y-3">
            {weightsData.weights
              .sort((a, b) => b.weight - a.weight)
              .map((w) => (
                <div key={w.criteria_id} className="flex items-center gap-3">
                  <span className="w-32 text-sm font-medium text-gray-700 flex-shrink-0">
                    {w.criteria_name}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-primary-500 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(w.weight * 100, 5)}%` }}
                    >
                      {w.weight >= 0.08 && (
                        <span className="text-xs font-medium text-white">
                          {(w.weight * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  {w.weight < 0.08 && (
                    <span className="text-xs text-gray-500 w-14 text-right">
                      {(w.weight * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              ))}
          </div>

          {/* Consistency info */}
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-xs text-gray-500">λ max</p>
              <p className="font-medium text-gray-900">
                {weightsData.lambda_max.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">CI</p>
              <p className="font-medium text-gray-900">
                {weightsData.ci.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">CR</p>
              <p
                className={`font-medium ${
                  weightsData.is_consistent
                    ? "text-green-700"
                    : "text-amber-700"
                }`}
              >
                {(weightsData.cr * 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Nhất quán</p>
              <p
                className={`font-medium ${
                  weightsData.is_consistent
                    ? "text-green-700"
                    : "text-amber-700"
                }`}
              >
                {weightsData.is_consistent ? "✅ Đạt" : "⚠️ Chưa đạt"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">
          Hướng dẫn sử dụng AHP
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>
            • So sánh từng cặp tiêu chí: kéo thanh trượt về phía tiêu chí bạn
            cho là quan trọng hơn
          </li>
          <li>
            • Giá trị 1 = hai tiêu chí ngang nhau; 9 = tiêu chí đó quan trọng
            hơn rất nhiều
          </li>
          <li>
            • Hệ thống sẽ tính toán trọng số và kiểm tra mức độ nhất quán
          </li>
          <li>
            • Tỉ lệ nhất quán (CR) nên dưới 10% để kết quả đáng tin cậy
          </li>
          <li>
            • Sau khi lưu, hãy xem trang{" "}
            <a
              href="/dss/ranking"
              className="underline hover:text-blue-900"
            >
              Gợi ý bất động sản
            </a>{" "}
            để xem kết quả xếp hạng
          </li>
        </ul>
      </div>
    </div>
  );
}
