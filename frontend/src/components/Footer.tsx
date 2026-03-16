export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-semibold text-lg mb-3">
            BĐS Thông Minh
            </h3>
            <p className="text-sm">
              Hệ thống hỗ trợ ra quyết định bất động sản thông minh. Giúp bạn
              tìm kiếm, đánh giá và so sánh bất động sản dễ dàng.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Liên kết</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/" className="hover:text-white transition-colors">
                  Trang chủ
                </a>
              </li>
              <li>
                <a
                  href="/properties"
                  className="hover:text-white transition-colors"
                >
                  Danh sách bất động sản
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Liên hệ</h4>
            <ul className="space-y-2 text-sm">
              <li>Email: info@bdsthongminh.vn</li>
              <li>Điện thoại: (028) 1234 5678</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm">
          © 2026 BĐS Thông Minh. Tất cả quyền được bảo lưu.
        </div>
      </div>
    </footer>
  );
}
