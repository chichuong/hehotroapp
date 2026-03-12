import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Hệ thống Hỗ trợ Ra quyết định
              <br />
              Bất động sản Thông minh
            </h1>
            <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
              Tìm kiếm, đánh giá và so sánh bất động sản dễ dàng với dữ liệu
              thực từ thị trường Melbourne. Hỗ trợ bạn đưa ra quyết định đầu tư
              sáng suốt.
            </p>
            <Link
              to="/properties"
              className="inline-block bg-white text-primary-700 font-semibold px-8 py-3 rounded-lg hover:bg-primary-50 transition-colors text-lg"
            >
              Xem danh sách bất động sản
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Tính năng nổi bật
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold mb-2">Tìm kiếm nâng cao</h3>
            <p className="text-gray-600">
              Lọc theo khu vực, giá, loại hình, số phòng, phòng tắm, chỗ đậu xe và sắp xếp kết quả.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="text-lg font-semibold mb-2">Bản đồ tương tác</h3>
            <p className="text-gray-600">
              Xem bất động sản trên bản đồ, dễ dàng tìm kiếm theo vị trí địa lý.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
            <div className="text-4xl mb-4">❤️</div>
            <h3 className="text-lg font-semibold mb-2">Lưu yêu thích</h3>
            <p className="text-gray-600">
              Đánh dấu và quản lý danh sách bất động sản yêu thích cá nhân.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Bắt đầu khám phá ngay hôm nay
          </h2>
          <p className="text-gray-600 mb-8">
            Đăng ký tài khoản miễn phí để trải nghiệm đầy đủ các tính năng.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/register"
              className="bg-primary-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Đăng ký miễn phí
            </Link>
            <Link
              to="/properties"
              className="bg-white text-primary-600 font-semibold px-6 py-3 rounded-lg border border-primary-600 hover:bg-primary-50 transition-colors"
            >
              Xem bất động sản
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
