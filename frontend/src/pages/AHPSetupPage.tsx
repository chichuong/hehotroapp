import { useState, useEffect, useCallback } from "react";
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

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

/** The 5 fixed AHP criteria codes used throughout the system */
const AHP_CRITERIA_CODES = ["price", "distance", "rooms", "bedrooms", "year_built"];

/** Vietnamese display names for each criteria code */
const CRITERIA_DISPLAY_NAMES: Record<string, string> = {
  price: "Giá",
  distance: "Khoảng cách",
  rooms: "Số phòng",
  bedrooms: "Số phòng ngủ",
  year_built: "Năm xây dựng",
};

/** Saaty scale description */
const SAATY_DESCRIPTIONS: Record<number, string> = {
  1: "Quan trọng ngang nhau",
  2: "Quan trọng hơn một chút",
  3: "Quan trọng hơn vừa phải",
  4: "Quan trọng hơn nhiều hơn vừa phải",
  5: "Quan trọng hơn nhiều",
  6: "Quan trọng hơn nhiều, tiến tới rất quan trọng",
  7: "Rất quan trọng hơn",
  8: "Gần như tuyệt đối quan trọng hơn",
  9: "Tuyệt đối quan trọng hơn",
};

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

interface PairComparison {
  rowId: number;
  colId: number;
  rowCode: string;
  colCode: string;
  rowName: string;
  colName: string;
  value: number; // integer 1-9, where >1 means row is more important
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const formatPrice = (p: number | null) => {
  if (p == null) return "—";
  if (p >= 1_000_000) return `$${(p / 1_000_000).toFixed(2)}M`;
  if (p >= 1_000) return `$${(p / 1_000).toFixed(0)}K`;
  return `$${p}`;
};

const normalizedToBar = (v: number) => {
  const pct = Math.round(v * 100);
  const color =
    pct >= 70
      ? "#22c55e"
      : pct >= 45
      ? "#f59e0b"
      : "#ef4444";
  return { pct, color };
};

const RANK_MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
const RANK_COLORS = [
  "linear-gradient(135deg,#fbbf24,#f59e0b)",
  "linear-gradient(135deg,#9ca3af,#6b7280)",
  "linear-gradient(135deg,#cd7c3a,#a85b2a)",
  "linear-gradient(135deg,#6366f1,#4f46e5)",
  "linear-gradient(135deg,#06b6d4,#0891b2)",
];

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export default function AHPSetupPage() {
  // ── State ──────────────────────────────────────────────────────────────
  const [criteria, setCriteria] = useState<DSSCriteria[]>([]);
  const [pairs, setPairs] = useState<PairComparison[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});

  const [weightsData, setWeightsData] = useState<AHPWeightsResponse | null>(null);
  const [consistencyData, setConsistencyData] = useState<AHPConsistencyResponse | null>(null);
  const [alternativesData, setAlternativesData] = useState<AHPAlternativesResponse | null>(null);
  const [hasExisting, setHasExisting] = useState(false);
  const [activeTab, setActiveTab] = useState<"input" | "weights" | "matrix" | "ranking">("input");

  // ── Load criteria and existing matrix ──────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        const allCriteria = await dssApi.getCriteria();
        // Filter to only the 5 AHP criteria, in fixed order
        const ahpCriteria = AHP_CRITERIA_CODES.map((code) =>
          allCriteria.find((c) => c.code === code)
        ).filter(Boolean) as DSSCriteria[];

        setCriteria(ahpCriteria);

        // Build upper-triangle pairs
        const initialPairs: PairComparison[] = [];
        for (let i = 0; i < ahpCriteria.length; i++) {
          for (let j = i + 1; j < ahpCriteria.length; j++) {
            initialPairs.push({
              rowId: ahpCriteria[i].id,
              colId: ahpCriteria[j].id,
              rowCode: ahpCriteria[i].code,
              colCode: ahpCriteria[j].code,
              rowName: CRITERIA_DISPLAY_NAMES[ahpCriteria[i].code] ?? ahpCriteria[i].name,
              colName: CRITERIA_DISPLAY_NAMES[ahpCriteria[j].code] ?? ahpCriteria[j].name,
              value: 1,
            });
          }
        }

