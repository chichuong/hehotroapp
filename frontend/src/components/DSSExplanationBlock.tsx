interface DSSExplanationBlockProps {
  explanation: string | null;
  compact?: boolean;
}

export default function DSSExplanationBlock({ explanation, compact = false }: DSSExplanationBlockProps) {
  if (!explanation) {
    return (
      <p className="text-sm text-gray-400 italic">
        Chưa đủ dữ liệu để giải thích chi tiết.
      </p>
    );
  }

  return (
    <div className={compact ? "" : "bg-gray-50 rounded-lg p-4 border border-gray-200"}>
      <p className={`${compact ? "text-xs" : "text-sm"} text-gray-700 leading-relaxed`}>
        💡 {explanation}
      </p>
    </div>
  );
}
