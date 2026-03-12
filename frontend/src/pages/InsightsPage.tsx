import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { insightsApi } from "../api/insights";
import DashboardStatCard from "../components/DashboardStatCard";
import ErrorMessage from "../components/ErrorMessage";
import LoadingSpinner from "../components/LoadingSpinner";
import SimpleBarChart from "../components/SimpleBarChart";
import type { MarketOverviewResponse, PriceDistributionResponse, SuburbInsightItem } from "../types";
import { formatPrice } from "../utils/format";

export default function InsightsPage() {
  const [overview, setOverview] = useState<MarketOverviewResponse | null>(null);
  const [suburbs, setSuburbs] = useState<SuburbInsightItem[]>([]);
  const [distribution, setDistribution] = useState<PriceDistributionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      insightsApi.getMarketOverview(),
      insightsApi.getSuburbs(),
      insightsApi.getPriceDistribution(),
    ])
      .then(([overviewData, suburbData, distributionData]) => {
        setOverview(overviewData);
        setSuburbs(suburbData);
        setDistribution(distributionData);
        setError(null);
      })
      .catch(() => setError("Không thể tải dữ liệu phân tích thị trường."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!overview || !distribution) return <ErrorMessage message="Không có dữ liệu phân tích thị trường." />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="mb-6 text-sm text-gray-500">
        <Link to="/" className="hover:text-primary-600">Trang chủ</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Phân tích thị trường</span>
      </nav>

      <div className="mb-8 rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">Phân tích thị trường</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">{overview.note}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard label="Tổng bất động sản" value={overview.total_properties.toLocaleString("vi-VN")} />
        <DashboardStatCard label="Giá trung bình" value={overview.average_price != null ? formatPrice(overview.average_price) : "--"} />
        <DashboardStatCard label="Giá thấp nhất" value={overview.min_price != null ? formatPrice(overview.min_price) : "--"} />
        <DashboardStatCard label="Giá cao nhất" value={overview.max_price != null ? formatPrice(overview.max_price) : "--"} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <SimpleBarChart
          title="Số lượng bất động sản theo loại"
          items={overview.property_type_distribution.map((item) => ({ label: item.property_type, value: item.count }))}
          emptyMessage="Chưa có dữ liệu loại hình bất động sản."
        />
        <SimpleBarChart
          title="Phân bố mức giá"
          items={distribution.buckets.map((bucket) => ({ label: bucket.label, value: bucket.count }))}
          emptyMessage="Chưa có dữ liệu phân bố giá."
        />
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-900">Giá trung bình theo khu vực</h2>
          <span className="text-xs text-gray-500">Dữ liệu dựa trên dataset hiện có</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-3 pr-4">Khu vực</th>
                <th className="py-3 pr-4">Số lượng</th>
                <th className="py-3 pr-4">Giá trung bình</th>
                <th className="py-3 pr-4">Khoảng giá</th>
                <th className="py-3 pr-4">Trung bình phòng / tắm / xe</th>
              </tr>
            </thead>
            <tbody>
              {suburbs.slice(0, 12).map((item) => (
                <tr key={item.suburb} className="border-b border-gray-100 text-gray-700">
                  <td className="py-3 pr-4 font-medium text-gray-900">{item.suburb}</td>
                  <td className="py-3 pr-4">{item.property_count}</td>
                  <td className="py-3 pr-4">{item.average_price != null ? formatPrice(item.average_price) : "--"}</td>
                  <td className="py-3 pr-4">
                    {item.min_price != null && item.max_price != null
                      ? `${formatPrice(item.min_price)} - ${formatPrice(item.max_price)}`
                      : "--"}
                  </td>
                  <td className="py-3 pr-4">
                    {(item.average_rooms ?? 0).toFixed(1)} / {(item.average_bathrooms ?? 0).toFixed(1)} / {(item.average_cars ?? 0).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}