        // Try loading existing matrix
        try {
          const existing = await dssApi.getAHPMatrix();
          if (existing && existing.entries.length > 0) {
            setHasExisting(true);
            const entryMap = new Map<string, number>();
            for (const e of existing.entries) {
              entryMap.set(`${e.criteria_id_row}-${e.criteria_id_col}`, e.value);
            }
            for (const pair of initialPairs) {
              const key = `${pair.rowId}-${pair.colId}`;
              const reverseKey = `${pair.colId}-${pair.rowId}`;
              if (entryMap.has(key)) {
                pair.value = Math.round(entryMap.get(key)!);
              } else if (entryMap.has(reverseKey)) {
                const rv = entryMap.get(reverseKey)!;
                pair.value = rv !== 0 ? Math.round(1 / rv) || 1 : 1;
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
          // No existing matrix
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

  // ── Pair value change ───────────────────────────────────────────────────
  const handlePairChange = useCallback((index: number, raw: string) => {
    const numVal = parseFloat(raw);
    const newErrors = { ...validationErrors };

    if (raw === "" || isNaN(numVal)) {
      newErrors[index] = "Vui lòng nhập số từ 1 đến 9.";
    } else if (!Number.isInteger(numVal) || numVal < 1 || numVal > 9) {
      newErrors[index] = "Chỉ được nhập số nguyên từ 1 đến 9.";
    } else {
      delete newErrors[index];
      setPairs((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], value: numVal };
        return updated;
      });
      setWeightsData(null);
      setConsistencyData(null);
      setAlternativesData(null);
      setSuccess(null);
    }

    setValidationErrors(newErrors);
  }, [validationErrors]);

  // ── Save matrix ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    // Validate all pairs
    const newErrors: Record<number, string> = {};
    for (let i = 0; i < pairs.length; i++) {
      const v = pairs[i].value;
      if (!Number.isInteger(v) || v < 1 || v > 9) {
        newErrors[i] = "Chỉ được nhập số nguyên từ 1 đến 9.";
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setValidationErrors(newErrors);
      setError("Vui lòng kiểm tra lại các giá trị so sánh.");
      return;
    }

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

      const [weights, consistency] = await Promise.all([
        dssApi.getAHPWeights(),
        dssApi.getAHPConsistency(),
      ]);
      setWeightsData(weights);
      setConsistencyData(consistency);
      setSuccess("Đã lưu ma trận so sánh thành công!");
      setActiveTab("weights");
    } catch {
      setError("Không thể lưu ma trận so sánh. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  // ── Load alternatives ───────────────────────────────────────────────────
  const handleLoadAlternatives = async () => {
    setLoadingAlternatives(true);
    setError(null);
    try {
      const data = await dssApi.getAHPAlternatives();
      setAlternativesData(data);
      setActiveTab("matrix");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Không thể tải ma trận phương án. Hãy lưu ma trận so sánh trước.";
      setError(msg);
    } finally {
      setLoadingAlternatives(false);
    }
  };

  // ── Full matrix for display ────────────────────────────────────────────
  const buildFullMatrix = (): number[][] => {
    const n = criteria.length;
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(1));
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

  const formatFraction = (val: number): string => {
    if (val >= 1) return String(Math.round(val));
    const inv = Math.round(1 / val);
    return `1/${inv}`;
  };

  // ── Early returns ───────────────────────────────────────────────────────
  if (loading) return <LoadingSpinner />;

  const fullMatrix = buildFullMatrix();
  const sortedWeights = weightsData
    ? [...weightsData.weights].sort((a, b) => b.weight - a.weight)
    : [];

  const tabs = [
    { id: "input", label: "📝 So sánh tiêu chí" },
    { id: "weights", label: "⚖️ Trọng số" },
    { id: "matrix", label: "📊 Ma trận phương án" },
    { id: "ranking", label: "🏆 Kết quả xếp hạng" },
  ] as const;

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "32px 20px", fontFamily: "'Inter', sans-serif" }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#1e293b", margin: 0, letterSpacing: "-0.5px" }}>
          🏠 Phân tích AHP — Hỗ trợ ra quyết định
        </h1>
        <p style={{ color: "#64748b", marginTop: "8px", fontSize: "15px" }}>
          So sánh tầm quan trọng giữa 5 tiêu chí để hệ thống xếp hạng bất động sản phù hợp nhất với bạn.
        </p>
      </div>

      {/* ── Alerts ──────────────────────────────────────────────────────── */}
      {error && <ErrorMessage message={error} />}
      {success && (
        <div style={{
          marginBottom: "20px", padding: "14px 18px",
          background: "linear-gradient(135deg,#dcfce7,#bbf7d0)",
          border: "1px solid #86efac", borderRadius: "12px",
          color: "#166534", fontSize: "14px", fontWeight: 600,
          display: "flex", alignItems: "center", gap: "10px"
        }}>
          ✅ {success}
        </div>
      )}

      {/* ── Consistency Alert ─────────────────────────────────────────── */}
      {consistencyData && !consistencyData.is_consistent && (
        <div style={{
          marginBottom: "20px", padding: "14px 18px",
          background: "linear-gradient(135deg,#fef3c7,#fde68a)",
          border: "1px solid #f59e0b", borderRadius: "12px",
          color: "#92400e", fontSize: "14px",
        }}>
          <strong>⚠️ Cảnh báo nhất quán</strong>
          <p style={{ margin: "6px 0 0" }}>
            Mức độ nhất quán chưa tốt. Bạn nên điều chỉnh lại một số giá trị.
            (CR = {(consistencyData.cr * 100).toFixed(1)}%, phải &lt; 10%)
          </p>
        </div>
      )}
      {consistencyData && consistencyData.is_consistent && (
        <div style={{
          marginBottom: "20px", padding: "14px 18px",
          background: "linear-gradient(135deg,#dcfce7,#bbf7d0)",
          border: "1px solid #86efac", borderRadius: "12px",
          color: "#166534", fontSize: "14px",
        }}>
          ✅ Ma trận nhất quán tốt. (CR = {(consistencyData.cr * 100).toFixed(1)}%)
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: "4px", marginBottom: "28px",
        background: "#f1f5f9", borderRadius: "14px", padding: "6px"
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: "10px 14px", fontSize: "13px", fontWeight: 600,
              border: "none", borderRadius: "10px", cursor: "pointer",
              transition: "all 0.2s",
              background: activeTab === tab.id
                ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                : "transparent",
              color: activeTab === tab.id ? "#fff" : "#64748b",
              boxShadow: activeTab === tab.id ? "0 2px 8px rgba(99,102,241,0.3)" : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1: Nhập mức độ quan trọng giữa hai tiêu chí
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "input" && (
        <div>
          <div style={{
            background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0",
            padding: "28px", marginBottom: "24px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)"
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", marginTop: 0 }}>
              Ma trận so sánh tiêu chí
            </h2>
            <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "24px" }}>
              Nhập mức độ quan trọng giữa hai tiêu chí.
              Giá trị <strong>1 = quan trọng ngang nhau</strong>, <strong>9 = quan trọng tuyệt đối</strong>.
              Nếu tiêu chí bên trái quan trọng hơn, nhập số lớn hơn 1.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {pairs.map((pair, idx) => {
                const desc = SAATY_DESCRIPTIONS[pair.value] ?? "";
                const hasErr = !!validationErrors[idx];
                return (
                  <div
                    key={`${pair.rowId}-${pair.colId}`}
                    style={{
                      padding: "20px", borderRadius: "14px",
                      background: hasErr ? "#fff5f5" : "#fafafa",
                      border: `1px solid ${hasErr ? "#fca5a5" : "#e2e8f0"}`,
                      transition: "0.2s"
                    }}
                  >
                    {/* Row label */}
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      marginBottom: "14px", flexWrap: "wrap", gap: "8px"
                    }}>
                      <span style={{
                        fontWeight: 700, fontSize: "14px", color: "#6366f1",
                        background: "#ede9fe", padding: "4px 12px", borderRadius: "20px"
                      }}>
                        {pair.rowName}
                      </span>
                      <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: 500 }}>
                        so với
                      </span>
                      <span style={{
                        fontWeight: 700, fontSize: "14px", color: "#0891b2",
                        background: "#cffafe", padding: "4px 12px", borderRadius: "20px"
                      }}>
                        {pair.colName}
                      </span>
                    </div>

                    {/* Input row */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <label
                        htmlFor={`pair-input-${idx}`}
                        style={{ fontSize: "13px", color: "#475569", whiteSpace: "nowrap", minWidth: "100px" }}
                      >
                        Mức quan trọng:
                      </label>
                      <input
                        id={`pair-input-${idx}`}
                        type="number"
                        min={1}
                        max={9}
                        step={1}
                        defaultValue={pair.value}
                        onChange={(e) => handlePairChange(idx, e.target.value)}
                        style={{
                          width: "80px", padding: "8px 12px",
                          border: `2px solid ${hasErr ? "#f87171" : "#c7d2fe"}`,
                          borderRadius: "10px", fontSize: "16px", fontWeight: 700,
                          textAlign: "center", color: "#4f46e5",
                          outline: "none", background: "#fff",
                          transition: "border-color 0.2s",
                        }}
                        onFocus={(e) => e.target.style.borderColor = "#6366f1"}
                        onBlur={(e) => e.target.style.borderColor = hasErr ? "#f87171" : "#c7d2fe"}
                      />
                      <div style={{ flex: 1, minWidth: "120px" }}>
                        {!hasErr && desc && (
                          <span style={{
                            fontSize: "12px", color: "#6366f1", fontWeight: 500,
                            background: "#ede9fe", padding: "3px 10px", borderRadius: "20px"
                          }}>
                            {pair.value === 1
                              ? `${pair.rowName} = ${pair.colName}`
                              : `${pair.rowName} > ${pair.colName}: ${desc}`}
                          </span>
                        )}
                        {hasErr && (
                          <span style={{ fontSize: "12px", color: "#ef4444" }}>
                            {validationErrors[idx]}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Helper: reciprocal display */}
                    {pair.value > 1 && (
                      <div style={{ marginTop: "8px", fontSize: "12px", color: "#94a3b8" }}>
                        Tự động: {pair.colName} so với {pair.rowName} = 1/{pair.value} ≈ {(1 / pair.value).toFixed(3)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "16px", marginBottom: 0 }}>
              💡 Gợi ý: <strong>1</strong> = quan trọng ngang nhau, <strong>3</strong> = quan trọng hơn vừa phải,
              <strong> 5</strong> = quan trọng hơn nhiều, <strong>7</strong> = rất quan trọng hơn,
              <strong> 9</strong> = quan trọng tuyệt đối
            </p>
          </div>

          {/* ── Criteria comparison matrix preview ── */}
          <div style={{
            background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0",
            padding: "24px", marginBottom: "24px", overflowX: "auto",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)"
          }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", marginTop: 0, marginBottom: "16px" }}>
              Xem trước ma trận so sánh cặp
            </h3>
            <table style={{ borderCollapse: "collapse", fontSize: "13px", minWidth: "100%", whiteSpace: "nowrap" }}>
              <thead>
                <tr>
                  <th style={{ padding: "10px 14px", background: "#f8fafc", fontWeight: 600, color: "#334155", borderRadius: "8px 0 0 0" }}></th>
                  {criteria.map((c) => (
                    <th key={c.id} style={{
                      padding: "10px 14px", background: "#f8fafc",
                      fontWeight: 700, color: "#6366f1", textAlign: "center"
                    }}>
                      {CRITERIA_DISPLAY_NAMES[c.code] ?? c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fullMatrix.map((row, ri) => (
                  <tr key={criteria[ri]?.id ?? ri}>
                    <td style={{
                      padding: "10px 14px", fontWeight: 700, color: "#6366f1",
                      background: "#f8fafc", whiteSpace: "nowrap"
                    }}>
                      {CRITERIA_DISPLAY_NAMES[criteria[ri]?.code] ?? criteria[ri]?.name}
                    </td>
                    {row.map((val, ci) => (
                      <td key={ci} style={{
                        padding: "10px 14px", textAlign: "center",
                        background: ri === ci
                          ? "#ede9fe"
                          : val > 1 ? "#ecfdf5" : val < 1 ? "#eff6ff" : "#fff",
                        color: ri === ci ? "#7c3aed" : val > 1 ? "#16a34a" : val < 1 ? "#2563eb" : "#374151",
                        fontWeight: ri === ci ? 700 : 500,
                      }}>
                        {formatFraction(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Action buttons ── */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              id="ahp-save-btn"
              onClick={handleSave}
              disabled={saving || Object.keys(validationErrors).length > 0}
              style={{
                flex: 1, minWidth: "180px", padding: "14px 28px",
                background: saving ? "#a5b4fc" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff", border: "none", borderRadius: "12px",
                fontSize: "15px", fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
                transition: "all 0.2s", opacity: Object.keys(validationErrors).length > 0 ? 0.6 : 1,
              }}
            >
              {saving ? "⏳ Đang lưu..." : hasExisting ? "💾 Cập nhật ma trận" : "💾 Lưu ma trận so sánh"}
            </button>

            {hasExisting && (
              <button
                id="ahp-load-alternatives-btn"
                onClick={handleLoadAlternatives}
                disabled={loadingAlternatives}
                style={{
                  padding: "14px 24px",
                  background: "linear-gradient(135deg,#0891b2,#0e7490)",
                  color: "#fff", border: "none", borderRadius: "12px",
                  fontSize: "15px", fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(8,145,178,0.4)",
                  transition: "all 0.2s",
                }}
              >
                {loadingAlternatives ? "⏳ Đang tải..." : "📊 Xem ma trận phương án"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2: Trọng số tiêu chí
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "weights" && (
        <div>
          {!weightsData ? (
            <div style={{
              textAlign: "center", padding: "60px 20px",
              background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚖️</div>
              <p style={{ color: "#64748b", fontSize: "16px" }}>
                Hãy lưu ma trận so sánh trước để xem trọng số tiêu chí.
              </p>
              <button
                onClick={() => setActiveTab("input")}
                style={{
                  marginTop: "16px", padding: "10px 24px",
                  background: "#6366f1", color: "#fff", border: "none",
                  borderRadius: "10px", fontSize: "14px", fontWeight: 600, cursor: "pointer"
                }}
              >
                ← Quay lại nhập liệu
              </button>
            </div>
          ) : (
            <div style={{
              background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0",
              padding: "28px", boxShadow: "0 4px 24px rgba(0,0,0,0.06)"
            }}>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b", marginTop: 0 }}>
                Trọng số tiêu chí
              </h2>
              <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "24px" }}>
                Trọng số phản ánh mức quan trọng tương đối của mỗi tiêu chí theo phân tích AHP.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {sortedWeights.map((w, idx) => {
                  const pct = Math.round(w.weight * 100);
                  const gradients = [
                    "linear-gradient(90deg,#6366f1,#8b5cf6)",
                    "linear-gradient(90deg,#0891b2,#06b6d4)",
                    "linear-gradient(90deg,#059669,#10b981)",
                    "linear-gradient(90deg,#d97706,#f59e0b)",
                    "linear-gradient(90deg,#dc2626,#ef4444)",
                  ];
                  return (
                    <div key={w.criteria_id}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontWeight: 700, fontSize: "14px", color: "#334155" }}>
                          {CRITERIA_DISPLAY_NAMES[w.criteria_code] ?? w.criteria_name}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: "15px", color: "#6366f1" }}>
                          {pct}%
                        </span>
                      </div>
                      <div style={{ height: "12px", background: "#f1f5f9", borderRadius: "100px", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${Math.max(pct, 2)}%`,
                          background: gradients[idx % gradients.length],
                          borderRadius: "100px",
                          transition: "width 0.8s ease",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Consistency stats */}
              <div style={{
                marginTop: "28px", padding: "16px 20px",
                background: "#f8fafc", borderRadius: "12px",
                display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px",
                textAlign: "center"
              }}>
                {[
                  { label: "λ max", value: weightsData.lambda_max.toFixed(4) },
                  { label: "CI", value: weightsData.ci.toFixed(4) },
                  {
                    label: "CR", value: `${(weightsData.cr * 100).toFixed(2)}%`,
                    color: weightsData.is_consistent ? "#16a34a" : "#d97706"
                  },
                  {
                    label: "Nhất quán",
                    value: weightsData.is_consistent ? "✅ Đạt" : "⚠️ Chưa đạt",
                    color: weightsData.is_consistent ? "#16a34a" : "#d97706"
                  },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>{stat.label}</p>
                    <p style={{ margin: "4px 0 0", fontWeight: 700, fontSize: "14px", color: stat.color ?? "#1e293b" }}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleLoadAlternatives}
                disabled={loadingAlternatives}
                style={{
                  marginTop: "20px", width: "100%", padding: "14px",
                  background: "linear-gradient(135deg,#0891b2,#0e7490)",
                  color: "#fff", border: "none", borderRadius: "12px",
                  fontSize: "15px", fontWeight: 700, cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {loadingAlternatives ? "⏳ Đang tải..." : "📊 Tiếp tục: Xem ma trận phương án →"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 3: Ma trận phương án (5 alternatives × 5 criteria)
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "matrix" && (
        <div>
          {!alternativesData ? (
            <div style={{
              textAlign: "center", padding: "60px 20px",
              background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
              <p style={{ color: "#64748b", fontSize: "16px" }}>
                Hãy lưu ma trận so sánh và nhấn "Xem ma trận phương án" để tiếp tục.
              </p>
              <button
                onClick={() => setActiveTab("input")}
                style={{
                  marginTop: "16px", padding: "10px 24px",
                  background: "#6366f1", color: "#fff", border: "none",
                  borderRadius: "10px", fontSize: "14px", fontWeight: 600, cursor: "pointer"
                }}
              >
                ← Quay lại nhập liệu
              </button>
            </div>
          ) : (
            <div>
              {/* Consistency notice */}
              {!alternativesData.is_consistent && (
                <div style={{
                  marginBottom: "20px", padding: "14px 18px",
                  background: "#fef3c7", border: "1px solid #f59e0b",
                  borderRadius: "12px", color: "#92400e", fontSize: "14px"
                }}>
                  ⚠️ {alternativesData.consistency_message}
                </div>
              )}

              {/* Table */}
              <div style={{
                background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0",
                padding: "24px", overflowX: "auto",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)"
              }}>
                <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b", marginTop: 0 }}>
                  Ma trận phương án
                </h2>
                <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>
                  Giá trị chuẩn hoá (0–1) cho mỗi phương án theo từng tiêu chí. Giá trị cao hơn là tốt hơn.
                </p>

                <table style={{
                  borderCollapse: "collapse", fontSize: "13px",
                  minWidth: "100%", whiteSpace: "nowrap"
                }}>
                  <thead>
                    <tr>
                      <th style={{
                        padding: "12px 16px", background: "#f0f4ff",
                        textAlign: "left", fontWeight: 700, color: "#4f46e5",
                        borderRadius: "10px 0 0 0"
                      }}>
                        Phương án
                      </th>
                      {alternativesData.criteria.map((c) => (
                        <th key={c.code} style={{
                          padding: "12px 16px", background: "#f0f4ff",
                          textAlign: "center", fontWeight: 700, color: "#4f46e5"
                        }}>
                          {CRITERIA_DISPLAY_NAMES[c.code] ?? c.name}
                          <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 400 }}>
                            {(alternativesData.criteria_weights.find((w) => w.criteria_code === c.code)?.weight ?? 0) * 100 |0}%
                          </div>
                        </th>
                      ))}
                      <th style={{
                        padding: "12px 16px", background: "#f0f4ff",
                        textAlign: "center", fontWeight: 700, color: "#4f46e5"
                      }}>
                        Điểm AHP
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {alternativesData.alternative_matrix.map((row, rowIdx) => {
                      const alt = alternativesData.alternatives.find(
                        (a) => a.property_id === row.property_id
                      );
                      const bg = rowIdx % 2 === 0 ? "#fff" : "#fafafa";
                      return (
                        <tr key={row.property_id}>
                          <td style={{
                            padding: "12px 16px", background: bg,
                            maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis"
                          }}>
                            <div style={{ fontWeight: 700, fontSize: "13px", color: "#1e293b" }}>
                              {alt?.suburb ?? row.title.substring(0, 30)}
                            </div>
                            <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                              {formatPrice(alt?.price ?? null)}
                            </div>
                          </td>
                          {alternativesData.criteria.map((c) => {
                            const v = row.values[c.code] ?? 0;
                            const { pct, color } = normalizedToBar(v);
                            return (
                              <td key={c.code} style={{ padding: "10px 16px", textAlign: "center", background: bg }}>
                                <div style={{ fontSize: "13px", fontWeight: 700, color }}>
                                  {pct}%
                                </div>
                                <div style={{
                                  height: "5px", background: "#e2e8f0", borderRadius: "4px",
                                  marginTop: "4px", overflow: "hidden"
                                }}>
                                  <div style={{
                                    height: "100%", width: `${pct}%`,
                                    background: color, borderRadius: "4px"
                                  }} />
                                </div>
                              </td>
                            );
                          })}
                          <td style={{
                            padding: "12px 16px", textAlign: "center", background: bg,
                            fontWeight: 800, fontSize: "15px",
                            color: row.ahp_score >= 0.6 ? "#16a34a" : row.ahp_score >= 0.4 ? "#d97706" : "#dc2626"
                          }}>
                            {(row.ahp_score * 100).toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button
                onClick={() => setActiveTab("ranking")}
                style={{
                  marginTop: "20px", width: "100%", padding: "14px",
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  color: "#fff", border: "none", borderRadius: "12px",
                  fontSize: "15px", fontWeight: 700, cursor: "pointer"
                }}
              >
                🏆 Xem kết quả xếp hạng →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 4: Kết quả xếp hạng bất động sản
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "ranking" && (
        <div>
          {!alternativesData ? (
            <div style={{
              textAlign: "center", padding: "60px 20px",
              background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏆</div>
              <p style={{ color: "#64748b", fontSize: "16px" }}>
                Hãy lưu ma trận so sánh và xem ma trận phương án trước.
              </p>
              <button
                onClick={() => setActiveTab("input")}
                style={{
                  marginTop: "16px", padding: "10px 24px",
                  background: "#6366f1", color: "#fff", border: "none",
                  borderRadius: "10px", fontSize: "14px", fontWeight: 600, cursor: "pointer"
                }}
              >
                ← Quay lại nhập liệu
              </button>
            </div>
          ) : (
            <div>
              <div style={{
                background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0",
                padding: "28px", boxShadow: "0 4px 24px rgba(0,0,0,0.06)"
              }}>
                <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b", marginTop: 0 }}>
                  Kết quả xếp hạng bất động sản
                </h2>
                <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "24px" }}>
                  Xếp hạng dựa trên tích trọng số × giá trị chuẩn hoá cho từng tiêu chí.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {alternativesData.ranking.map((item, idx) => {
                    const alt = alternativesData.alternatives.find(
                      (a) => a.property_id === item.property_id
                    );
                    const scoreColor =
                      item.ahp_score >= 0.6
                        ? "#16a34a"
                        : item.ahp_score >= 0.4
                        ? "#d97706"
                        : "#dc2626";

                    return (
                      <div
                        key={item.property_id}
                        style={{
                          display: "flex", gap: "16px", alignItems: "stretch",
                          borderRadius: "16px", overflow: "hidden",
                          border: "1px solid #e2e8f0",
                          transition: "transform 0.2s, box-shadow 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.transform = "none";
                          (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                        }}
                      >
                        {/* Rank badge */}
                        <div style={{
                          width: "70px", flexShrink: 0,
                          background: RANK_COLORS[idx] ?? "linear-gradient(135deg,#e2e8f0,#cbd5e1)",
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center",
                          padding: "16px 8px"
                        }}>
                          <div style={{ fontSize: "24px" }}>{RANK_MEDALS[idx] ?? "•"}</div>
                          <div style={{ color: "#fff", fontSize: "12px", fontWeight: 700, marginTop: "4px" }}>
                            #{item.rank}
                          </div>
                        </div>

                        {/* Property image */}
                        {alt?.primary_image && (
                          <img
                            src={alt.primary_image}
                            alt="Property"
                            style={{
                              width: "100px", height: "100px", objectFit: "cover",
                              flexShrink: 0, alignSelf: "center"
                            }}
                          />
                        )}

                        {/* Info */}
                        <div style={{ flex: 1, padding: "16px 12px" }}>
                          <div style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b", marginBottom: "4px" }}>
                            {alt?.suburb
                              ? `${alt.suburb} — ${alt.price ? formatPrice(alt.price) : "N/A"}`
                              : item.title}
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "10px" }}>
                            {alt
                              ? [
                                  alt.rooms != null && `${alt.rooms} phòng`,
                                  alt.bedrooms != null && `${alt.bedrooms} phòng ngủ`,
                                  alt.year_built != null && `Xây ${alt.year_built}`,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")
                              : ""}
                          </div>

                          {/* Score bar */}
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{
                              flex: 1, height: "8px", background: "#f1f5f9",
                              borderRadius: "100px", overflow: "hidden"
                            }}>
                              <div style={{
                                height: "100%",
                                width: `${Math.round(item.ahp_score * 100)}%`,
                                background: scoreColor, borderRadius: "100px",
                                transition: "width 0.8s ease"
                              }} />
                            </div>
                            <span style={{
                              fontSize: "16px", fontWeight: 800, color: scoreColor, minWidth: "50px",
                              textAlign: "right"
                            }}>
                              {(item.ahp_score * 100).toFixed(1)}%
                            </span>
                          </div>

                          {/* Label badge */}
                          <span style={{
                            marginTop: "8px", display: "inline-block",
                            padding: "3px 10px", borderRadius: "20px",
                            fontSize: "12px", fontWeight: 600,
                            background: item.ahp_score >= 0.6
                              ? "#dcfce7" : item.ahp_score >= 0.4 ? "#fef3c7" : "#fee2e2",
                            color: item.ahp_score >= 0.6
                              ? "#16a34a" : item.ahp_score >= 0.4 ? "#92400e" : "#b91c1c",
                          }}>
                            {item.summary_label}
                          </span>
                        </div>

                        {/* Criteria breakdown mini */}
                        <div style={{
                          background: "#f8fafc", padding: "12px 16px",
                          minWidth: "160px", display: "flex", flexDirection: "column",
                          gap: "4px", justifyContent: "center"
                        }}>
                          {alternativesData.criteria.map((c) => {
                            const v = item.values[c.code] ?? 0;
                            const pct = Math.round(v * 100);
                            const w = alternativesData.criteria_weights.find(
                              (ww) => ww.criteria_code === c.code
                            )?.weight ?? 0;
                            return (
                              <div key={c.code} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{
                                  fontSize: "11px", color: "#64748b",
                                  width: "80px", overflow: "hidden", textOverflow: "ellipsis",
                                  whiteSpace: "nowrap"
                                }}>
                                  {CRITERIA_DISPLAY_NAMES[c.code] ?? c.name}
                                </span>
                                <div style={{
                                  flex: 1, height: "4px", background: "#e2e8f0",
                                  borderRadius: "100px", overflow: "hidden"
                                }}>
                                  <div style={{
                                    height: "100%", width: `${pct}%`,
                                    background: normalizedToBar(v).color,
                                    borderRadius: "100px"
                                  }} />
                                </div>
                                <span style={{ fontSize: "10px", color: "#94a3b8", minWidth: "24px", textAlign: "right" }}>
                                  {Math.round(w * pct)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              {!alternativesData.is_consistent && (
                <div style={{
                  marginTop: "20px", padding: "16px 20px",
                  background: "#fef3c7", border: "1px solid #f59e0b",
                  borderRadius: "12px", fontSize: "14px", color: "#92400e"
                }}>
                  ⚠️ <strong>Mức độ nhất quán chưa tốt.</strong> Bạn nên điều chỉnh lại một số giá trị so sánh
                  để kết quả xếp hạng đáng tin cậy hơn.
                </div>
              )}

              <button
                onClick={() => setActiveTab("input")}
                style={{
                  marginTop: "20px", padding: "12px 24px",
                  background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0",
                  borderRadius: "10px", fontSize: "14px", fontWeight: 600, cursor: "pointer"
                }}
              >
                ← Quay lại điều chỉnh so sánh
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Info box ─────────────────────────────────────────────────────── */}
      <div style={{
        marginTop: "32px", padding: "20px 24px",
        background: "linear-gradient(135deg,#eff6ff,#dbeafe)",
        border: "1px solid #93c5fd", borderRadius: "16px"
      }}>
        <h3 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 700, color: "#1e40af" }}>
          ℹ️ Hướng dẫn sử dụng AHP
        </h3>
        <ul style={{ margin: 0, padding: "0 0 0 18px", color: "#1e3a8a", fontSize: "13px", lineHeight: "1.8" }}>
          <li>Nhập số nguyên từ 1–9 để biểu thị mức độ quan trọng giữa hai tiêu chí</li>
          <li>1 = hai tiêu chí ngang nhau; 9 = tiêu chí bên trái tuyệt đối quan trọng hơn</li>
          <li>Giá trị nghịch đảo sẽ được tự động tính cho phần còn lại của ma trận</li>
          <li>Tỉ lệ nhất quán (CR) cần dưới 10% để kết quả đáng tin cậy</li>
          <li>Sau khi lưu, nhấn "Xem ma trận phương án" để so sánh 5 bất động sản</li>
        </ul>
      </div>
    </div>
  );
}
