export interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  created_at?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface PropertyListItem {
  id: number;
  title: string;
  address: string;
  suburb: string | null;
  price: number | null;
  rooms: number | null;
  bathrooms: number | null;
  cars: number | null;
  property_type: string | null;
  primary_image: string | null;
  // DSS fit fields (optional)
  fit_score_basic?: number | null;
  fit_label?: string | null;
  fit_reason_short?: string | null;
  // AI valuation fields (optional)
  predicted_price?: number | null;
  valuation_label?: string | null;
  valuation_gap_percent?: number | null;
  // DSS combined fields (optional)
  dss_final_score?: number | null;
  dss_recommendation_label?: string | null;
  dss_explanation_short?: string | null;
}

export interface PropertyImage {
  id: number;
  image_url: string;
  is_primary: boolean;
}

export interface PropertyDetail {
  id: number;
  title: string;
  address: string;
  suburb: string | null;
  region_name: string | null;
  postcode: string | null;
  property_type: string | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  cars: number | null;
  land_size: number | null;
  building_area: number | null;
  year_built: number | null;
  price: number | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  created_at: string | null;
  images: PropertyImage[];
}

export interface PropertyListResponse {
  items: PropertyListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PropertyFilters {
  page?: number;
  page_size?: number;
  search?: string;
  suburb?: string;
  min_price?: number;
  max_price?: number;
  min_rooms?: number;
  max_rooms?: number;
  min_bedrooms?: number;
  min_bathrooms?: number;
  min_cars?: number;
  property_type?: string;
  min_year_built?: number;
  max_year_built?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  view?: string;
  include_fit?: boolean;
  include_valuation?: boolean;
  include_dss?: boolean;
}

export interface PropertyMapItem {
  id: number;
  title: string;
  price: number | null;
  address: string;
  suburb: string | null;
  latitude: number;
  longitude: number;
  primary_image: string | null;
}

export interface PropertyMapResponse {
  items: PropertyMapItem[];
  total: number;
}

export interface FavoriteResponse {
  message: string;
  favorited: boolean;
}

export interface FavoriteCheckResponse {
  favorited: boolean;
}

// --- DSS Types ---

export interface UserProfile {
  id: number;
  user_id: number;
  buying_purpose: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_suburbs: string[] | null;
  preferred_region_names: string[] | null;
  preferred_property_types: string[] | null;
  min_bedrooms: number | null;
  min_bathrooms: number | null;
  min_cars: number | null;
  preferred_min_year_built: number | null;
  risk_tolerance: string | null;
  family_size: number | null;
  has_children: boolean | null;
  work_location_text: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserProfileInput {
  buying_purpose?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  preferred_suburbs?: string[] | null;
  preferred_region_names?: string[] | null;
  preferred_property_types?: string[] | null;
  min_bedrooms?: number | null;
  min_bathrooms?: number | null;
  min_cars?: number | null;
  preferred_min_year_built?: number | null;
  risk_tolerance?: string | null;
  family_size?: number | null;
  has_children?: boolean | null;
  work_location_text?: string | null;
  notes?: string | null;
}

export interface DSSCriteria {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface CriteriaPreference {
  id: number;
  criteria_id: number;
  criteria_code: string | null;
  criteria_name: string | null;
  priority_level: string;
  priority_score: number;
  updated_at: string | null;
}

export interface CriteriaPreferencesResponse {
  preferences: CriteriaPreference[];
}

export interface CriteriaPreferenceInput {
  criteria_id: number;
  priority_level: string;
}

export interface PropertyFitResponse {
  property_id: number;
  fit_score_basic: number;
  budget_match: boolean | null;
  location_match: boolean | null;
  bedroom_match: boolean | null;
  bathroom_match: boolean | null;
  parking_match: boolean | null;
  property_type_match: boolean | null;
  year_built_match: boolean | null;
  family_suitability_match: boolean | null;
  matched_criteria: string[];
  unmatched_criteria: string[];
  summary_label: string;
  summary_explanation: string;
}

export interface PropertyFitBrief {
  fit_score_basic: number;
  fit_label: string;
  fit_reason_short: string;
}

// --- AHP Types ---

export interface AHPMatrixEntry {
  criteria_id_row: number;
  criteria_id_col: number;
  value: number;
}

export interface AHPMatrixResponse {
  id: number;
  user_id: number;
  entries: AHPMatrixEntry[];
  created_at: string | null;
  updated_at: string | null;
}

export interface CriteriaWeight {
  criteria_id: number;
  criteria_code: string;
  criteria_name: string;
  weight: number;
}

export interface AHPWeightsResponse {
  weights: CriteriaWeight[];
  lambda_max: number;
  ci: number;
  cr: number;
  is_consistent: boolean;
}

export interface AHPConsistencyResponse {
  lambda_max: number;
  ci: number;
  cr: number;
  ri: number;
  is_consistent: boolean;
  n: number;
  message: string;
}

export interface CriteriaBreakdownItem {
  criteria_code: string;
  criteria_name: string;
  weight: number;
  normalized_value: number;
  contribution: number;
}

export interface PropertyAHPScoreResponse {
  property_id: number;
  score: number;
  summary_label: string;
  criteria_breakdown: CriteriaBreakdownItem[];
  weights_used: CriteriaWeight[];
}

export interface RankedPropertyItem {
  rank: number;
  property_id: number;
  title: string;
  address: string;
  suburb: string | null;
  price: number | null;
  rooms: number | null;
  bathrooms: number | null;
  cars: number | null;
  property_type: string | null;
  primary_image: string | null;
  ahp_score: number;
  summary_label: string;
}

export interface RankingResponse {
  items: RankedPropertyItem[];
  total: number;
}

// --- AHP Simplified Alternatives (5×5) ---

export interface AHPAlternativeProperty {
  property_id: number;
  title: string;
  address: string;
  suburb: string | null;
  price: number | null;
  rooms: number | null;
  bedrooms: number | null;
  year_built: number | null;
  primary_image: string | null;
}

export interface AHPAlternativeRow {
  property_id: number;
  title: string;
  values: Record<string, number>; // {criteria_code: normalized_value}
  ahp_score: number;
  rank: number;
  summary_label: string;
}

export interface AHPCriteriaInfo {
  code: string;
  name: string;
  description: string | null;
}

export interface AHPAlternativesResponse {
  criteria: AHPCriteriaInfo[];
  criteria_weights: CriteriaWeight[];
  alternatives: AHPAlternativeProperty[];
  alternative_matrix: AHPAlternativeRow[];
  ranking: AHPAlternativeRow[];
  lambda_max: number;
  ci: number;
  cr: number;
  is_consistent: boolean;
  consistency_message: string;
}

// --- AI Valuation Types ---

export interface ModelVersion {
  id: number;
  model_name: string;
  version: string;
  algorithm: string;
  target_column: string;
  feature_list: string[] | null;
  metrics: Record<string, number> | null;
  artifact_path: string | null;
  is_active: boolean;
  created_at: string | null;
}

export interface ModelListResponse {
  models: ModelVersion[];
}

export interface TrainRequest {
  n_estimators?: number;
  test_size?: number;
}

export interface TrainResponse {
  model_id: number;
  version: string;
  metrics: Record<string, number>;
  message: string;
}

export interface ValuationResponse {
  property_id: number;
  predicted_price: number;
  listed_price: number | null;
  valuation_label: string | null;
  valuation_gap: number | null;
  valuation_gap_percent: number | null;
  confidence_note: string | null;
  model_version_id: number | null;
  model_name: string | null;
}

export interface AIHealthResponse {
  status: string;
  active_model: string | null;
  model_version: string | null;
  model_id: number | null;
  message: string;
}

// --- Phase 6: DSS Combination / Recommendation Types ---

export interface DSSScoreBreakdownComponent {
  score: number | null;
  weight: number;
  weighted: number | null;
  available: boolean;
  valuation_label?: string | null;
  matched_criteria?: string[] | null;
  unmatched_criteria?: string[] | null;
}

export interface DSSScoreBreakdown {
  components: {
    ahp: DSSScoreBreakdownComponent;
    ai: DSSScoreBreakdownComponent;
    fit: DSSScoreBreakdownComponent;
  };
  weight_config: {
    ahp: number;
    ai: number;
    fit: number;
  };
}

export interface PropertyDSSScoreResponse {
  property_id: number;
  ahp_score: number | null;
  ai_score: number | null;
  fit_score_basic: number | null;
  final_score: number;
  recommendation_label: string;
  explanation_summary: string | null;
  breakdown: DSSScoreBreakdown | null;
}

export interface RecommendedPropertyItem {
  rank: number;
  property_id: number;
  title: string;
  address: string;
  suburb: string | null;
  price: number | null;
  rooms: number | null;
  bathrooms: number | null;
  cars: number | null;
  property_type: string | null;
  primary_image: string | null;
  final_score: number;
  recommendation_label: string;
  explanation_summary_short: string | null;
}

export interface RecommendationsResponse {
  items: RecommendedPropertyItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface RecommendationRefreshResponse {
  message: string;
  properties_scored: number;
}

export interface LabelCount {
  label: string;
  count: number;
}

export interface RecommendationsSummaryResponse {
  total_evaluated: number;
  label_counts: LabelCount[];
  top_suburbs: string[];
  average_final_score: number | null;
}

export interface RecommendationFilters {
  page?: number;
  page_size?: number;
  suburb?: string;
  min_price?: number;
  max_price?: number;
  property_type?: string;
}

export interface ComparisonPropertyItem {
  property_id: number;
  title: string;
  address: string;
  suburb: string | null;
  property_type: string | null;
  primary_image: string | null;
  price: number | null;
  rooms: number | null;
  bathrooms: number | null;
  cars: number | null;
  year_built: number | null;
  ahp_score: number | null;
  predicted_price: number | null;
  valuation_label: string | null;
  final_dss_score: number | null;
  recommendation_label: string | null;
  added_at: string | null;
}

export interface ComparisonListResponse {
  max_items: number;
  items: ComparisonPropertyItem[];
}

export interface ExplainabilityScoreComponent {
  key: string;
  label: string;
  raw_score: number | null;
  weight: number;
  weighted_score: number | null;
  available: boolean;
  note: string | null;
}

export interface ExplainabilityCriteriaContribution {
  criteria_code: string;
  criteria_name: string;
  source: "ahp" | "rule" | "valuation";
  weight: number | null;
  raw_value: string | null;
  normalized_value: number | null;
  contribution_score: number;
  sentiment: "positive" | "negative" | "neutral";
  description: string;
}

export interface ExplainabilityFactor {
  title: string;
  detail: string;
  category: "ahp" | "rule" | "valuation";
  impact_score: number | null;
}

export interface PropertyExplainabilityResponse {
  property_id: number;
  final_score: number;
  recommendation_label: string;
  score_components: ExplainabilityScoreComponent[];
  criteria_contributions: ExplainabilityCriteriaContribution[];
  strongest_positive_factors: ExplainabilityFactor[];
  strongest_negative_factors: ExplainabilityFactor[];
  ai_valuation_interpretation: string | null;
  final_explanation_text: string;
}

export interface UserDashboardSummaryResponse {
  favorites_count: number;
  compared_count: number;
  total_evaluated_recommendations: number;
  average_saved_dss_score: number | null;
  highlighted_suburbs: string[];
  quick_summary: string;
}

export interface UserDashboardInsightsResponse {
  recommendation_distribution: LabelCount[];
  top_recommended_suburbs: string[];
  saved_properties_average_score: number | null;
  compared_properties_average_score: number | null;
  summary_note: string;
}

export interface PropertyTypeDistributionItem {
  property_type: string;
  count: number;
}

export interface SuburbInsightItem {
  suburb: string;
  property_count: number;
  average_price: number | null;
  min_price: number | null;
  max_price: number | null;
  average_rooms: number | null;
  average_bathrooms: number | null;
  average_cars: number | null;
}

export interface MarketOverviewResponse {
  total_properties: number;
  average_price: number | null;
  min_price: number | null;
  max_price: number | null;
  property_type_distribution: PropertyTypeDistributionItem[];
  top_suburbs_by_count: SuburbInsightItem[];
  note: string;
}

export interface PriceDistributionBucket {
  label: string;
  min_price: number;
  max_price: number;
  count: number;
}

export interface PriceDistributionResponse {
  total_properties: number;
  buckets: PriceDistributionBucket[];
  note: string;
}

export interface AdminActiveModelInfo {
  id: number;
  model_name: string;
  version: string;
  algorithm: string;
  metrics: Record<string, number> | null;
  created_at: string | null;
}

export interface AdminModelStatusResponse {
  total_models: number;
  active_model: AdminActiveModelInfo | null;
  message: string;
}

export interface AdminDataStatusResponse {
  property_count: number;
  valuation_coverage_count: number;
  dss_score_coverage_count: number;
  missing_coordinate_count: number;
  missing_key_feature_count: number;
}

export interface AdminSystemSummaryResponse {
  user_count: number;
  admin_count: number;
  favorites_count: number;
  comparison_item_count: number;
  latest_model_created_at: string | null;
  active_model_name: string | null;
  note: string;
}
