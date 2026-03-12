import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { favoritesApi } from "../api/favorites";
import type { PropertyListItem } from "../types";
import PropertyCard from "../components/PropertyCard";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    favoritesApi
      .list()
      .then(setProperties)
      .catch(() => setError("Không thể tải danh sách yêu thích."))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-primary-600">Trang chủ</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Yêu thích</span>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        ❤️ Bất động sản yêu thích
      </h1>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : properties.length === 0 ? (
        <EmptyState message="Bạn chưa lưu bất động sản yêu thích nào. Hãy khám phá và nhấn ❤️ để lưu!" />
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-4">
            Bạn có <strong>{properties.length}</strong> bất động sản yêu thích
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {properties.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
