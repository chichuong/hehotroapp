# Hệ thống Hỗ trợ Ra quyết định Bất động sản (Real Estate DSS)

A production-style real estate decision support system with Vietnamese UI. The current codebase includes property search, favorites, AHP scoring, AI valuation, combined DSS recommendations, property comparison, explainability, dashboard summaries, market insights, and lightweight admin visibility.

## Tech Stack

| Layer    | Technology                                |
|----------|-------------------------------------------|
| Backend  | Python, FastAPI, SQLAlchemy, Alembic      |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS  |
| Database | PostgreSQL 16                             |
| Auth     | JWT (python-jose), bcrypt (passlib)       |

## Project Structure

```
doan/
├── docker-compose.yml
├── melb_data.csv
├── README.md
├── backend/
│   ├── .env / .env.example
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   │       └── 001_initial_schema.py
│   └── app/
│       ├── main.py
│       ├── core/
│       │   ├── config.py
│       │   └── security.py
│       ├── db/
│       │   ├── base.py
│       │   └── session.py
│       ├── models/
│       │   ├── user.py
│       │   ├── property.py
│       │   └── property_image.py
│       ├── schemas/
│       │   ├── user.py
│       │   └── property.py
│       ├── api/
│       │   ├── health.py
│       │   ├── auth.py
│       │   └── properties.py
│       ├── services/
│       ├── utils/
│       └── scripts/
│           └── seed_data.py
└── frontend/
    ├── .env / .env.example
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── postcss.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── vite-env.d.ts
        ├── api/
        │   ├── client.ts
        │   ├── auth.ts
        │   └── properties.ts
        ├── types/
        │   └── index.ts
        ├── context/
        │   └── AuthContext.tsx
        ├── components/
        │   ├── Header.tsx
        │   ├── Footer.tsx
        │   ├── Layout.tsx
        │   ├── PropertyCard.tsx
        │   ├── Pagination.tsx
        │   ├── LoadingSpinner.tsx
        │   ├── ErrorMessage.tsx
        │   └── EmptyState.tsx
        ├── pages/
        │   ├── HomePage.tsx
        │   ├── LoginPage.tsx
        │   ├── RegisterPage.tsx
        │   ├── PropertyListPage.tsx
        │   └── PropertyDetailPage.tsx
        └── utils/
            └── format.ts
```

## Setup Instructions

### Prerequisites

- **Python 3.12+**
- **Node.js 18+**
- **PostgreSQL 16+**

Docker files from earlier phases may still exist in the repository, but the recommended setup for the current system is manual local setup without Docker.

### Manual Setup

#### 1. Database

Create a PostgreSQL database:

```sql
CREATE USER realestate WITH PASSWORD 'realestate123';
CREATE DATABASE realestate_db OWNER realestate;
```

#### 2. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Copy and edit environment
copy .env.example .env
# Edit .env with your database credentials

# Run migrations
alembic upgrade head

# Seed data from CSV
python -m app.scripts.seed_data

# Start the API server
uvicorn app.main:app --reload --port 8000
```

#### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy and edit environment
copy .env.example .env

# Start development server
npm run dev
```

The frontend will be available at **http://localhost:5173** and the API at **http://localhost:8000**.

## API Documentation

Once the backend is running, auto-generated docs are available at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### API Endpoints

