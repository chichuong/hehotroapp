import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../api/admin";
import AdminSummaryCard from "../components/AdminSummaryCard";
import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import type {
  AdminDataStatusResponse,
  AdminModelStatusResponse,
  AdminSystemSummaryResponse,
} from "../types";

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const [modelStatus, setModelStatus] = useState<AdminModelStatusResponse | null>(null);
  const [dataStatus, setDataStatus] = useState<AdminDataStatusResponse | null>(null);
  const [systemSummary, setSystemSummary] = useState<AdminSystemSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "admin") {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      adminApi.getModelStatus(),
      adminApi.getDataStatus(),
      adminApi.getSystemSummary(),
    ])
      .then(([modelData, dataData, systemData]) => {
        setModelStatus(modelData);
        setDataStatus(dataData);
        setSystemSummary(systemData);
        setError(null);
      })
      .catch(() => setError("Không thể tải tổng quan quản trị."))
      .finally(() => setLoading(false));
  }, [user]);

  if (user?.role !== "admin") {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          title="Khu vực quản trị"
          message="Trang này chỉ hiển thị cho tài khoản quản trị viên để theo dõi dữ liệu và tình trạng mô hình."
          actionLabel="Quay lại trang chủ"
          actionHref="/"
        />
      </div>
    );
  }
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!modelStatus || !dataStatus || !systemSummary) return <ErrorMessage message="Không có dữ liệu quản trị." />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="mb-6 text-sm text-gray-500">
        <Link to="/" className="hover:text-primary-600">Trang chủ</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Tổng quan quản trị</span>
      </nav>

      <div className="mb-8 rounded-[28px] border border-gray-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Tổng quan quản trị</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">{systemSummary.note}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminSummaryCard label="Tài khoản người dùng" value={systemSummary.user_count.toLocaleString("vi-VN")} description={`Quản trị viên: ${systemSummary.admin_count}`} />
        <AdminSummaryCard label="Dữ liệu bất động sản" value={dataStatus.property_count.toLocaleString("vi-VN")} description={`Thiếu tọa độ: ${dataStatus.missing_coordinate_count}`} />
        <AdminSummaryCard label="Bao phủ định giá" value={dataStatus.valuation_coverage_count.toLocaleString("vi-VN")} description="Số bất động sản đã có định giá AI" />
        <AdminSummaryCard label="Bao phủ DSS" value={dataStatus.dss_score_coverage_count.toLocaleString("vi-VN")} description="Số bất động sản đã có điểm DSS" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">Tình trạng mô hình</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="font-semibold text-gray-900">Mô hình đang hoạt động</div>
              <div className="mt-2">
                {modelStatus.active_model
                  ? `${modelStatus.active_model.model_name} v${modelStatus.active_model.version} (${modelStatus.active_model.algorithm})`
                  : "Chưa có mô hình đang hoạt động"}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">Tổng số mô hình đã lưu: <strong>{modelStatus.total_models}</strong></div>
            <div className="rounded-xl bg-slate-50 p-4">{modelStatus.message}</div>
            {modelStatus.active_model?.metrics && (
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="font-semibold text-gray-900">Chỉ số mô hình</div>
                <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-gray-600">
                  {Object.entries(modelStatus.active_model.metrics).map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                      {key}: <strong>{typeof value === "number" ? value.toFixed(4) : String(value)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">Thông tin tổng quan hệ thống</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <div className="rounded-xl bg-slate-50 p-4">Số mục yêu thích: <strong>{systemSummary.favorites_count}</strong></div>
            <div className="rounded-xl bg-slate-50 p-4">Số mục đang so sánh: <strong>{systemSummary.comparison_item_count}</strong></div>
            <div className="rounded-xl bg-slate-50 p-4">Thiếu thuộc tính quan trọng: <strong>{dataStatus.missing_key_feature_count}</strong></div>
            <div className="rounded-xl bg-slate-50 p-4">Mô hình hiện tại: <strong>{systemSummary.active_model_name || "Chưa có"}</strong></div>
            <Link to="/admin/models" className="inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700">
              Mở quản lý mô hình AI
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}