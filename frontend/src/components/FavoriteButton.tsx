import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { favoritesApi } from "../api/favorites";

interface FavoriteButtonProps {
  propertyId: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function FavoriteButton({
  propertyId,
  className = "",
  size = "md",
}: FavoriteButtonProps) {
  const { isAuthenticated, initialized } = useAuth();
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialized || !isAuthenticated) {
      setFavorited(false);
      return;
    }

    favoritesApi
      .check(propertyId)
      .then((res) => setFavorited(res.favorited))
      .catch(() => {});
  }, [initialized, isAuthenticated, propertyId]);

  if (!initialized || !isAuthenticated) return null;

  const sizeClasses = {
    sm: "w-8 h-8 text-lg",
    md: "w-10 h-10 text-xl",
    lg: "w-12 h-12 text-2xl",
  };

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      if (favorited) {
        await favoritesApi.remove(propertyId);
        setFavorited(false);
      } else {
        await favoritesApi.add(propertyId);
        setFavorited(true);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={favorited ? "Bỏ yêu thích" : "Thêm yêu thích"}
      className={`inline-flex items-center justify-center rounded-full transition-all duration-200 ${
        favorited
          ? "bg-red-50 text-red-500 hover:bg-red-100"
          : "bg-white/80 text-gray-400 hover:text-red-500 hover:bg-white"
      } ${sizeClasses[size]} ${loading ? "opacity-50" : ""} ${className}`}
    >
      {favorited ? "❤️" : "🤍"}
    </button>
  );
}