| Method | Endpoint                          | Description                                    |
|--------|-----------------------------------|------------------------------------------------|
| GET    | `/api/health`                     | Health check                                   |
| POST   | `/api/auth/register`              | Register a new user                            |
| POST   | `/api/auth/login`                 | Login and get JWT token                        |
| GET    | `/api/auth/me`                    | Get current user (requires auth)               |
| GET    | `/api/properties`                 | List properties with filters                   |
| GET    | `/api/properties/{id}`            | Get property details                           |
| GET    | `/api/properties/{id}/related`    | Get related properties                         |
| GET    | `/api/properties/suburbs`         | List distinct suburbs                          |
| GET    | `/api/properties/types`           | List distinct property types                   |
| POST   | `/api/favorites/{id}`             | Toggle favorite (requires auth)                |
| GET    | `/api/favorites`                  | List user favorites (requires auth)            |
| GET    | `/api/dss/profile`                | Get DSS profile (requires auth)                |
| POST   | `/api/dss/profile`                | Create DSS profile (requires auth)             |
| PUT    | `/api/dss/profile`                | Update DSS profile (requires auth)             |
| GET    | `/api/dss/criteria`               | List active DSS criteria                       |
| GET    | `/api/dss/preferences`            | Get user criteria preferences (requires auth)  |
| PUT    | `/api/dss/preferences`            | Update user criteria preferences (requires auth)|
| GET    | `/api/dss/properties/{id}/fit`    | Get property fit analysis (requires auth)      |

### Property Listing Filters

| Parameter  | Type   | Description             |
|------------|--------|-------------------------|
| page       | int    | Page number (default: 1)|
| page_size  | int    | Items per page (1-100)  |
| suburb     | string | Filter by suburb name   |
| min_price  | float  | Minimum price           |
| max_price  | float  | Maximum price           |
| rooms      | int    | Exact number of rooms   |

### Sample API Usage

```bash
# Health check
curl http://localhost:8000/api/health

# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name": "Nguyen Van A", "email": "a@example.com", "password": "123456"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "a@example.com", "password": "123456"}'

# List properties (page 1, filter by suburb)
curl "http://localhost:8000/api/properties?page=1&page_size=10&suburb=Abbotsford"

# Get property detail
curl http://localhost:8000/api/properties/1

# Get current user (with token)
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <your_token>"
```

## Phase 1 Completed Features

- ✅ FastAPI backend with modular structure
- ✅ PostgreSQL database with SQLAlchemy ORM
- ✅ Alembic migrations (initial schema)
- ✅ JWT-based authentication (register, login, get current user)
- ✅ Password hashing with bcrypt
- ✅ Property listing API with pagination and filtering (suburb, price range, rooms)
- ✅ Property detail API
- ✅ CSV import script — seeds 13,000+ Melbourne properties into the database
- ✅ CORS configuration for React frontend
- ✅ Health check endpoint
- ✅ React + TypeScript + Vite frontend
- ✅ Tailwind CSS responsive UI
- ✅ Vietnamese-only user interface
- ✅ Homepage with hero section and features
- ✅ Property listing page with filter panel, cards, and pagination
- ✅ Property detail page with image gallery, info sections, and location
- ✅ Login and registration pages with validation in Vietnamese
- ✅ Auth state management (context + localStorage)
- ✅ Reusable components (Header, Footer, Layout, PropertyCard, Pagination, Loading, Error, Empty states)
- ✅ Type-safe API interfaces
- ✅ Environment-based configuration
- ✅ Docker Compose setup

## Phase 2 Completed Features

- ✅ Advanced search/filter with 14 parameters (suburb, price range, rooms, bedrooms, bathrooms, parking, property type, year built)
- ✅ Multi-field sorting (price, rooms, year built, created date, suburb)
- ✅ Favorites system (add, remove, list, check)
- ✅ Map view with Leaflet (2000 marker limit)
- ✅ Related properties based on suburb/price similarity
- ✅ Metadata endpoints (suburbs, property types)

## Phase 3 Completed Features

