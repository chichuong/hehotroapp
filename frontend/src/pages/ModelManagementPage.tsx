import { useState, useEffect } from "react";
import { aiApi } from "../api/ai";
import type { ModelVersion } from "../types";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import ModelListTable from "../components/ModelListTable";
import { useAuth } from "../context/AuthContext";
import EmptyState from "../components/EmptyState";

export default function ModelManagementPage() {
  const { user } = useAuth();
  const [models, setModels] = useState<ModelVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState<number | null>(null);
  const [training, setTraining] = useState(false);
  const [trainMessage, setTrainMessage] = useState<string | null>(null);

  const loadModels = () => {
    setLoading(true);
    aiApi
      .listModels()
      .then((data) => {
        setModels(data.models);
        setError(null);
      })
      .catch(() => setError("Không thể tải danh sách mô hình."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadModels();
  }, []);

  const handleActivate = async (modelId: number) => {
    setActivating(modelId);
    try {
      await aiApi.activateModel(modelId);
      loadModels();
    } catch {
      setError("Không thể kích hoạt mô hình.");
    } finally {
      setActivating(null);
    }
  };

  const handleTrain = async () => {
    setTraining(true);
    setTrainMessage(null);
    setError(null);
    try {
      const result = await aiApi.train({ n_estimators: 100, test_size: 0.2 });
      setTrainMessage(
        `${result.message} — MAE: $${result.metrics.mae?.toLocaleString("vi-VN")}, R²: ${result.metrics.r2?.toFixed(4)}`
      );
      loadModels();
    } catch {
      setError("Lỗi trong quá trình huấn luyện mô hình.");
    } finally {
      setTraining(false);
    }
  };

  const activeModel = models.find((m) => m.is_active);

  if (user?.role !== "admin") {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          title="Khu vực quản trị mô hình"
          message="Trang này dành cho tài khoản quản trị viên để theo dõi và vận hành mô hình AI."
          actionLabel="Quay về trang chủ"
          actionHref="/"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🤖 Mô hình AI</h1>
        <p className="text-gray-500 mt-2">
          Quản lý các mô hình học máy cho định giá bất động sản.
        </p>
      </div>

      {/* Active Model Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          Mô hình đang hoạt động
        </h2>
        {activeModel ? (
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              ✅ {activeModel.model_name} v{activeModel.version}
            </span>
            <span className="text-sm text-gray-500">
              Thuật toán: {activeModel.algorithm}
            </span>
            {activeModel.metrics && (
              <>
                <span className="text-sm text-gray-500">
                  R²: {activeModel.metrics.r2?.toFixed(4)}
                </span>
                <span className="text-sm text-gray-500">
                  MAE: ${activeModel.metrics.mae?.toLocaleString("vi-VN")}
                </span>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Chưa có mô hình nào được kích hoạt. Hãy huấn luyện mô hình mới.
          </p>
        )}
      </div>

      {/* Train Action */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          Huấn luyện mô hình
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Huấn luyện mô hình Random Forest mới từ dữ liệu bất động sản Melbourne.
          Mô hình mới sẽ được tự động kích hoạt sau khi huấn luyện xong.
        </p>
        <button
          onClick={handleTrain}
          disabled={training}
          className="bg-primary-600 text-white px-6 py-2.5 rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {training ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Đang huấn luyện...
            </span>
          ) : (
            "🚀 Huấn luyện mô hình mới"
          )}
        </button>
        {trainMessage && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            ✅ {trainMessage}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Model List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Danh sách mô hình
        </h2>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <ModelListTable
            models={models}
            onActivate={handleActivate}
            activating={activating}
          />
        )}
      </div>

      {/* Disclaimer */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
        <p className="text-xs text-yellow-700">
          ⚠️ <strong>Lưu ý:</strong> Các mô hình AI dự đoán giá dựa trên dữ liệu
          lịch sử và chỉ mang tính tham khảo. Kết quả không phải là định giá
          chính thức và không nên được sử dụng cho quyết định tài chính quan trọng.
        </p>
      </div>
    </div>
  );
}
