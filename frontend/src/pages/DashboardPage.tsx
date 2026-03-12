import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dashboardApi } from "../api/dashboard";
import DashboardStatCard from "../components/DashboardStatCard";
import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import LoadingSpinner from "../components/LoadingSpinner";
import SimpleBarChart from "../components/SimpleBarChart";
import type { UserDashboardInsightsResponse, UserDashboardSummaryResponse } from "../types";

export default function DashboardPage() {
  const [summary, setSummary] = useState<UserDashboardSummaryResponse | null>(null);
  const [insights, setInsights] = useState<UserDashboardInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([dashboardApi.getSummary(), dashboardApi.getInsights()])
      .then(([summaryData, insightsData]) => {
        setSummary(summaryData);
        setInsights(insightsData);
        setError(null);
      })
      .catch(() => setError("Không thể tải tổng quan cá nhân lúc này."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!summary || !insights) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState message="Chưa thể hiển thị dữ liệu tổng quan cá nhân." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="mb-6 text-sm text-gray-500">
        <Link to="/" className="hover:text-primary-600">Trang chủ</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Tổng quan cá nhân</span>
      </nav>

      <div className="mb-8 rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Tổng quan cá nhân</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">{summary.quick_summary}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard label="Bất động sản yêu thích" value={summary.favorites_count.toString()} hint="Các lựa chọn bạn đã lưu lại" />
        <DashboardStatCard label="Đang so sánh" value={summary.compared_count.toString()} hint="Danh sách so sánh hiện tại" />
        <DashboardStatCard label="Gợi ý đã đánh giá" value={summary.total_evaluated_recommendations.toString()} hint="Số kết quả DSS đã có" />
        <DashboardStatCard
          label="Điểm DSS trung bình của mục đã lưu"
          value={summary.average_saved_dss_score != null ? summary.average_saved_dss_score.toFixed(1) : "--"}
          hint="Trung bình theo danh sách yêu thích"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <SimpleBarChart
          title="Phân bố khuyến nghị"
          items={insights.recommendation_distribution.map((item) => ({ label: item.label, value: item.count }))}
          emptyMessage="Chưa có dữ liệu phân bố khuyến nghị."
        />

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Khu vực phù hợp nổi bật</h3>
          {summary.highlighted_suburbs.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-3">
              {summary.highlighted_suburbs.map((suburb) => (
                <span key={suburb} className="rounded-full bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700">
                  {suburb}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">Chưa đủ dữ liệu để xác định khu vực nổi bật.</p>
          )}
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-gray-600">
            {insights.summary_note}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Tóm tắt nhanh</h3>
          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
              <span>Điểm trung bình của mục đã lưu</span>
              <strong>{insights.saved_properties_average_score != null ? insights.saved_properties_average_score.toFixed(1) : "--"}</strong>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
              <span>Điểm trung bình của mục đang so sánh</span>
              <strong>{insights.compared_properties_average_score != null ? insights.compared_properties_average_score.toFixed(1) : "--"}</strong>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-4">
              <div className="font-medium text-gray-900">Khu vực phù hợp nổi bật theo điểm trung bình</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {insights.top_recommended_suburbs.length > 0 ? insights.top_recommended_suburbs.map((suburb) => (
                  <span key={suburb} className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
                    {suburb}
                  </span>
                )) : <span className="text-gray-500">Chưa có</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Hành động nên làm tiếp</h3>
          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <Link to="/compare" className="block rounded-xl border border-gray-200 px-4 py-3 transition-colors hover:border-primary-500 hover:bg-primary-50">
              Xem danh sách so sánh để đối chiếu các lựa chọn đang cân nhắc.
            </Link>
            <Link to="/dss/recommendations" className="block rounded-xl border border-gray-200 px-4 py-3 transition-colors hover:border-primary-500 hover:bg-primary-50">
              Mở trang gợi ý DSS để xem thêm các bất động sản phù hợp.
            </Link>
            <Link to="/insights" className="block rounded-xl border border-gray-200 px-4 py-3 transition-colors hover:border-primary-500 hover:bg-primary-50">
              Đối chiếu với bức tranh thị trường để kiểm tra mức giá và khu vực.
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}