- ✅ **DSS User Profile** — `user_profiles` table storing buying purpose, budget, preferred suburbs, property types, bedrooms/bathrooms/parking requirements, risk tolerance, family info
- ✅ **DSS Criteria System** — `criteria` table with 12 seeded criteria (price, location, area, bedrooms, bathrooms, parking, property type, year built, family suitability, investment potential, safety, legal status)
- ✅ **User Criteria Preferences** — `user_criteria_preferences` table with priority levels (low/medium/high/critical) and numeric scores (future-ready for AHP weights)
- ✅ **Recommendation Profiles** — `recommendation_profiles` table for future multi-profile support
- ✅ **DSS Profile API** — `GET/POST/PUT /api/dss/profile` with validation
- ✅ **Criteria API** — `GET /api/dss/criteria` lists active criteria
- ✅ **Preferences API** — `GET/PUT /api/dss/preferences` with upsert and validation
- ✅ **Property Fit API** — `GET /api/dss/properties/{id}/fit` returns rule-based fit scoring
- ✅ **Fit-Enhanced Property List** — `include_fit=true` query param attaches fit summary to listing results
- ✅ **DSS Profile Page** — Full Vietnamese UI for creating/editing decision profiles with sections for goals, budget, suburbs, property types, basic requirements, family info
- ✅ **Criteria Priority UI** — Interactive priority selector per criterion with visual indicators and unsupported criteria marked honestly
- ✅ **Fit Summary in Property Detail** — Shows matched/unmatched criteria, score, and Vietnamese explanation for logged-in users
- ✅ **Fit Badge in Property Cards** — Subtle fit indication on listing cards when user is authenticated
- ✅ **Auth Guard Component** — Reusable route protection component
- ✅ **Honest Unsupported Criteria** — Criteria without data support (investment potential, safety, legal status) clearly marked as "Sắp hỗ trợ"
- ✅ **Alembic Migration 003** — Schema for all DSS tables with seeded criteria data

### DSS Criteria — Support Status

| Criteria | Code | Data Available | Status |
|----------|------|---------------|--------|
| Giá (Price) | `price` | ✅ Yes | Fully supported |
| Vị trí (Location) | `location` | ✅ Yes | Suburb matching |
| Diện tích (Area) | `area` | ✅ Yes | Data available, basic support |
| Số phòng ngủ (Bedrooms) | `bedrooms` | ✅ Yes | Fully supported |
| Số phòng tắm (Bathrooms) | `bathrooms` | ✅ Yes | Fully supported |
| Chỗ đậu xe (Parking) | `parking` | ✅ Yes | Fully supported |
| Loại BĐS (Property Type) | `property_type` | ✅ Yes | Fully supported |
| Năm xây dựng (Year Built) | `year_built` | ✅ Yes | Fully supported |
| Phù hợp gia đình (Family) | `suitability_for_family` | ⚠️ Inferred | Basic inference from rooms/family size |
| Tiềm năng đầu tư (Investment) | `investment_potential` | ❌ No data | Future phase |
| Mức độ an toàn (Safety) | `safety` | ❌ No data | Future phase |
| Pháp lý (Legal) | `legal_status` | ❌ No data | Future phase |

### Running Phase 3 Migrations (Without Docker)

```bash
cd backend

# Activate virtual environment
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Run all migrations (includes 001, 002, 003)
alembic upgrade head

# This will:
# - Create user_profiles, criteria, user_criteria_preferences, recommendation_profiles tables
# - Seed 12 default DSS criteria
```

### DSS Profile Setup

1. Register/login to the application
2. Navigate to **"Hồ sơ nhu cầu"** from the header navigation
3. Fill in your buying purpose, budget range, preferred suburbs, property types, and basic requirements
4. Set priority levels for each decision criterion
5. Save your profile and preferences
6. Browse properties — fit badges will appear on listing cards and detailed fit analysis on property detail pages

## Phase 4 Completed Features

