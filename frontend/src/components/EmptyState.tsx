import { Link } from "react-router-dom";

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({
  title = "Chưa có dữ liệu",
  message = "Không có dữ liệu để hiển thị.",
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <div className="text-gray-400 text-5xl mb-4">📭</div>
      <h3 className="mb-2 text-xl font-semibold text-gray-900">{title}</h3>
      <p className="max-w-2xl text-lg text-gray-500">{message}</p>
      {actionLabel && actionHref && (
        <Link
          to={actionHref}
          className="mt-5 inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
