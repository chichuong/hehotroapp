import { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { propertyApi } from "../api/properties";
import type { PropertyMapItem, PropertyFilters } from "../types";
import { formatPrice } from "../utils/format";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

// Fix default marker icons for Leaflet + bundler
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const MELBOURNE_CENTER: [number, number] = [-37.8136, 144.9631];

export default function MapPage() {
  const [markers, setMarkers] = useState<PropertyMapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [suburb, setSuburb] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [suburbs, setSuburbs] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([propertyApi.getSuburbs(), propertyApi.getTypes()])
      .then(([s, t]) => {
        setSuburbs(s);
        setTypes(t);
      })
      .catch(() => {});
  }, []);

  const fetchMapData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: PropertyFilters = { view: "map" };
      if (search) filters.search = search;
      if (suburb) filters.suburb = suburb;
      if (minPrice) filters.min_price = Number(minPrice);
      if (maxPrice) filters.max_price = Number(maxPrice);
      if (propertyType) filters.property_type = propertyType;

      const res = await propertyApi.listMap(filters);
      setMarkers(res.items);
      setTotal(res.total);
    } catch {
      setError("Không thể tải dữ liệu bản đồ.");
    } finally {
      setLoading(false);
    }
  }, [search, suburb, minPrice, maxPrice, propertyType]);

  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Filter bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm..."
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <select
            value={suburb}
            onChange={(e) => setSuburb(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Tất cả khu vực</option>
            {suburbs.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Tất cả loại</option>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Giá từ"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Giá đến"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <span className="text-sm text-gray-500">
            {total.toLocaleString("vi-VN")} bất động sản
          </span>
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-[1000] bg-white/75 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        )}
        {error ? (
          <div className="flex items-center justify-center h-full">
            <ErrorMessage message={error} />
          </div>
        ) : (
          <MapContainer
            center={MELBOURNE_CENTER}
            zoom={11}
            className="w-full h-full"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {markers.map((m) => (
              <Marker key={m.id} position={[m.latitude, m.longitude]}>
                <Popup>
                  <div className="w-56">
                    <img
                      src={m.primary_image || ""}
                      alt={m.title}
                      className="w-full h-28 object-cover rounded mb-2"
                    />
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                      {m.title}
                    </h3>
                    <p className="text-xs text-gray-500 mb-1">{m.address}</p>
                    <p className="font-bold text-primary-600 text-sm mb-2">
                      {m.price ? formatPrice(m.price) : "Liên hệ"}
                    </p>
                    <Link
                      to={`/properties/${m.id}`}
                      className="text-xs text-primary-600 hover:underline font-medium"
                    >
                      Xem chi tiết →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