- ✅ **AHP Pairwise Comparison Matrix** — `ahp_matrices` and `ahp_matrix_entries` tables storing user pairwise comparisons with 1–9 Saaty scale and reciprocals
- ✅ **AHP Criteria Weights Calculation** — Full AHP engine computing priority vector via column normalization and row averaging
- ✅ **Consistency Validation** — λmax, Consistency Index (CI), and Consistency Ratio (CR) calculation with standard RI table; warns users when CR > 10%
- ✅ **Property AHP Scoring** — Weighted property scoring pipeline: `property_score = Σ(criteria_weight × normalized_criteria_value)` with min-max normalization
- ✅ **Property Ranking Endpoint** — `GET /api/dss/ranking` with filters (suburb, price range, limit), returns ranked properties with AHP scores and Vietnamese labels
- ✅ **Property AHP Score Endpoint** — `GET /api/dss/properties/{id}/ahp-score` returns score, criteria breakdown, and weights used
- ✅ **AHP Matrix API** — `GET/POST/PUT /api/dss/ahp/matrix` for storing and updating pairwise comparisons
- ✅ **AHP Weights API** — `GET /api/dss/ahp/weights` returns computed criteria weights with consistency metrics
- ✅ **AHP Consistency API** — `GET /api/dss/ahp/consistency` returns CI, CR, RI, and Vietnamese consistency message
- ✅ **AHP Setup Page** — `/dss/ahp` with pairwise comparison sliders, matrix visualization, weight bar chart, and consistency indicators
- ✅ **Property Ranking Page** — `/dss/ranking` with filtered ranked property list, AHP score bars, and Vietnamese summary labels (Ưu tiên xem, Đáng cân nhắc, Theo dõi thêm, Không phù hợp)
- ✅ **Property Detail AHP Section** — Shows AHP score, criteria breakdown with contributions, and weights used for each property
- ✅ **Cached AHP Scores** — `property_ahp_scores` table for caching computed results
- ✅ **Alembic Migration 004** — Schema for AHP tables
- ✅ **Navigation Updates** — Header links for AHP setup (⚖️ Thiết lập ưu tiên) and ranking (📊 Gợi ý BĐS)

### AHP Scoring Pipeline

1. User configures pairwise comparisons between 6 scorable criteria (Price, Area, Bedrooms, Bathrooms, Parking, Year Built)
2. System builds full comparison matrix from upper-triangle entries
3. Columns are normalized and priority vector (weights) computed
4. Consistency is validated: CI = (λmax - n)/(n-1), CR = CI/RI
5. Properties are scored: each criterion value is min-max normalized across all properties
6. Final score = Σ(weight × normalized_value), producing a 0–1 score per property
7. Properties are ranked by score and labeled in Vietnamese

### New API Endpoints (Phase 4)

| Method | Endpoint                              | Description                                    |
|--------|---------------------------------------|------------------------------------------------|
| GET    | `/api/dss/ahp/matrix`                 | Get user's AHP comparison matrix               |
| POST   | `/api/dss/ahp/matrix`                 | Create AHP comparison matrix                   |
| PUT    | `/api/dss/ahp/matrix`                 | Update AHP comparison matrix                   |
| GET    | `/api/dss/ahp/weights`                | Get computed AHP criteria weights              |
| GET    | `/api/dss/ahp/consistency`            | Get AHP consistency check results              |
| GET    | `/api/dss/properties/{id}/ahp-score`  | Get AHP score for a specific property          |
| GET    | `/api/dss/ranking`                    | Get ranked property list based on AHP weights  |

## Phase 5 Completed Features

