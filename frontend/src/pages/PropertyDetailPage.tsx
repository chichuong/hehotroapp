import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { propertyApi } from "../api/properties";
import { dssApi } from "../api/dss";
import { aiApi } from "../api/ai";
import { useAuth } from "../context/AuthContext";
import type { PropertyDetail, PropertyListItem, PropertyFitResponse, ValuationResponse, PropertyDSSScoreResponse } from "../types";
import { formatPrice } from "../utils/format";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import FavoriteButton from "../components/FavoriteButton";
import PropertyCard from "../components/PropertyCard";
import FitSummaryCard from "../components/FitSummaryCard";
import AHPScoreSection from "../components/AHPScoreSection";
import ValuationSummaryCard from "../components/ValuationSummaryCard";
import DSSScoreBreakdownCard from "../components/DSSScoreBreakdownCard";
import CompareButton from "../components/CompareButton";
import ExplanationPanel from "../components/ExplanationPanel";
import { dssExplainApi } from "../api/dssExplain";
import type { PropertyExplainabilityResponse } from "../types";

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [related, setRelated] = useState<PropertyListItem[]>([]);
  const [fit, setFit] = useState<PropertyFitResponse | null>(null);
  const [fitLoading, setFitLoading] = useState(false);
  const [valuation, setValuation] = useState<ValuationResponse | null>(null);
  const [valuationLoading, setValuationLoading] = useState(false);
  const [dssScore, setDssScore] = useState<PropertyDSSScoreResponse | null>(null);
  const [dssLoading, setDssLoading] = useState(false);
  const [explainability, setExplainability] = useState<PropertyExplainabilityResponse | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setSelectedImage(0);
    propertyApi
      .getById(Number(id))
      .then((data) => {
        setProperty(data);
        setError(null);
      })
      .catch(() => {
        setError("Không thể tải thông tin bất động sản.");
      })
      .finally(() => setLoading(false));

    propertyApi
      .getRelated(Number(id))
      .then(setRelated)
      .catch(() => setRelated([]));
  }, [id]);

  // Load fit data for logged-in users
  useEffect(() => {
    if (!id || !user) {
      setFit(null);
      return;
    }
    setFitLoading(true);
    dssApi
      .getPropertyFit(Number(id))
      .then(setFit)
      .catch(() => setFit(null))
      .finally(() => setFitLoading(false));
  }, [id, user]);

  // Load AI valuation
  useEffect(() => {
    if (!id) {
      setValuation(null);
      return;
    }
    setValuationLoading(true);
    aiApi
      .getValuation(Number(id))
      .then(setValuation)
      .catch(() => setValuation(null))
      .finally(() => setValuationLoading(false));
  }, [id]);

  // Load DSS combined score for logged-in users
  useEffect(() => {
    if (!id || !user) {
      setDssScore(null);
      return;
    }
    setDssLoading(true);
    dssApi
      .getPropertyFinalScore(Number(id))
      .then(setDssScore)
      .catch(() => setDssScore(null))
      .finally(() => setDssLoading(false));
  }, [id, user]);

  useEffect(() => {
    if (!id || !user) {
      setExplainability(null);
      return;
    }
    setExplainLoading(true);
    dssExplainApi
      .getPropertyExplainability(Number(id))
      .then(setExplainability)
      .catch(() => setExplainability(null))
      .finally(() => setExplainLoading(false));
  }, [id, user]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!property) return <ErrorMessage message="Không tìm thấy bất động sản." />;

  const fallbackImg =
    "https://placehold.co/800x600/e2e8f0/64748b?text=B%E1%BA%A5t+%C4%91%E1%BB%99ng+s%E1%BA%A3n";
  const images =
    property.images.length > 0
      ? property.images.map((i) => i.image_url)
      : [fallbackImg];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-primary-600">
          Trang chủ
        </Link>
        <span className="mx-2">/</span>
        <Link to="/properties" className="hover:text-primary-600">
          Bất động sản
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{property.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: images + info */}
        <div className="lg:col-span-2">
          {/* Image gallery */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="aspect-[16/10] bg-gray-100">
              <img
                src={images[selectedImage]}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 ${
                      idx === selectedImage
                        ? "border-primary-500"
                        : "border-transparent"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Hình ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Mô tả</h2>
            <p className="text-gray-700 leading-relaxed">
              {property.description || "Chưa có mô tả cho bất động sản này."}
            </p>
          </div>

          {/* Location */}
          {(property.latitude || property.longitude) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Vị trí</h2>
              <div className="bg-gray-100 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  📍 Tọa độ: {property.latitude}, {property.longitude}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Khu vực: {property.suburb || "N/A"} —{" "}
                  {property.region_name || "N/A"}
                </p>
              </div>
            </div>
          )}

          {/* DSS Fit Summary */}
          {user ? (
            fitLoading ? (
              <div className="mt-6">
                <LoadingSpinner />
              </div>
            ) : fit ? (
              <div className="mt-6">
                <FitSummaryCard fit={fit} />
              </div>
            ) : null
          ) : (
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-5">
              <p className="text-sm text-gray-600">
                🔒{" "}
                <Link
                  to="/login"
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Đăng nhập
                </Link>{" "}
                để xem mức độ phù hợp với nhu cầu của bạn.
              </p>
            </div>
          )}

          {/* AHP Score Section */}
          {user && (
            <div className="mt-6">
              <AHPScoreSection propertyId={property.id} />
            </div>
          )}

          {/* AI Valuation Section */}
          <div className="mt-6">
            {valuationLoading ? (
              <LoadingSpinner />
            ) : valuation ? (
              <ValuationSummaryCard valuation={valuation} />
            ) : null}
          </div>

          {/* DSS Combined Score Section */}
          {user && (
            <div className="mt-6">
              {dssLoading ? (
                <LoadingSpinner />
              ) : dssScore ? (
                <DSSScoreBreakdownCard
                  ahpScore={dssScore.ahp_score}
                  aiScore={dssScore.ai_score}
                  fitScore={dssScore.fit_score_basic}
                  finalScore={dssScore.final_score}
                  recommendationLabel={dssScore.recommendation_label}
                  explanation={dssScore.explanation_summary}
                  breakdown={dssScore.breakdown}
                />
              ) : null}
            </div>
          )}

          {user && (
            <div className="mt-6">
              {explainLoading ? (
                <LoadingSpinner />
              ) : explainability ? (
                <ExplanationPanel explainability={explainability} />
              ) : null}
            </div>
          )}
        </div>

        {/* Right column: details */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h1 className="text-xl font-bold text-gray-900">
                {property.title}
              </h1>
              <div className="flex items-center gap-2">
                <CompareButton propertyId={property.id} />
                <FavoriteButton propertyId={property.id} size="md" />
              </div>
            </div>
            <p className="text-gray-500 text-sm mb-4">
              {property.address}
              {property.suburb && `, ${property.suburb}`}
              {property.postcode && ` ${property.postcode}`}
            </p>
            <p className="text-2xl font-bold text-primary-600 mb-6">
              {property.price ? formatPrice(property.price) : "Liên hệ"}
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
              Thông tin bất động sản
            </h3>
            <div className="space-y-3">
              <InfoRow label="Loại hình" value={property.property_type} />
              <InfoRow
                label="Số phòng"
                value={property.rooms != null ? `${property.rooms}` : null}
              />
              <InfoRow
                label="Phòng ngủ"
                value={
                  property.bedrooms != null ? `${property.bedrooms}` : null
                }
              />
              <InfoRow
                label="Phòng tắm"
                value={
                  property.bathrooms != null ? `${property.bathrooms}` : null
                }
              />
              <InfoRow
                label="Chỗ đậu xe"
                value={property.cars != null ? `${property.cars}` : null}
              />
              <InfoRow
                label="Diện tích đất"
                value={
                  property.land_size != null
                    ? `${property.land_size.toLocaleString("vi-VN")} m²`
                    : null
                }
              />
              <InfoRow
                label="Diện tích xây dựng"
                value={
                  property.building_area != null
                    ? `${property.building_area.toLocaleString("vi-VN")} m²`
                    : null
                }
              />
              <InfoRow
                label="Năm xây dựng"
                value={
                  property.year_built != null ? `${property.year_built}` : null
                }
              />
              <InfoRow label="Khu vực" value={property.region_name} />
              <InfoRow label="Mã bưu điện" value={property.postcode} />
            </div>
          </div>
        </div>
      </div>

      {/* Related properties */}
      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
           Bất động sản tương tự
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {related.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}
