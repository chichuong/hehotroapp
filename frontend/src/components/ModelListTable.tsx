import type { ModelVersion } from "../types";

interface ModelMetricsDisplayProps {
  metrics: Record<string, number> | null;
}

export function ModelMetricsDisplay({ metrics }: ModelMetricsDisplayProps) {
  if (!metrics) return <span className="text-gray-400">—</span>;

  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {metrics.mae != null && (
        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
          MAE: ${metrics.mae.toLocaleString("vi-VN")}
        </span>
      )}
      {metrics.rmse != null && (
        <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded">
          RMSE: ${metrics.rmse.toLocaleString("vi-VN")}
        </span>
      )}
      {metrics.r2 != null && (
        <span className="bg-green-50 text-green-700 px-2 py-1 rounded">
          R²: {metrics.r2.toFixed(4)}
        </span>
      )}
      {metrics.n_train != null && (
        <span className="bg-gray-50 text-gray-600 px-2 py-1 rounded">
          Train: {metrics.n_train.toLocaleString("vi-VN")}
        </span>
      )}
    </div>
  );
}

interface ModelListTableProps {
  models: ModelVersion[];
  onActivate: (id: number) => void;
  activating: number | null;
}

export default function ModelListTable({
  models,
  onActivate,
  activating,
}: ModelListTableProps) {
  if (models.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Chưa có mô hình nào được huấn luyện.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tên mô hình
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Phiên bản
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Thuật toán
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Chỉ số đánh giá
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Trạng thái
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ngày tạo
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hành động
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {models.map((m) => (
            <tr
              key={m.id}
              className={m.is_active ? "bg-green-50" : ""}
            >
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {m.id}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {m.model_name}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {m.version}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {m.algorithm}
              </td>
              <td className="px-4 py-3 text-sm">
                <ModelMetricsDisplay metrics={m.metrics} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                {m.is_active ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✅ Đang hoạt động
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Không hoạt động
                  </span>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {m.created_at
                  ? new Date(m.created_at).toLocaleDateString("vi-VN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                {!m.is_active && (
                  <button
                    onClick={() => onActivate(m.id)}
                    disabled={activating === m.id}
                    className="text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                  >
                    {activating === m.id
                      ? "Đang kích hoạt..."
                      : "Kích hoạt"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