- ✅ **Random Forest AI Model** — Train a RandomForestRegressor on 13,000+ Melbourne property records to predict property prices
- ✅ **ML Training Pipeline** — `python -m app.ml.train_model` trains, evaluates, saves artifact, and registers model in database
- ✅ **Model Version Management** — `model_versions` table stores model metadata, feature list, metrics (MAE, RMSE, R²), and artifact path
- ✅ **Active Model Selection** — Only one model can be active at a time; switch via `POST /api/ai/models/{id}/activate`
- ✅ **Property Valuation Engine** — Predicts price for any property using the active model's preprocessing + inference pipeline
- ✅ **Valuation Classification** — Labels properties as "Định giá thấp" (underpriced), "Định giá hợp lý" (fair), or "Định giá cao" (overpriced) based on configurable ±10% thresholds
- ✅ **Valuation API** — `GET/POST /api/ai/properties/{id}/valuation` returns predicted price, gap, gap %, and label
- ✅ **Lazy Valuation** — GET endpoint computes valuation on-demand if not cached; POST forces recomputation
- ✅ **Custom Prediction** — `POST /api/ai/predict` accepts arbitrary features for testing
- ✅ **AI Health Endpoint** — `GET /api/ai/health` reports active model status
- ✅ **Prediction Logging** — `prediction_logs` table records every inference with input/output JSON
- ✅ **Property List Valuation** — `include_valuation=true` query param attaches valuation badge data to property listings
- ✅ **Property Detail AI Section** — "Định giá bằng AI" card showing listed price, predicted price, gap, percentage, label, and disclaimer
- ✅ **Valuation Badges on Cards** — Green/blue/red badges on property listing cards with gap percentage
- ✅ **Model Management Page** — `/admin/models` page for training models, viewing metrics, and activating models
- ✅ **Honest AI Disclaimers** — All AI estimates clearly labeled as historical-data-based estimates, not financial advice
- ✅ **Alembic Migration 005** — Schema for `model_versions`, `property_valuations`, `prediction_logs` tables
- ✅ **Navigation Updates** — Header link for 🤖 Mô hình AI

### AI Valuation Pipeline

1. **Training**: Load Melbourne CSV → clean data (remove nulls, outliers) → split train/val → preprocess (median impute numerics + scale, one-hot encode categoricals) → fit RandomForestRegressor → evaluate (MAE, RMSE, R²) → save artifact → register in DB
2. **Inference**: Load active model artifact → convert Property DB fields to feature dict → predict price → classify as underpriced/fair/overpriced → store valuation record
3. **Classification thresholds**:
   - Predicted > listed by 10%+ → "Định giá thấp" (underpriced, good deal)
   - Predicted < listed by 10%+ → "Định giá cao" (overpriced)
   - Within ±10% → "Định giá hợp lý" (fairly priced)

### Training the AI Model (Without Docker)

```bash
cd backend

# Activate virtual environment
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install new dependencies
pip install -r requirements.txt

# Run migration for Phase 5 tables
alembic upgrade head

# Train the Random Forest model
python -m app.ml.train_model

# This will:
# - Load melb_data.csv
# - Train a RandomForest with 100 estimators
# - Print MAE, RMSE, R² metrics
# - Save model artifact to data/models/
# - Register and activate the model in the database
```

You can also train via the API:
```bash
curl -X POST http://localhost:8000/api/ai/train \
  -H "Content-Type: application/json" \
  -d '{"n_estimators": 100, "test_size": 0.2}'
```

### Activating a Model

```bash
# List available models
curl http://localhost:8000/api/ai/models

# Activate a specific model
curl -X POST http://localhost:8000/api/ai/models/1/activate
```

### Model Limitations & Honesty Notes

- The model is trained on historical Melbourne housing data and may not reflect current market conditions
- Predictions are statistical estimates, not appraisals or financial advice
- Missing property features (e.g., no BuildingArea) are handled by median imputation, which reduces accuracy
- The model does not account for property condition, renovations, market sentiment, or legal factors
- All AI estimates include a disclaimer: "Kết quả là ước tính từ mô hình AI dựa trên dữ liệu lịch sử"

### New API Endpoints (Phase 5)

| Method | Endpoint                                  | Description                                    |
|--------|-------------------------------------------|------------------------------------------------|
| GET    | `/api/ai/health`                          | Check if an active AI model is available       |
| GET    | `/api/ai/models`                          | List all trained model versions                |
| POST   | `/api/ai/models/{id}/activate`            | Activate a specific model version              |
| POST   | `/api/ai/train`                           | Trigger model training                         |
| GET    | `/api/ai/properties/{id}/valuation`       | Get or compute property valuation              |
| POST   | `/api/ai/properties/{id}/valuation`       | Force recompute property valuation             |
| POST   | `/api/ai/predict`                         | Custom prediction from arbitrary features      |

