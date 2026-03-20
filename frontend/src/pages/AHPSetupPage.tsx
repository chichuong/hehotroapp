import { useEffect, useMemo, useState } from "react";
import { dssApi } from "../api/dss";
import type {
  DSSCriteria,
  AHPMatrixEntry,
  AHPWeightsResponse,
  AHPConsistencyResponse,
  AHPAlternativesResponse,
} from "../types";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

const AHP_CRITERIA_CODES = ["price", "distance", "rooms", "bedrooms", "year_built"] as const;
const AHP_CODE_ORDER: Record<string, number> = {
  price: 0,
  distance: 1,
  rooms: 2,
  bedrooms: 3,
  year_built: 4,
};
const AHP_SET = new Set<string>(AHP_CRITERIA_CODES);
const MIN_SAATY = 1;
const MAX_SAATY = 9;

function clampSaatyInt(value: number): number {
  if (!Number.isFinite(value)) return MIN_SAATY;
  const rounded = Math.round(value);
  return Math.min(MAX_SAATY, Math.max(MIN_SAATY, rounded));
}

function formatReciprocal(val: number): string {
  if (!Number.isFinite(val) || val <= 0) return "0";
  if (Math.abs(val - 1) < 1e-9) return "1";
  if (val > 1) return String(Math.round(val));
  const inv = Math.round(1 / val);
  if (inv >= MIN_SAATY && inv <= MAX_SAATY) return `1/${inv}`;
  return val.toFixed(3);
}

function createIdentityMatrix(size: number): number[][] {
  return Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => (i === j ? 1 : 1))
  );
}

