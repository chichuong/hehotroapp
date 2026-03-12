import { Link } from "react-router-dom";
import ComparisonTable from "../components/ComparisonTable";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import { useCompare } from "../context/CompareContext";

export default function ComparePage() {
  const { items, loading, maxItems, removeFromCompare } = useCompare();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="mb-6 text-sm text-gray-500">
        <Link to="/" className="hover:text-primary-600">Trang chủ</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">So sánh bất động sản</span>
      </nav>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">So sánh bất động sản</h1>
          <p className="mt-2 text-gray-500">
            So sánh tối đa {maxItems} bất động sản theo các tiêu chí quan trọng để ra quyết định nhanh hơn.
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <EmptyState
          title="Danh sách so sánh đang trống"
          message="Hãy thêm từ 2 đến 4 bất động sản từ danh sách hoặc trang chi tiết để xem so sánh song song."
          actionLabel="Khám phá bất động sản"
          actionHref="/properties"
        />
      ) : (
        <>
          <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            Bạn đang so sánh <strong>{items.length}</strong> bất động sản. Các chỉ số AHP, định giá AI và DSS sẽ giúp bạn nhìn rõ ưu và nhược điểm của từng lựa chọn.
          </div>
          <ComparisonTable items={items} onRemove={removeFromCompare} />
        </>
      )}
    </div>
  );
}