## Not Yet Implemented

The following features are planned for future phases:

- **Advanced Explainability** — More detailed, visual, and interactive explanations for all scoring components, including feature importance, what-if analysis, and confidence intervals
- **Full Property Comparison Engine** — Side-by-side comparison tool for multiple properties across all criteria
- **Rich Dashboards** — Interactive data visualization dashboards with charts, trends, and market analytics
- **Advanced Admin Analytics** — Admin panel with system-wide analytics, user management, and data quality monitoring
- **Behavioral Learning Personalization** — ML-based personalization that learns from user browsing, favorites, and feedback to refine recommendations over time
- **Image Upload** — Real property photo management
- **Geospatial Queries** — Distance-based search, commute time estimation

## Phase 6 Completed Features

- ✅ **DSS Combination Engine** — Combines AHP personalized score (40%), AI valuation signal (40%), and rule-based fit score (20%) into a single final DSS score per user-property pair
- ✅ **Configurable Weights** — Component weights are configurable in code; when a component is unavailable (e.g., no AHP matrix or no AI valuation), weights are redistributed proportionally among available components
- ✅ **Recommendation Labels** — Final score (0–100) mapped to four Vietnamese labels:
  - **Ưu tiên lựa chọn** (≥75): Strong match across all components
  - **Đáng cân nhắc** (≥55): Good match, worth considering
  - **Theo dõi thêm** (≥35): Some indicators positive, needs more review
  - **Không khuyến nghị** (<35): Does not align well with user preferences
- ✅ **Decision Explanations** — Concise Vietnamese explanations for each property-user pair describing what contributed positively and negatively based on actual AHP, AI, and fit signals
- ✅ **DSS Score Caching** — `property_dss_scores` table caches computed results per user-property pair with upsert on refresh
- ✅ **Final Score Endpoint** — `GET /api/dss/properties/{id}/final-score` returns full breakdown with AHP, AI, fit components, explanation, and weights
- ✅ **Recommendations Endpoint** — `GET /api/dss/recommendations` returns a ranked, filtered, paginated list of recommended properties
- ✅ **Recommendations Refresh** — `POST /api/dss/recommendations/refresh` recomputes all scores for the current user across all properties
- ✅ **Recommendations Summary** — `GET /api/dss/recommendations/summary` returns lightweight aggregates: total evaluated, count by label, top suburbs, average score
- ✅ **Property List DSS Integration** — `include_dss=true` query param attaches final score, recommendation label, and short explanation to property listing cards
- ✅ **Recommendations Page** — `/dss/recommendations` — main personalized decision page with ranked property cards, filters, pagination, and summary panel
- ✅ **Property Detail DSS Section** — Full "Đánh giá tổng hợp DSS" card with score breakdown bars, component weights, availability warnings, and decision explanation
- ✅ **Recommendation Badges** — Reusable badge component showing recommendation label with icons and optional score on listing cards
- ✅ **Explanation Blocks** — Reusable Vietnamese explanation component for compact and full display modes
- ✅ **Summary Panel** — Overview of total evaluated properties, priority count, average score, top suburbs, and label distribution
- ✅ **Navigation Updates** — Header links for 📊 Xếp hạng AHP and 🎯 Gợi ý DSS
- ✅ **Graceful Degradation** — Handles missing AHP data, missing AI valuations, and missing user profiles with clear messages and proportional weight redistribution
- ✅ **Alembic Migration 006** — Schema for `property_dss_scores` table with indexes and unique constraint

### How the Final DSS Score is Calculated

```
final_score = w_ahp × AHP_component + w_ai × AI_component + w_fit × Fit_component

Default weights: AHP=0.4, AI=0.4, Fit=0.2
```

