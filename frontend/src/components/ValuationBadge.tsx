interface ValuationBadgeProps {
  label: string;
  gapPercent?: number | null;
  size?: "sm" | "md";
}

const BADGE_COLORS: Record<string, string> = {
  "Định giá thấp": "bg-green-100 text-green-800 border-green-200",
  "Định giá hợp lý": "bg-blue-100 text-blue-800 border-blue-200",
  "Định giá cao": "bg-red-100 text-red-800 border-red-200",
};

export default function ValuationBadge({
  label,
  gapPercent,
  size = "sm",
}: ValuationBadgeProps) {
  const colorClass =
    BADGE_COLORS[label] || "bg-gray-100 text-gray-600 border-gray-200";
  const sizeClass =
    size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${colorClass} ${sizeClass}`}
      title={
        gapPercent != null
          ? `Chênh lệch: ${gapPercent > 0 ? "+" : ""}${gapPercent.toFixed(1)}%`
          : label
      }
    >
      {label === "Định giá thấp" && "🟢 "}
      {label === "Định giá hợp lý" && "🔵 "}
      {label === "Định giá cao" && "🔴 "}
      {label}
      {gapPercent != null && (
        <span className="opacity-70">
          ({gapPercent > 0 ? "+" : ""}
          {gapPercent.toFixed(1)}%)
        </span>
      )}
    </span>
  );
}
