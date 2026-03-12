interface RecommendationBadgeProps {
  label: string;
  score?: number;
  size?: "sm" | "md";
}

const LABEL_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  "Ưu tiên lựa chọn": { bg: "bg-green-50", text: "text-green-700", ring: "ring-green-200" },
  "Đáng cân nhắc": { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200" },
  "Theo dõi thêm": { bg: "bg-yellow-50", text: "text-yellow-700", ring: "ring-yellow-200" },
  "Không khuyến nghị": { bg: "bg-gray-50", text: "text-gray-600", ring: "ring-gray-200" },
};

const LABEL_ICONS: Record<string, string> = {
  "Ưu tiên lựa chọn": "⭐",
  "Đáng cân nhắc": "👍",
  "Theo dõi thêm": "👀",
  "Không khuyến nghị": "⚠️",
};

export default function RecommendationBadge({ label, score, size = "sm" }: RecommendationBadgeProps) {
  const style = LABEL_STYLES[label] || LABEL_STYLES["Không khuyến nghị"];
  const icon = LABEL_ICONS[label] || "";
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full ring-1 ${style.bg} ${style.text} ${style.ring} ${sizeClass}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {score != null && (
        <span className="opacity-75">({score.toFixed(1)})</span>
      )}
    </span>
  );
}