**AHP Component (0–1):**
- Uses the personalized AHP pairwise comparison weights from Phase 4
- Property features are min-max normalized across all properties
- Score = Σ(criteria_weight × normalized_value)

**AI Component (0–1):**
- Based on the valuation gap from Phase 5's Random Forest model
- Underpriced properties (predicted > listed) receive higher scores (up to 1.0)
- Fair-priced properties receive ~0.5
- Overpriced properties receive lower scores (down to 0.0)
- Linear mapping: gap_percent clamped to [-50%, +50%] → [0, 1]

**Fit Component (0–1):**
- Rule-based matching from Phase 3 (budget, location, bedrooms, etc.)
- 0–100 score normalized to 0–1

**Weight Redistribution:**
- If AHP is unavailable: AI and Fit weights are scaled proportionally
- If AI is unavailable: AHP and Fit weights are scaled proportionally
- Final score is scaled to 0–100 for display

### New API Endpoints (Phase 6)

| Method | Endpoint                                      | Description                                         |
|--------|-----------------------------------------------|-----------------------------------------------------|
| GET    | `/api/dss/properties/{id}/final-score`        | Get full DSS score breakdown for a property         |
| GET    | `/api/dss/recommendations`                    | Get ranked recommendation list with filters         |
| POST   | `/api/dss/recommendations/refresh`            | Recompute all recommendations for current user      |
| GET    | `/api/dss/recommendations/summary`            | Get lightweight recommendation aggregates           |

### Running Phase 6 Migrations (Without Docker)

```bash
cd backend

# Activate virtual environment
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Run all migrations (includes 001 through 007)
alembic upgrade head

# This will create all Phase 1-7 tables, including comparison_items
```

### DSS Recommendation Setup

1. Ensure you have completed Phase 3 (DSS profile), Phase 4 (AHP setup), and Phase 5 (AI model trained)
2. Navigate to **"🎯 Gợi ý DSS"** from the header navigation
3. Click **"Cập nhật gợi ý"** to compute recommendations across all properties
4. Browse the ranked list with filters
5. Visit any property detail page to see the full DSS breakdown

### Current Limitations & Honesty Notes

- The DSS score is a weighted combination of three components; it is a decision support signal, not a definitive recommendation
- If AHP matrix is not set up, the AHP component is excluded and weights are redistributed
- If AI valuation is not available for a property, the AI component is excluded
- Explanations are based on available data signals only — the system does not invent information
- The AI model is trained on historical Melbourne data and may not reflect current market conditions
- The system does not account for property condition, renovations, or external market factors

## Phase 7 Completed Features

- ✅ **Property Comparison** — `comparison_items` table and `/api/compare` endpoints for adding, listing, and removing properties in a per-user comparison list
- ✅ **Comparison Page** — `/compare` page with Vietnamese side-by-side comparison for price, area context, rooms, bathrooms, parking, year built, AHP, AI valuation, DSS score, and recommendation label
- ✅ **Explainability Endpoint** — `GET /api/dss/properties/{id}/explain` returns transparent score components, criteria contributions, strongest positives, strongest cautions, AI valuation interpretation, and a readable summary
- ✅ **Explainability UI** — Property detail page now includes a richer Vietnamese section explaining why the property received its current evaluation
- ✅ **User Dashboard APIs** — `/api/dashboard/user-summary` and `/api/dashboard/user-insights` provide favorites count, comparison count, evaluated recommendation count, suburb highlights, average saved DSS score, and label distribution
- ✅ **User Dashboard Page** — `/dashboard` page provides a practical thesis/demo-ready personal overview with stat cards and lightweight charts
- ✅ **Market Insights APIs** — `/api/insights/market-overview`, `/api/insights/suburbs`, and `/api/insights/price-distribution` summarize the loaded property dataset without pretending to be a live market feed
- ✅ **Market Insights Page** — `/insights` page shows dataset-based price distribution, property type counts, and suburb-level summary tables entirely in Vietnamese
- ✅ **Admin Foundation APIs** — `/api/admin/models/status`, `/api/admin/data/status`, and `/api/admin/system/summary` provide basic operational visibility for models, data coverage, and system usage
- ✅ **Admin Overview Page** — `/admin/overview` complements `/admin/models` with lightweight operational cards for demo and inspection
- ✅ **Reusable Frontend Components** — comparison table, explainability panel, dashboard stat cards, simple bar chart wrapper, admin summary cards, and comparison state context
- ✅ **Usability Improvements** — compare actions on property cards and detail page, stronger empty states, and more complete navigation for a coherent Phase 7 experience

