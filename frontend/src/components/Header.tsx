import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCompare } from "../context/CompareContext";

export default function Header() {
  const { user, logout } = useAuth();
  const { items } = useCompare();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🏠</span>
            <span className="text-xl font-bold text-primary-700">
              BĐS Thông Minh
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
            >
              Trang chủ
            </Link>
            <Link
              to="/properties"
              className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
            >
              Bất động sản
            </Link>
            <Link
              to="/map"
              className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
            >
              🗺️ Bản đồ
            </Link>
            <Link
              to="/insights"
              className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
            >
              📈 Phân tích thị trường
            </Link>
            {user && (
              <Link
                to="/favorites"
                className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
              >
                ❤️ Yêu thích
              </Link>
            )}
            {user && (
              <Link
                to="/compare"
                className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
              >
                🔍 So sánh {items.length > 0 ? `(${items.length})` : ""}
              </Link>
            )}
            {user && (
              <Link
                to="/dashboard"
                className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
              >
                📌 Tổng quan cá nhân
              </Link>
            )}
            {user && (
              <Link
                to="/dss/profile"
                className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
              >
                🎯 Hồ sơ nhu cầu
              </Link>
            )}
            {user && (
              <Link
                to="/dss/ahp"
                className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
              >
                ⚖️ Thiết lập ưu tiên
              </Link>
            )}
            {user && (
              <Link
                to="/dss/ranking"
                className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
              >
                📊 Xếp hạng AHP
              </Link>
            )}
            {user && (
              <Link
                to="/dss/recommendations"
                className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
              >
                🎯 Gợi ý DSS
              </Link>
            )}
            {user?.role === "admin" && (
              <>
                <Link
                  to="/admin/overview"
                  className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
                >
                  🛠️ Quản trị hệ thống
                </Link>
                <Link
                  to="/admin/models"
                  className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
                >
                  🤖 Mô hình AI
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700">
                  Xin chào, <strong>{user.full_name}</strong>
                </span>
                <button
                  onClick={logout}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="text-sm bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
