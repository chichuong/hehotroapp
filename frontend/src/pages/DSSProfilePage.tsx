import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { dssApi } from "../api/dss";
import { propertyApi } from "../api/properties";
import type {
  UserProfile,
  UserProfileInput,
  DSSCriteria,
  CriteriaPreference,
  CriteriaPreferenceInput,
} from "../types";
import LoadingSpinner from "../components/LoadingSpinner";

const BUYING_PURPOSE_OPTIONS = [
  { value: "Để ở", label: "Để ở" },
  { value: "Đầu tư", label: "Đầu tư" },
  { value: "Cho thuê", label: "Cho thuê" },
  { value: "Kết hợp ở và đầu tư", label: "Kết hợp ở và đầu tư" },
];

const RISK_TOLERANCE_OPTIONS = [
  { value: "low", label: "Thấp" },
  { value: "medium", label: "Trung bình" },
  { value: "high", label: "Cao" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Thấp" },
  { value: "medium", label: "Trung bình" },
  { value: "high", label: "Cao" },
  { value: "critical", label: "Rất quan trọng" },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

// Criteria that have limited data support currently
const UNSUPPORTED_CRITERIA = new Set([
  "investment_potential",
  "safety",
  "legal_status",
]);

export default function DSSProfilePage() {
  const { user } = useAuth();

  // Profile state
  const [, setProfile] = useState<UserProfile | null>(null);
  const [profileExists, setProfileExists] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Profile form
  const [form, setForm] = useState<UserProfileInput>({
    buying_purpose: null,
    budget_min: null,
    budget_max: null,
    preferred_suburbs: [],
    preferred_property_types: [],
    min_bedrooms: null,
    min_bathrooms: null,
    min_cars: null,
    preferred_min_year_built: null,
    risk_tolerance: null,
    family_size: null,
    has_children: null,
    work_location_text: null,
    notes: null,
  });
  const [suburbInput, setSuburbInput] = useState("");

  // Criteria state
  const [criteria, setCriteria] = useState<DSSCriteria[]>([]);
  const [preferences, setPreferences] = useState<
    Record<number, string>
  >({});
  const [, setSavedPreferences] = useState<CriteriaPreference[]>([]);
  const [loadingCriteria, setLoadingCriteria] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Suburb & type suggestions
  const [allSuburbs, setAllSuburbs] = useState<string[]>([]);
  const [allTypes, setAllTypes] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingProfile(true);
    setLoadingCriteria(true);

    // Load suburbs and types for suggestions
    try {
      const [suburbs, types] = await Promise.all([
        propertyApi.getSuburbs(),
        propertyApi.getTypes(),
      ]);
      setAllSuburbs(suburbs);
      setAllTypes(types);
    } catch {
      // Non-critical
    }

    // Load profile
    try {
      const p = await dssApi.getProfile();
      setProfile(p);
      setProfileExists(true);
      setForm({
        buying_purpose: p.buying_purpose,
        budget_min: p.budget_min,
        budget_max: p.budget_max,
        preferred_suburbs: p.preferred_suburbs || [],
        preferred_property_types: p.preferred_property_types || [],
        min_bedrooms: p.min_bedrooms,
        min_bathrooms: p.min_bathrooms,
        min_cars: p.min_cars,
        preferred_min_year_built: p.preferred_min_year_built,
        risk_tolerance: p.risk_tolerance,
        family_size: p.family_size,
        has_children: p.has_children,
        work_location_text: p.work_location_text,
        notes: p.notes,
      });
    } catch {
      setProfileExists(false);
    } finally {
      setLoadingProfile(false);
    }

    // Load criteria + preferences
    try {
      const [criteriaList, prefsRes] = await Promise.all([
        dssApi.getCriteria(),
        dssApi.getPreferences().catch(() => ({ preferences: [] })),
      ]);
      setCriteria(criteriaList);
      setSavedPreferences(prefsRes.preferences);

      const prefsMap: Record<number, string> = {};
      for (const c of criteriaList) {
        const saved = prefsRes.preferences.find(
          (p) => p.criteria_id === c.id
        );
        prefsMap[c.id] = saved ? saved.priority_level : "medium";
      }
      setPreferences(prefsMap);
    } catch {
      // Non-critical
    } finally {
      setLoadingCriteria(false);
    }
  };

  // --- Profile form handlers ---
  const handleFormChange = (
    field: keyof UserProfileInput,
    value: string | number | boolean | null
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addSuburb = () => {
    const trimmed = suburbInput.trim();
    if (trimmed && !(form.preferred_suburbs || []).includes(trimmed)) {
      setForm((prev) => ({
        ...prev,
        preferred_suburbs: [...(prev.preferred_suburbs || []), trimmed],
      }));
    }
    setSuburbInput("");
  };

  const removeSuburb = (suburb: string) => {
    setForm((prev) => ({
      ...prev,
      preferred_suburbs: (prev.preferred_suburbs || []).filter(
        (s) => s !== suburb
      ),
    }));
  };

  const togglePropertyType = (type: string) => {
    setForm((prev) => {
      const current = prev.preferred_property_types || [];
      if (current.includes(type)) {
        return {
          ...prev,
          preferred_property_types: current.filter((t) => t !== type),
        };
      }
      return {
        ...prev,
        preferred_property_types: [...current, type],
      };
    });
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      if (profileExists) {
        const updated = await dssApi.updateProfile(form);
        setProfile(updated);
        setProfileMsg({ type: "success", text: "Cập nhật hồ sơ thành công!" });
      } else {
        const created = await dssApi.createProfile(form);
        setProfile(created);
        setProfileExists(true);
        setProfileMsg({ type: "success", text: "Tạo hồ sơ thành công!" });
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || "Có lỗi xảy ra. Vui lòng thử lại.";
      setProfileMsg({ type: "error", text: msg });
    } finally {
      setSavingProfile(false);
    }
  };

  // --- Preferences handlers ---
  const handlePriorityChange = (criteriaId: number, level: string) => {
    setPreferences((prev) => ({ ...prev, [criteriaId]: level }));
  };

  const savePreferences = async () => {
    setSavingPrefs(true);
    setPrefsMsg(null);
    try {
      const items: CriteriaPreferenceInput[] = Object.entries(preferences).map(
        ([cid, level]) => ({
          criteria_id: Number(cid),
          priority_level: level,
        })
      );
      const res = await dssApi.updatePreferences(items);
      setSavedPreferences(res.preferences);
      setPrefsMsg({ type: "success", text: "Lưu mức ưu tiên thành công!" });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || "Có lỗi xảy ra. Vui lòng thử lại.";
      setPrefsMsg({ type: "error", text: msg });
    } finally {
      setSavingPrefs(false);
    }
  };

  if (loadingProfile && loadingCriteria) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-primary-600">
          Trang chủ
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Hồ sơ nhu cầu</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        🎯 Hồ sơ nhu cầu bất động sản
      </h1>
      <p className="text-gray-600 mb-8">
        Thiết lập hồ sơ nhu cầu để hệ thống đánh giá mức độ phù hợp của các
        bất động sản với bạn. Đây là bước nền tảng cho hệ thống hỗ trợ ra quyết
        định.
      </p>

      {!profileExists && !loadingProfile && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-8">
          <h3 className="text-blue-800 font-semibold mb-1">
            👋 Chào {user?.full_name}!
          </h3>
          <p className="text-blue-700 text-sm">
            Bạn chưa có hồ sơ nhu cầu. Hãy điền thông tin bên dưới để hệ thống
            có thể đánh giá mức độ phù hợp của các bất động sản với nhu cầu
            của bạn.
          </p>
        </div>
      )}

      {/* ===== PROFILE FORM ===== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          📋 Thông tin hồ sơ
        </h2>

        {/* Section: Mục tiêu */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
            Mục tiêu mua bất động sản
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mục đích mua
            </label>
            <select
              value={form.buying_purpose || ""}
              onChange={(e) =>
                handleFormChange(
                  "buying_purpose",
                  e.target.value || null
                )
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">-- Chọn mục đích --</option>
              {BUYING_PURPOSE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section: Ngân sách */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
            Ngân sách
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngân sách tối thiểu (AUD)
              </label>
              <input
                type="number"
                min={0}
                value={form.budget_min ?? ""}
                onChange={(e) =>
                  handleFormChange(
                    "budget_min",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                placeholder="Ví dụ: 500000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngân sách tối đa (AUD)
              </label>
              <input
                type="number"
                min={0}
                value={form.budget_max ?? ""}
                onChange={(e) =>
                  handleFormChange(
                    "budget_max",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                placeholder="Ví dụ: 1500000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Section: Khu vực ưu tiên */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
            Khu vực ưu tiên
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Khu vực ưu tiên
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                list="suburb-suggestions"
                value={suburbInput}
                onChange={(e) => setSuburbInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSuburb();
                  }
                }}
                placeholder="Nhập tên khu vực và nhấn Enter"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <datalist id="suburb-suggestions">
                {allSuburbs.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <button
                type="button"
                onClick={addSuburb}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700 transition-colors"
              >
                Thêm
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(form.preferred_suburbs || []).map((s) => (
                <span
                  key={s}
                  className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => removeSuburb(s)}
                    className="text-primary-400 hover:text-red-600 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Section: Loại BĐS */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Loại bất động sản ưu tiên
          </label>
          <div className="flex flex-wrap gap-2">
            {allTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => togglePropertyType(type)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  (form.preferred_property_types || []).includes(type)
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-primary-400"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Section: Yêu cầu cơ bản */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
            Yêu cầu cơ bản
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số phòng ngủ tối thiểu
              </label>
              <input
                type="number"
                min={0}
                value={form.min_bedrooms ?? ""}
                onChange={(e) =>
                  handleFormChange(
                    "min_bedrooms",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số phòng tắm tối thiểu
              </label>
              <input
                type="number"
                min={0}
                value={form.min_bathrooms ?? ""}
                onChange={(e) =>
                  handleFormChange(
                    "min_bathrooms",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chỗ đậu xe tối thiểu
              </label>
              <input
                type="number"
                min={0}
                value={form.min_cars ?? ""}
                onChange={(e) =>
                  handleFormChange(
                    "min_cars",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Năm xây dựng tối thiểu mong muốn
              </label>
              <input
                type="number"
                min={1800}
                max={2100}
                value={form.preferred_min_year_built ?? ""}
                onChange={(e) =>
                  handleFormChange(
                    "preferred_min_year_built",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                placeholder="Ví dụ: 2000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Section: Thông tin bổ sung */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
            Thông tin bổ sung
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mức chấp nhận rủi ro
              </label>
              <select
                value={form.risk_tolerance || ""}
                onChange={(e) =>
                  handleFormChange(
                    "risk_tolerance",
                    e.target.value || null
                  )
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">-- Chọn --</option>
                {RISK_TOLERANCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số thành viên gia đình
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={form.family_size ?? ""}
                onChange={(e) =>
                  handleFormChange(
                    "family_size",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gia đình có trẻ nhỏ
              </label>
              <select
                value={
                  form.has_children === null
                    ? ""
                    : form.has_children
                    ? "true"
                    : "false"
                }
                onChange={(e) =>
                  handleFormChange(
                    "has_children",
                    e.target.value === "" ? null : e.target.value === "true"
                  )
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">-- Chọn --</option>
                <option value="true">Có</option>
                <option value="false">Không</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Khu vực làm việc hoặc ghi chú vị trí
              </label>
              <input
                type="text"
                maxLength={500}
                value={form.work_location_text || ""}
                onChange={(e) =>
                  handleFormChange(
                    "work_location_text",
                    e.target.value || null
                  )
                }
                placeholder="Ví dụ: CBD Melbourne"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chú thêm
            </label>
            <textarea
              maxLength={2000}
              rows={3}
              value={form.notes || ""}
              onChange={(e) =>
                handleFormChange("notes", e.target.value || null)
              }
              placeholder="Ghi chú thêm về nhu cầu của bạn..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Profile message */}
        {profileMsg && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              profileMsg.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {profileMsg.text}
          </div>
        )}

        <button
          onClick={saveProfile}
          disabled={savingProfile}
          className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {savingProfile
            ? "Đang lưu..."
            : profileExists
            ? "Cập nhật hồ sơ"
            : "Lưu hồ sơ"}
        </button>
      </div>

      {/* ===== CRITERIA PRIORITY UI ===== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          ⚖️ Mức độ ưu tiên tiêu chí
        </h2>
        <p className="text-gray-600 text-sm mb-6">
          Thiết lập mức độ ưu tiên cho từng tiêu chí. Hệ thống sẽ sử dụng thông
          tin này để đánh giá mức độ phù hợp của các bất động sản.
        </p>

        {loadingCriteria ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className="space-y-3">
              {criteria.map((c) => {
                const isUnsupported = UNSUPPORTED_CRITERIA.has(c.code);
                return (
                  <div
                    key={c.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg border ${
                      isUnsupported
                        ? "bg-gray-50 border-gray-200"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">
                          {c.name}
                        </span>
                        {isUnsupported && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                            Sắp hỗ trợ
                          </span>
                        )}
                      </div>
                      {c.description && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {c.description}
                        </p>
                      )}
                      {isUnsupported && (
                        <p className="text-xs text-yellow-600 mt-0.5 italic">
                          Tiêu chí này sẽ được mở rộng khi hệ thống có thêm dữ
                          liệu.
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {PRIORITY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            handlePriorityChange(c.id, opt.value)
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            preferences[c.id] === opt.value
                              ? `${PRIORITY_COLORS[opt.value]} border-current ring-1 ring-current/20`
                              : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Preferences message */}
            {prefsMsg && (
              <div
                className={`mt-4 p-3 rounded-lg text-sm ${
                  prefsMsg.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {prefsMsg.text}
              </div>
            )}

            <button
              onClick={savePreferences}
              disabled={savingPrefs}
              className="mt-6 bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {savingPrefs ? "Đang lưu..." : "Lưu mức ưu tiên"}
            </button>
          </>
        )}
      </div>

      {/* Info note */}
      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          ℹ️ Về hệ thống hỗ trợ ra quyết định
        </h3>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>
            • Hệ thống đánh giá mức độ phù hợp dựa trên hồ sơ nhu cầu và tiêu
            chí ưu tiên của bạn.
          </li>
          <li>
            • Kết quả đánh giá chỉ mang tính tham khảo, dựa trên quy tắc so
            khớp cơ bản.
          </li>
          <li>
            • Các tiêu chí như Tiềm năng đầu tư, Mức độ an toàn, Pháp lý sẽ
            được hỗ trợ đầy đủ hơn trong các phiên bản tiếp theo.
          </li>
          <li>
            • Hệ thống AHP (phân tích thứ bậc) và AI định giá sẽ được tích hợp
            trong các giai đoạn sau.
          </li>
        </ul>
      </div>
    </div>
  );
}
