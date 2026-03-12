import { useState, useEffect, useCallback } from "react";
import { propertyApi } from "../api/properties";
import { useAuth } from "../context/AuthContext";
import type { PropertyListItem, PropertyFilters } from "../types";
import PropertyCard from "../components/PropertyCard";
import Pagination from "../components/Pagination";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";

const SORT_OPTIONS = [
  { value: "", label: "Mặc định" },
  { value: "price-asc", label: "Giá: Thấp → Cao" },
  { value: "price-desc", label: "Giá: Cao → Thấp" },
  { value: "rooms-desc", label: "Số phòng: Nhiều nhất" },
  { value: "year_built-desc", label: "Năm xây: Mới nhất" },
  { value: "created_at-desc", label: "Mới đăng" },
  { value: "suburb-asc", label: "Khu vực A-Z" },
];

export default function PropertyListPage() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [suburbs, setSuburbs] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);

  // Filter state
  const [search, setSearch] = useState("");
  const [suburb, setSuburb] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRooms, setMinRooms] = useState("");
  const [minBedrooms, setMinBedrooms] = useState("");
  const [minBathrooms, setMinBathrooms] = useState("");
  const [minCars, setMinCars] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [sortValue, setSortValue] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fetchProperties = useCallback(async (currentPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const filters: PropertyFilters = {
        page: currentPage,
        page_size: 12,
      };
      if (search) filters.search = search;
      if (suburb) filters.suburb = suburb;
      if (minPrice) filters.min_price = Number(minPrice);
      if (maxPrice) filters.max_price = Number(maxPrice);
      if (minRooms) filters.min_rooms = Number(minRooms);
      if (minBedrooms) filters.min_bedrooms = Number(minBedrooms);
      if (minBathrooms) filters.min_bathrooms = Number(minBathrooms);
      if (minCars) filters.min_cars = Number(minCars);
      if (propertyType) filters.property_type = propertyType;
      if (sortValue) {
        const [field, order] = sortValue.split("-");
        filters.sort_by = field;
        filters.sort_order = order as "asc" | "desc";
      }

      if (user) filters.include_fit = true;
      if (user) filters.include_dss = true;
      filters.include_valuation = true;

      const res = await propertyApi.list(filters);
      setProperties(res.items);
      setTotalPages(res.total_pages);
      setTotal(res.total);
    } catch {
      setError("Không thể tải danh sách bất động sản. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [search, suburb, minPrice, maxPrice, minRooms, minBedrooms, minBathrooms, minCars, propertyType, sortValue, user]);

  useEffect(() => {
    Promise.all([propertyApi.getSuburbs(), propertyApi.getTypes()])
      .then(([s, t]) => { setSuburbs(s); setTypes(t); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchProperties(page);
  }, [page, fetchProperties]);

  const handleFilter = () => {
    setPage(1);
    fetchProperties(1);
  };

  const handleReset = () => {
    setSearch("");
    setSuburb("");
    setMinPrice("");
    setMaxPrice("");
    setMinRooms("");
    setMinBedrooms("");
    setMinBathrooms("");
    setMinCars("");
    setPropertyType("");
    setSortValue("");
    setPage(1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleFilter();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Danh sách Bất động sản
      </h1>

      {/* Search + Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        {/* Search bar */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Tìm kiếm theo tên, địa chỉ, khu vực..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <button
            onClick={handleFilter}
            className="bg-primary-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            🔍 Tìm kiếm
          </button>
        </div>

        {/* Primary filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Khu vực</label>
            <select
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Tất cả khu vực</option>
              {suburbs.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại hình</label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Tất cả loại</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giá tối thiểu ($)</label>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="VD: 500000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giá tối đa ($)</label>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="VD: 2000000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Advanced filters toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          {showAdvanced ? "▲ Ẩn bộ lọc nâng cao" : "▼ Bộ lọc nâng cao"}
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số phòng tối thiểu</label>
              <select
                value={minRooms}
                onChange={(e) => setMinRooms(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Tất cả</option>
                {[1, 2, 3, 4, 5, 6].map((r) => <option key={r} value={r}>{r}+</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phòng ngủ tối thiểu</label>
              <select
                value={minBedrooms}
                onChange={(e) => setMinBedrooms(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Tất cả</option>
                {[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r}+</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phòng tắm tối thiểu</label>
              <select
                value={minBathrooms}
                onChange={(e) => setMinBathrooms(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Tất cả</option>
                {[1, 2, 3, 4].map((r) => <option key={r} value={r}>{r}+</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chỗ đậu xe tối thiểu</label>
              <select
                value={minCars}
                onChange={(e) => setMinCars(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Tất cả</option>
                {[1, 2, 3, 4].map((r) => <option key={r} value={r}>{r}+</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleFilter}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Áp dụng bộ lọc
          </button>
          <button
            onClick={handleReset}
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
          >
            Đặt lại
          </button>
        </div>
      </div>

      {/* Results header with sort */}
      {!loading && !error && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-sm text-gray-600">
            Tìm thấy <strong>{total.toLocaleString("vi-VN")}</strong> bất động sản
          </p>
          <select
            value={sortValue}
            onChange={(e) => { setSortValue(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : properties.length === 0 ? (
        <EmptyState message="Không tìm thấy bất động sản nào phù hợp với bộ lọc." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {properties.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
