import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCompare } from "../context/CompareContext";

export default function Header() {
  const { user, logout } = useAuth();
  const { items } = useCompare();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems: Array<{ to: string; label: string }> = [
    { to: "/", label: "Trang chủ" },
    { to: "/properties", label: "Bất động sản" },
    { to: "/map", label: "Bản đồ" },
    { to: "/insights", label: "Phân tích thị trường" },
    ...(user ? [{ to: "/favorites", label: "Yêu thích" }] : []),
    ...(user
      ? [{ to: "/compare", label: `So sánh${items.length > 0 ? ` (${items.length})` : ""}` }]
      : []),
    ...(user ? [{ to: "/dashboard", label: "Tổng quan cá nhân" }] : []),
    ...(user ? [{ to: "/dss/profile", label: "Hồ sơ nhu cầu" }] : []),
    ...(user ? [{ to: "/dss/ahp", label: "Thiết lập ưu tiên" }] : []),
    ...(user ? [{ to: "/dss/ranking", label: "Xếp hạng AHP" }] : []),
    ...(user ? [{ to: "/dss/recommendations", label: "Gợi ý DSS" }] : []),
    ...(user?.role === "admin" ? [{ to: "/admin/overview", label: "Quản trị hệ thống" }] : []),
    ...(user?.role === "admin" ? [{ to: "/admin/models", label: "Mô hình AI" }] : []),
  ];

  const navItemClass =
    "text-[15px] font-medium leading-none whitespace-nowrap text-gray-600 hover:text-primary-600 hover:underline underline-offset-4 transition-colors";

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-4">
          <div className="shrink-0">
            <Link to="/" className="flex items-center">
              <span className="text-lg font-semibold text-primary-700 leading-none whitespace-nowrap">
                BĐS Thông Minh
              </span>
            </Link>
          </div>

          <nav className="hidden xl:flex flex-1 items-center justify-center gap-4 2xl:gap-6 px-6">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to} className={navItemClass}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex xl:hidden flex-1 justify-center">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="text-[15px] font-medium leading-none whitespace-nowrap text-gray-700 hover:text-primary-600 transition-colors"
            >
              {menuOpen ? "Đóng menu" : "Xem thêm"}
            </button>
          </div>

          <div className="shrink-0 flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-[15px] font-medium leading-none whitespace-nowrap text-gray-700">
                  Xin chào, <strong>{user.full_name}</strong>
                </span>
                <button
                  onClick={logout}
                  className="text-[15px] font-medium leading-none whitespace-nowrap text-red-600 hover:text-red-700 hover:underline underline-offset-4"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-[15px] font-medium leading-none whitespace-nowrap text-primary-600 hover:text-primary-700 hover:underline underline-offset-4"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="text-[15px] font-medium leading-none whitespace-nowrap bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="xl:hidden border-t border-gray-100 bg-white px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={navItemClass}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
