import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { dssApi } from "../api/dss";
import { propertyApi } from "../api/properties";
import { useAuth } from "../context/AuthContext";
import type {
  RecommendedPropertyItem,
  RecommendationsResponse,
  RecommendationsSummaryResponse,
  RecommendationFilters,
} from "../types";
import { formatPrice } from "../utils/format";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import Pagination from "../components/Pagination";
import RecommendationBadge from "../components/RecommendationBadge";
import DSSExplanationBlock from "../components/DSSExplanationBlock";
import RecommendationSummaryPanel from "../components/RecommendationSummaryPanel";

export default function RecommendationsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [summary, setSummary] = useState<RecommendationsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [page, setPage] = useState(1);
  const [suburb, setSuburb] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Suburbs & types for dropdowns
  const [suburbs, setSuburbs] = useState<string[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);

  useEffect(() => {
    propertyApi.getSuburbs().then(setSuburbs).catch(() => {});
    propertyApi.getTypes().then(setPropertyTypes).catch(() => {});
  }, []);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: RecommendationFilters = { page, page_size: 12 };
      if (suburb) filters.suburb = suburb;
      if (propertyType) filters.property_type = propertyType;
      if (minPrice) filters.min_price = Number(minPrice);
      if (maxPrice) filters.max_price = Number(maxPrice);

      const res = await dssApi.getRecommendations(filters);
      setData(res);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setError("Bạn chưa tạo hồ sơ nhu cầu hoặc chưa có gợi ý. Vui lòng cập nhật gợi ý.");
      } else {
        setError("Không thể tải danh sách gợi ý.");
      }
    } finally {
      setLoading(false);
    }
  }, [page, suburb, propertyType, minPrice, maxPrice]);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await dssApi.getRecommendationsSummary();
      setSummary(res);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchRecommendations();
      fetchSummary();
    }
  }, [user, fetchRecommendations, fetchSummary]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await dssApi.refreshRecommendations();
      // Show success briefly via alert or just reload
      setPage(1);
      await fetchRecommendations();
      await fetchSummary();
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setError("Bạn cần tạo hồ sơ nhu cầu trước khi cập nhật gợi ý.");
      } else {
        setError("Không thể cập nhật gợi ý. Vui lòng thử lại.");
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRecommendations();
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          🎯 Gợi ý bất động sản dành cho bạn
        </h1>
        <p className="text-gray-600 mb-6">
          Vui lòng{" "}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            đăng nhập
          </Link>{" "}
          để xem gợi ý cá nhân hóa.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            🎯 Gợi ý bất động sản dành cho bạn
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Kết hợp đánh giá AHP, định giá AI và tiêu chí phù hợp cơ bản
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {refreshing ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Đang cập nhật...
            </>
          ) : (
            <>🔄 Cập nhật gợi ý</>
          )}
        </button>
      </div>

      {/* Summary panel */}
      <div className="mb-6">
        <RecommendationSummaryPanel summary={summary} loading={summaryLoading} />
      </div>

      {/* Filters */}
      <form onSubmit={handleFilterSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Khu vực</label>
            <select
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Tất cả</option>
              {suburbs.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Loại BĐS</label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Tất cả</option>
              {propertyTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Giá tối thiểu</label>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Giá tối đa</label>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Không giới hạn"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg px-4 py-2 text-sm transition-colors"
            >
              🔍 Lọc
            </button>
          </div>
        </div>
      </form>

      {/* Error */}
      {error && <ErrorMessage message={error} />}

      {/* Loading */}
      {loading && <LoadingSpinner />}

      {/* Results */}
      {!loading && data && (
        <>
          {data.items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                Chưa có gợi ý nào. Nhấn &quot;Cập nhật gợi ý&quot; để phân tích bất động sản.
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Đảm bảo bạn đã tạo{" "}
                <Link to="/dss/profile" className="text-primary-600 hover:text-primary-700">
                  hồ sơ nhu cầu
                </Link>
                {" "}và thiết lập{" "}
                <Link to="/dss/ahp" className="text-primary-600 hover:text-primary-700">
                  ưu tiên AHP
                </Link>
                .
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.items.map((item) => (
                  <RecommendationCard key={item.property_id} item={item} />
                ))}
              </div>

              {data.total_pages > 1 && (
                <div className="mt-8">
                  <Pagination
                    currentPage={data.page}
                    totalPages={data.total_pages}
                    onPageChange={setPage}
                  />
                </div>
              )}

              <p className="text-center text-sm text-gray-400 mt-4">
                Hiển thị {data.items.length} / {data.total} kết quả
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}

function RecommendationCard({ item }: { item: RecommendedPropertyItem }) {
  const fallbackImg =
    "https://placehold.co/600x400/e2e8f0/64748b?text=B%E1%BA%A5t+%C4%91%E1%BB%99ng+s%E1%BA%A3n";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <Link to={`/properties/${item.property_id}`}>
        <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative">
          <img
            src={item.primary_image || fallbackImg}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Rank badge */}
          <span className="absolute top-2 left-2 bg-primary-600 text-white text-xs font-bold px-2 py-1 rounded-full">
            #{item.rank}
          </span>
          {item.property_type && (
            <span className="absolute bottom-2 left-2 bg-gray-800/70 text-white text-xs px-2 py-1 rounded">
              {item.property_type}
            </span>
          )}
        </div>
      </Link>
      <div className="p-4">
        <Link to={`/properties/${item.property_id}`}>
          <h3 className="font-semibold text-gray-900 text-base mb-1 line-clamp-2 hover:text-primary-600 transition-colors">
            {item.title}
          </h3>
        </Link>
        <p className="text-sm text-gray-500 mb-2 line-clamp-1">
          {item.address}
          {item.suburb && `, ${item.suburb}`}
        </p>
        <p className="text-lg font-bold text-primary-600 mb-2">
          {item.price ? formatPrice(item.price) : "Liên hệ"}
        </p>

        {/* Property stats */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
          {item.rooms != null && (
            <span className="flex items-center gap-1">🛏️ {item.rooms}</span>
          )}
          {item.bathrooms != null && (
            <span className="flex items-center gap-1">🚿 {item.bathrooms}</span>
          )}
          {item.cars != null && (
            <span className="flex items-center gap-1">🚗 {item.cars}</span>
          )}
        </div>

        {/* DSS score and badge */}
        <div className="flex items-center justify-between mb-2">
          <RecommendationBadge
            label={item.recommendation_label}
            score={item.final_score}
            size="sm"
          />
          <div className="text-right">
            <div className="text-sm font-bold text-primary-600">{item.final_score.toFixed(1)}</div>
            <div className="text-xs text-gray-400">DSS</div>
          </div>
        </div>

        {/* Short explanation */}
        {item.explanation_summary_short && (
          <DSSExplanationBlock explanation={item.explanation_summary_short} compact />
        )}

        <Link
          to={`/properties/${item.property_id}`}
          className="mt-3 inline-block text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Xem chi tiết →
        </Link>
      </div>
    </div>
  );
}
