import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { dssApi } from "../api/dss";
import { propertyApi } from "../api/properties";
import type { RankingResponse, RankedPropertyItem } from "../types";
import { formatPrice } from "../utils/format";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";

const LABEL_COLORS: Record<string, string> = {
  "Ưu tiên xem": "bg-green-100 text-green-800 border-green-200",
  "Đáng cân nhắc": "bg-blue-100 text-blue-800 border-blue-200",
  "Theo dõi thêm": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Không phù hợp": "bg-gray-100 text-gray-600 border-gray-200",
};

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suburb, setSuburb] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [limit, setLimit] = useState(20);
  const [suburbs, setSuburbs] = useState<string[]>([]);

  useEffect(() => {
    propertyApi.getSuburbs().then(setSuburbs).catch(() => {});
  }, []);

  const loadRanking = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { limit };
      if (suburb) params.suburb = suburb;
      if (minPrice) params.min_price = Number(minPrice);
      if (maxPrice) params.max_price = Number(maxPrice);
      const data = await dssApi.getRanking(params as {
        limit?: number;
        suburb?: string;
        min_price?: number;
        max_price?: number;
      });
      setRanking(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { status?: number } })?.response?.status === 404
          ? "Bạn chưa thiết lập ma trận AHP. Vui lòng thiết lập trước khi xem gợi ý."
          : "Không thể tải danh sách gợi ý. Vui lòng thử lại.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRanking();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Gợi ý bất động sản theo nhu cầu của bạn
        </h1>
        <p className="text-gray-600">
          Danh sách bất động sản được xếp hạng dựa trên trọng số AHP cá nhân
          của bạn.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Khu vực
            </label>
            <select
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Tất cả</option>
              {suburbs.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Giá tối thiểu
            </label>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Giá tối đa
            </label>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Không giới hạn"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số kết quả
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={loadRanking}
              disabled={loading}
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Đang tải..." : "Xem gợi ý"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} />
          {error.includes("AHP") && (
            <div className="mt-3 text-center">
              <Link
                to="/dss/ahp"
                className="inline-block bg-primary-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                Thiết lập AHP ngay
              </Link>
            </div>
          )}
        </div>
      )}

      {loading && <LoadingSpinner />}

      {!loading && !error && ranking && ranking.items.length === 0 && (
        <EmptyState message="Không tìm thấy bất động sản phù hợp với bộ lọc hiện tại." />
      )}

      {!loading && !error && ranking && ranking.items.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Hiển thị {ranking.items.length} / {ranking.total} kết quả
          </p>
          {ranking.items.map((item) => (
            <RankingCard key={item.property_id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function RankingCard({ item }: { item: RankedPropertyItem }) {
  const colorClass =
    LABEL_COLORS[item.summary_label] || LABEL_COLORS["Không phù hợp"];

  return (
    <Link
      to={`/properties/${item.property_id}`}
      className="block bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Rank badge */}
        <div className="sm:w-16 flex-shrink-0 flex sm:flex-col items-center justify-center bg-gray-50 p-3 sm:py-4">
          <span className="text-2xl font-bold text-primary-600">
            #{item.rank}
          </span>
        </div>

        {/* Image */}
        <div className="sm:w-48 flex-shrink-0">
          <img
            src={item.primary_image || "https://placehold.co/300x200?text=BĐS"}
            alt={item.title}
            className="w-full h-36 sm:h-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 line-clamp-1">
                {item.title}
              </h3>
              <span
                className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${colorClass}`}
              >
                {item.summary_label}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-2">
              {item.address}
              {item.suburb && ` · ${item.suburb}`}
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              {item.price != null && (
                <span className="font-medium text-primary-700">
                  {formatPrice(item.price)}
                </span>
              )}
              {item.rooms != null && <span>🏠 {item.rooms} phòng</span>}
              {item.bathrooms != null && (
                <span>🚿 {item.bathrooms} phòng tắm</span>
              )}
              {item.cars != null && <span>🚗 {item.cars} chỗ đậu xe</span>}
              {item.property_type && (
                <span className="text-gray-400">· {item.property_type}</span>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-gray-500">Điểm AHP:</span>
            <div className="flex-1 bg-gray-100 rounded-full h-3 max-w-xs">
              <div
                className="bg-primary-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(item.ahp_score * 100, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {(item.ahp_score * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