export default function AHPSetupPage() {
  const [criteria, setCriteria] = useState<DSSCriteria[]>([]);
  const [matrixValues, setMatrixValues] = useState<number[][]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [weightsData, setWeightsData] = useState<AHPWeightsResponse | null>(null);
  const [consistencyData, setConsistencyData] = useState<AHPConsistencyResponse | null>(null);
  const [alternativesData, setAlternativesData] = useState<AHPAlternativesResponse | null>(null);
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const allCriteria = await dssApi.getCriteria();
        const fixedCriteria = allCriteria
          .filter((c) => AHP_SET.has(c.code))
          .sort(
            (a, b) =>
              (AHP_CODE_ORDER[a.code] ?? Number.MAX_SAFE_INTEGER) -
              (AHP_CODE_ORDER[b.code] ?? Number.MAX_SAFE_INTEGER)
          );

        if (fixedCriteria.length !== AHP_CRITERIA_CODES.length) {
          setError("Hệ thống chưa sẵn sàng đủ 5 tiêu chí AHP cố định. Vui lòng thử lại sau.");
          setLoading(false);
          return;
        }

        setCriteria(fixedCriteria);
        const n = fixedCriteria.length;
        const matrix = createIdentityMatrix(n);

        try {
          const existing = await dssApi.getAHPMatrix();
          if (existing && existing.entries.length > 0) {
            setHasExisting(true);
            const idToIndex = new Map<number, number>(
              fixedCriteria.map((item, index) => [item.id, index])
            );

            for (const e of existing.entries) {
              const ri = idToIndex.get(e.criteria_id_row);
              const ci = idToIndex.get(e.criteria_id_col);
              if (ri === undefined || ci === undefined || ri === ci) continue;
              const value = clampSaatyInt(e.value);
              if (ri < ci) {
                matrix[ri][ci] = value;
                matrix[ci][ri] = 1 / value;
              } else {
                matrix[ci][ri] = value;
                matrix[ri][ci] = 1 / value;
              }
            }

            try {
              const [weights, consistency] = await Promise.all([
                dssApi.getAHPWeights(),
                dssApi.getAHPConsistency(),
              ]);
              setWeightsData(weights);
              setConsistencyData(consistency);
            } catch {}
          }
        } catch {}

        setMatrixValues(matrix);
      } catch {
        setError("Không thể tải danh sách tiêu chí.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const n = criteria.length;

  const handleUpperCellChange = (rowIndex: number, colIndex: number, value: number) => {
    if (rowIndex >= colIndex) return;
    const nextValue = clampSaatyInt(value);
    setMatrixValues((prev) => {
      const next = prev.map((row) => [...row]);
      next[rowIndex][colIndex] = nextValue;
      next[colIndex][rowIndex] = 1 / nextValue;
      next[rowIndex][rowIndex] = 1;
      next[colIndex][colIndex] = 1;
      return next;
    });

    setWeightsData(null);
    setConsistencyData(null);
    setAlternativesData(null);
    setSuccess(null);
  };

  const matrixEntries = useMemo((): AHPMatrixEntry[] => {
    if (n !== 5 || matrixValues.length !== n) return [];

    const entries: AHPMatrixEntry[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        entries.push({
          criteria_id_row: criteria[i].id,
          criteria_id_col: criteria[j].id,
          value: clampSaatyInt(matrixValues[i][j]),
        });
      }
    }
    return entries;
  }, [criteria, matrixValues, n]);

  const handleSave = async () => {
    if (matrixEntries.length !== 10) {
      setError("Ma trận so sánh chưa đầy đủ cho 5 tiêu chí cố định.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (hasExisting) {
        await dssApi.updateAHPMatrix(matrixEntries);
      } else {
        await dssApi.saveAHPMatrix(matrixEntries);
        setHasExisting(true);
      }

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

  const handleSuggestProperties = async () => {
    setSuggesting(true);
    setError(null);

    try {
      const data = await dssApi.getTop5Recommendations();
      setAlternativesData(data);
    } catch {
      setError("Không thể gợi ý bất động sản. Vui lòng lưu ma trận và thử lại.");
    } finally {
      setSuggesting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Thiết lập AHP theo ma trận so sánh cặp
      </h1>
      <p className="text-gray-600 mb-8">
        Nhập trực tiếp giá trị so sánh trong ma trận 5x5. Đường chéo chính luôn bằng 1,
        phần tam giác dưới sẽ tự động điền nghịch đảo.
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
            Mức độ nhất quán chưa tốt. Bạn nên điều chỉnh lại một số giá trị.
            {" "}(CR = {(consistencyData.cr * 100).toFixed(1)}%)
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Ma trận so sánh cặp
        </h2>
        <p className="text-sm text-gray-500 mb-2">
          Chỉ nhập ô phía trên đường chéo chính, giá trị là số nguyên từ 1 đến 9.
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr>
                <th className="px-3 py-2 bg-gray-50 text-left font-medium text-gray-700"></th>
                {criteria.map((item) => (
                  <th key={item.id} className="px-3 py-2 bg-gray-50 text-center font-medium text-gray-700 whitespace-nowrap">
                    {item.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {criteria.map((rowItem, rowIndex) => (
                <tr key={rowItem.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 bg-gray-50 font-medium text-gray-700 whitespace-nowrap">
                    {rowItem.name}
                  </td>
                  {criteria.map((colItem, colIndex) => {
                    if (!matrixValues[rowIndex]) {
                      return <td key={colItem.id} className="px-2 py-2 text-center">-</td>;
                    }

                    if (rowIndex === colIndex) {
                      return (
                        <td key={colItem.id} className="px-2 py-2 text-center bg-gray-100 font-medium text-gray-700">
                          1
                        </td>
                      );
                    }

                    if (rowIndex < colIndex) {
                      return (
                        <td key={colItem.id} className="px-2 py-2 text-center bg-primary-50">
                          <input
                            type="number"
                            min={MIN_SAATY}
                            max={MAX_SAATY}
                            step={1}
                            value={clampSaatyInt(matrixValues[rowIndex][colIndex])}
                            onChange={(e) => handleUpperCellChange(rowIndex, colIndex, Number(e.target.value))}
                            onBlur={(e) => handleUpperCellChange(rowIndex, colIndex, Number(e.target.value))}
                            className="w-20 border border-gray-300 rounded-md px-2 py-1 text-center focus:ring-primary-500 focus:border-primary-500"
                          />
                        </td>
                      );
                    }

                    return (
                      <td key={colItem.id} className="px-2 py-2 text-center bg-indigo-50 text-indigo-700 font-medium">
                        {formatReciprocal(matrixValues[rowIndex][colIndex])}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          1 = ngang nhau, 3 = hơi quan trọng hơn, 5 = quan trọng hơn, 7 = rất quan trọng, 9 = cực kỳ quan trọng.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleSave}
            disabled={saving || matrixEntries.length !== 10}
            className="bg-primary-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "Lưu ma trận so sánh"}
          </button>
          <button
            onClick={handleSuggestProperties}
            disabled={suggesting || saving}
            className="bg-emerald-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {suggesting ? "Đang gợi ý..." : "Gợi ý bất động sản"}
          </button>
        </div>
      </div>

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
                  <span className="w-36 text-sm font-medium text-gray-700 flex-shrink-0">
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
                </div>
              ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-xs text-gray-500">λ max</p>
              <p className="font-medium text-gray-900">{weightsData.lambda_max.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">CI</p>
              <p className="font-medium text-gray-900">{weightsData.ci.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">CR</p>
              <p className={`font-medium ${weightsData.is_consistent ? "text-green-700" : "text-amber-700"}`}>
                {(weightsData.cr * 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Nhất quán</p>
              <p className={`font-medium ${weightsData.is_consistent ? "text-green-700" : "text-amber-700"}`}>
                {weightsData.is_consistent ? "Đạt" : "Chưa đạt"}
              </p>
            </div>
          </div>
        </div>
      )}

      {alternativesData && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Top 5 phương án phù hợp
            </h2>
            {alternativesData.alternatives.length === 0 && (
              <p className="text-sm text-gray-600">Không có bất động sản phù hợp với dữ liệu hiện tại.</p>
            )}
            <div className="space-y-3">
              {alternativesData.alternatives.map((item) => (
                <div key={item.property_id} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-500">ID: {item.property_id} · {item.address}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 overflow-x-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Ma trận phương án
            </h2>
            <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left bg-gray-50 font-medium text-gray-700">Bất động sản</th>
                  {alternativesData.criteria.map((c) => (
                    <th key={c.code} className="px-3 py-2 text-center bg-gray-50 font-medium text-gray-700 whitespace-nowrap">
                      {c.name}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center bg-gray-50 font-medium text-gray-700">Điểm AHP</th>
                </tr>
              </thead>
              <tbody>
                {alternativesData.alternative_matrix.map((row) => (
                  <tr key={row.property_id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-800">
                      {row.title}
                      <div className="text-xs text-gray-500">ID: {row.property_id}</div>
                    </td>
                    {alternativesData.criteria.map((c) => (
                      <td key={`${row.property_id}-${c.code}`} className="px-3 py-2 text-center text-gray-700">
                        {((row.values[c.code] ?? 0) * 100).toFixed(1)}%
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-medium text-primary-700">
                      {(row.ahp_score * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Kết quả xếp hạng bất động sản
            </h2>
            <ol className="space-y-2">
              {alternativesData.ranking.map((row) => (
                <li key={`ranking-${row.property_id}`} className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
                  <span className="font-medium text-gray-800">{row.rank}. {row.title}</span>
                  <span className="text-sm font-semibold text-primary-700">{(row.ahp_score * 100).toFixed(2)}%</span>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">
          Tổng kết ngắn gọn
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Bộ tiêu chí đã cố định gồm: Giá, Khoảng cách, Số phòng, Số phòng ngủ, Năm xây dựng</li>
          <li>• Chỉ nhập tam giác trên, hệ thống tự suy ra nghịch đảo ở tam giác dưới</li>
          <li>• Nếu CR lớn hơn 10%, hệ thống sẽ cảnh báo để bạn điều chỉnh ma trận</li>
        </ul>
      </div>
    </div>
  );
}
