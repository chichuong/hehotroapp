import { Link } from "react-router-dom";
import type { PropertyListItem } from "../types";
import { formatPrice } from "../utils/format";
import FavoriteButton from "./FavoriteButton";
import FitBadge from "./FitBadge";
import ValuationBadge from "./ValuationBadge";
import RecommendationBadge from "./RecommendationBadge";
import CompareButton from "./CompareButton";

interface PropertyCardProps {
  property: PropertyListItem;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const fallbackImg =
    "https://placehold.co/600x400/e2e8f0/64748b?text=B%E1%BA%A5t+%C4%91%E1%BB%99ng+s%E1%BA%A3n";

  return (
    <div className="relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <Link to={`/properties/${property.id}`}>
        <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative">
          <img
            src={property.primary_image || fallbackImg}
            alt={property.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {property.property_type && (
            <span className="absolute bottom-2 left-2 bg-primary-600 text-white text-xs font-medium px-2 py-1 rounded">
              {property.property_type}
            </span>
          )}
        </div>
      </Link>
      <div className="absolute top-2 right-2 z-10">
        <FavoriteButton propertyId={property.id} size="sm" />
      </div>
      <div className="p-4">
        <Link to={`/properties/${property.id}`}>
          <h3 className="font-semibold text-gray-900 text-base mb-1 line-clamp-2 hover:text-primary-600 transition-colors">
            {property.title}
          </h3>
        </Link>
        <p className="text-sm text-gray-500 mb-2 line-clamp-1">
          {property.address}
          {property.suburb && `, ${property.suburb}`}
        </p>
        <p className="text-lg font-bold text-primary-600 mb-3">
          {property.price ? formatPrice(property.price) : "Liên hệ"}
        </p>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          {property.rooms != null && (
            <span className="flex items-center gap-1">
              🛏️ {property.rooms} phòng
            </span>
          )}
          {property.bathrooms != null && (
            <span className="flex items-center gap-1">
              🚿 {property.bathrooms}
            </span>
          )}
          {property.cars != null && (
            <span className="flex items-center gap-1">
              🚗 {property.cars}
            </span>
          )}
        </div>
        {property.fit_label && (
          <div className="mt-2">
            <FitBadge
              fitLabel={property.fit_label}
              fitScore={property.fit_score_basic ?? undefined}
              fitReason={property.fit_reason_short ?? undefined}
              size="sm"
            />
          </div>
        )}
        {property.valuation_label && (
          <div className="mt-1">
            <ValuationBadge
              label={property.valuation_label}
              gapPercent={property.valuation_gap_percent}
              size="sm"
            />
          </div>
        )}
        {property.dss_recommendation_label && (
          <div className="mt-1">
            <RecommendationBadge
              label={property.dss_recommendation_label}
              score={property.dss_final_score ?? undefined}
              size="sm"
            />
          </div>
        )}
        <div className="mt-3 flex items-center justify-between gap-2">
          <Link
            to={`/properties/${property.id}`}
            className="inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Xem chi tiết →
          </Link>
          <CompareButton propertyId={property.id} compact />
        </div>
      </div>
    </div>
  );
}