### Phase 7 Feature Usage

#### Comparison Feature Instructions

1. Đăng nhập bằng tài khoản người dùng.
2. Từ danh sách hoặc trang chi tiết bất động sản, bấm nút **"So sánh"**.
3. Mở trang **"So sánh bất động sản"** để xem đối chiếu song song tối đa 4 bất động sản.
4. Sử dụng điểm AHP, định giá AI và điểm DSS để nhận biết lựa chọn nổi bật.

#### Dashboard Overview

- Trang **"Tổng quan cá nhân"** giúp tóm tắt nhanh số mục yêu thích, số mục đang so sánh, số gợi ý DSS đã được đánh giá và khu vực nổi bật.
- Các insight trong dashboard chỉ phản ánh dữ liệu DSS đã được tạo trong hệ thống tại thời điểm xem.

#### Market Insights Overview

- Trang **"Phân tích thị trường"** tổng hợp dữ liệu từ bộ dữ liệu bất động sản đang có trong ứng dụng.
- Đây là thống kê nội bộ của ứng dụng, không phải API thị trường thời gian thực.

#### Admin Foundation Overview

- Trang **"Tổng quan quản trị"** và **"Mô hình AI"** dành cho tài khoản có `role=admin`.
- Các trang này hiển thị tình trạng mô hình đang hoạt động, độ bao phủ định giá/DSS, dữ liệu thiếu và một số chỉ số vận hành cơ bản.

### Phase 7 New API Endpoints

| Method | Endpoint                                  | Description                                                      |
|--------|-------------------------------------------|------------------------------------------------------------------|
| POST   | `/api/compare`                            | Add a property to the current user's comparison list             |
| GET    | `/api/compare`                            | Get the current user's structured comparison list                |
| DELETE | `/api/compare/{property_id}`              | Remove a property from comparison                                |
| GET    | `/api/dss/properties/{id}/explain`        | Get detailed DSS explainability for a property                   |
| GET    | `/api/dashboard/user-summary`             | Get lightweight user dashboard summary                           |
| GET    | `/api/dashboard/user-insights`            | Get user dashboard insights and label distribution               |
| GET    | `/api/insights/market-overview`           | Get dataset-based market overview                                |
| GET    | `/api/insights/suburbs`                   | Get suburb-level aggregated metrics                              |
| GET    | `/api/insights/price-distribution`        | Get histogram-friendly price buckets                             |
| GET    | `/api/admin/models/status`                | Get active model and metrics for admin visibility                |
| GET    | `/api/admin/data/status`                  | Get property/data coverage indicators                            |
| GET    | `/api/admin/system/summary`               | Get lightweight system overview for admin                        |

### Phase 7 Limitations & Honesty Notes

- Explainability is rule-based and value-based; it does not use SHAP or causal inference.
- Market insight pages summarize the loaded dataset only; they should not be presented as live market intelligence.
- Admin pages provide operational visibility only and are not a replacement for production monitoring or audit tooling.
- Comparison results depend on available DSS, AHP, and AI data; empty fields are shown honestly when a component has not been generated yet.
- Admin pages expect an account with `role=admin`; normal registered users are created with `role=user` by default.
