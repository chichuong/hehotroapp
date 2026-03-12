export default function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-12">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      <span className="ml-3 text-gray-600">Đang tải...</span>
    </div>
  );
}
