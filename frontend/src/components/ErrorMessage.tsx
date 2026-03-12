interface ErrorMessageProps {
  message?: string;
}

export default function ErrorMessage({
  message = "Đã xảy ra lỗi. Vui lòng thử lại sau.",
}: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center py-12">
      <div className="text-red-500 text-5xl mb-4">⚠️</div>
      <p className="text-gray-600 text-lg">{message}</p>
    </div>
  );
}
