import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCompare } from "../context/CompareContext";

interface CompareButtonProps {
  propertyId: number;
  compact?: boolean;
}

export default function CompareButton({ propertyId, compact = false }: CompareButtonProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isCompared, toggleCompare } = useCompare();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = isCompared(propertyId);

  const handleClick = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setWorking(true);
    setError(null);
    const result = await toggleCompare(propertyId);
    if (result.error) {
      setError(result.error);
    }
    setWorking(false);
  };

  return (
    <div className={compact ? "text-right" : ""}>
      <button
        type="button"
        onClick={handleClick}
        disabled={working}
        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          selected
            ? "border-primary-600 bg-primary-50 text-primary-700"
            : "border-gray-300 bg-white text-gray-700 hover:border-primary-500 hover:text-primary-700"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {working ? "Đang cập nhật..." : selected ? "Đã thêm so sánh" : "So sánh"}
      </button>
      {error && !compact && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}