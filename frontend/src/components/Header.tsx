import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCompare } from "../context/CompareContext";

export default function Header() {
  const { user, logout } = useAuth();
  const { items } = useCompare();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const navItems: Array<{ to: string; label: string; icon?: string }> = [
    { to: "/", label: "Trang chủ", icon: "🏠" },
    { to: "/properties", label: "Bất động sản", icon: "🏢" },
    { to: "/map", label: "Bản đồ", icon: "🗺️" },
    { to: "/insights", label: "Phân tích thị trường", icon: "📈" },
    { to: "/chat", label: "Trợ lý AI", icon: "🤖" },
    ...(user ? [{ to: "/favorites", label: "Yêu thích", icon: "❤️" }] : []),
    ...(user
      ? [{ to: "/compare", label: `So sánh${items.length > 0 ? ` (${items.length})` : ""}`, icon: "⚖️" }]
      : []),
    ...(user ? [{ to: "/dashboard", label: "Tổng quan cá nhân", icon: "📊" }] : []),
    ...(user ? [{ to: "/dss/profile", label: "Hồ sơ nhu cầu", icon: "📝" }] : []),
    ...(user ? [{ to: "/dss/ahp", label: "Thiết lập ưu tiên", icon: "🎯" }] : []),
    ...(user ? [{ to: "/dss/ranking", label: "Xếp hạng AHP", icon: "🏆" }] : []),
    ...(user ? [{ to: "/dss/recommendations", label: "Gợi ý DSS", icon: "💡" }] : []),
    ...(user?.role === "admin" ? [{ to: "/admin/overview", label: "Quản trị hệ thống", icon: "⚙️" }] : []),
    ...(user?.role === "admin" ? [{ to: "/admin/models", label: "Mô hình AI", icon: "🧠" }] : []),
  ];

  return (
    <header className={`bg-white border-b xl:border-b-0 xl:border-r border-gray-200 transition-all duration-300 ${isCollapsed ? 'xl:w-20' : 'xl:w-64'} flex-shrink-0 xl:h-screen xl:sticky xl:top-0 z-40 flex flex-col shadow-sm relative`}>
      <button
        className="hidden xl:flex items-center justify-center w-6 h-6 text-gray-500 hover:text-blue-600 bg-white hover:bg-gray-50 rounded-full absolute -right-3 top-5 border border-gray-200 shadow-sm z-50 focus:outline-none"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Mở rộng" : "Thu gọn"}
      >
        {isCollapsed ? "❯" : "❮"}
      </button>

      <div className="h-16 flex items-center justify-between px-4 xl:px-4 border-b border-gray-100 flex-shrink-0">
        <Link to="/" className={`flex items-center gap-2 ${isCollapsed ? 'justify-center w-full' : ''}`}>
          <span className={`text-xl font-bold text-blue-600 truncate transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>BĐS Thông Minh</span>
          {isCollapsed && <span className="text-xl font-bold text-blue-600 absolute">BĐS</span>}
        </Link>
        <button
          className="xl:hidden p-2 text-gray-600 hover:text-blue-600 bg-gray-100 rounded-lg"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>

      <nav className={`${menuOpen ? 'block' : 'hidden'} xl:block flex-1 overflow-y-auto py-4 px-3 space-y-1`}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-blue-50 text-blue-700" 
                  : "text-gray-700 hover:bg-gray-100 hover:text-blue-600"
              }`}
            >
              <span className={`text-lg text-center ${isCollapsed ? '' : 'w-6'}`}>{item.icon}</span>
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={`${menuOpen ? 'block' : 'hidden'} xl:block p-4 border-t border-gray-200 flex-shrink-0 bg-gray-50`}>
        {user ? (
          <div className="flex flex-col gap-3">
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
              <div 
                className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold flex-shrink-0 cursor-help"
                title={isCollapsed ? user.full_name : undefined}
              >
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-gray-900 truncate">
                    {user.full_name}
                  </span>
                  <span className="text-xs text-gray-500 truncate">{user.role}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => { logout(); setMenuOpen(false); }}
              title={isCollapsed ? "Đăng xuất" : undefined}
              className={`w-full text-center text-sm text-red-600 hover:text-red-700 font-medium py-2 border border-red-200 hover:bg-red-50 rounded-lg transition-colors ${isCollapsed ? 'px-0 border-none bg-transparent hover:bg-gray-200 text-xl' : ''}`}
            >
              {isCollapsed ? "🚪" : "Đăng xuất"}
            </button>
          </div>
        ) : (
          <div className={`flex flex-col gap-2 ${isCollapsed ? 'items-center' : ''}`}>
            {isCollapsed ? (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} title="Đăng nhập" className="text-xl p-2 hover:bg-gray-200 rounded-lg">🔑</Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} title="Đăng ký" className="text-xl p-2 hover:bg-gray-200 rounded-lg">📝</Link>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="text-center text-sm font-medium text-blue-600 hover:text-blue-700 px-4 py-2 border border-blue-600 rounded-lg transition-colors">Đăng nhập</Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="text-center text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">Đăng ký</Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
