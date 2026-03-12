interface FitBadgeProps {
  fitLabel: string;
  fitScore?: number;
  fitReason?: string;
  size?: "sm" | "md";
}

const BADGE_COLORS: Record<string, string> = {
  "Rất phù hợp": "bg-green-100 text-green-800 border-green-200",
  "Khá phù hợp": "bg-blue-100 text-blue-800 border-blue-200",
  "Cần cân nhắc thêm": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Ít phù hợp": "bg-gray-100 text-gray-600 border-gray-200",
};

export default function FitBadge({
  fitLabel,
  fitScore,
  fitReason,
  size = "sm",
}: FitBadgeProps) {
  const colorClass = BADGE_COLORS[fitLabel] || BADGE_COLORS["Ít phù hợp"];
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={`inline-flex items-center gap-1 rounded-full border font-medium ${colorClass} ${sizeClass}`}
        title={fitReason || fitLabel}
      >
        {fitLabel}
        {fitScore != null && (
          <span className="opacity-70">({Math.round(fitScore)}%)</span>
        )}
      </span>
      {fitReason && size === "md" && (
        <span className="text-xs text-gray-500 mt-0.5">{fitReason}</span>
      )}
    </div>
  );
}
