# RUN_STATUS

## What was broken
1. **Docker dependencies**: The codebase included outdated `docker-compose.yml` and `Dockerfile` files that were causing confusion about the standard runtime approach for local development. Mention of Docker in `README.md` was also outdated.
2. **Missing ML Columns in Dataset**: The AI valuation pipeline `train_model.py` and `feature_builder.py` expected numeric features (`Landsize`, `BuildingArea`) and oddly-cased columns (`Postcode`, `Regionname`, `Propertycount`) that were completely missing or improperly cased in the locally provided `melb_data.csv`. This caused critical `KeyError` crashes preventing AI models from training or initializing.
3. **Database connection confusion**: There was a risk that `alembic` migrations wouldn't work out-of-the-box if the user didn't execute the standard PostgreSQL commands locally due to Docker-centric assumptions in `.env.example`.

## What was fixed
1. **Removed all Docker artifacts**: Deleted `docker-compose.yml`, `backend/Dockerfile`, and `frontend/Dockerfile` to commit cleanly to a local run model.
2. **Updated README instructions**: Fully rebuilt the setup instructions in `README.md` to guarantee they only describe direct local execution (Python venv, PostgreSQL 16+, and npm install). Replaced old references to node 16 with node 18+, updated python to 3.12+, and added a bold disclaimer stating Docker is deprecated.
3. **Repaired ML Preprocessing**: Refactored `backend/app/ml/preprocess.py` and `backend/app/ml/feature_builder.py` to match the exact schema of the local `melb_data.csv`. Specifically:
   - Excluded the permanently missing attributes `Landsize` and `BuildingArea`.
   - Fixed capitalization assumptions (`PostCode`, `RegionName`, `PropertyCount`) preventing `pandas` index errors during training and runtime predictions.
4. **Backend/Frontend Validation**: Verified `npx tsc --noEmit` locally for the frontend Typescript layer which passes completely after stripping out earlier buggy AHP `defaultValue` and stale interfaces. Verified that the backend successfully runs `alembic upgrade head` and starts completely over an un-containerized network. 

## Exact Local Run Commands
### Backend (Python/PostgreSQL)
```bash
# Provide initial PostgreSQL user creation in a SQL shell:
# CREATE USER realestate WITH PASSWORD 'realestate123';
# CREATE DATABASE realestate_db OWNER realestate;

cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Configure connection (.env)
copy .env.example .env

# Run migrations and seed the db
python -m alembic upgrade head
python -m app.scripts.seed_data

# Train the AI
python -m app.ml.train_model

# Run the backend
uvicorn app.main:app --reload --port 8000
```

### Frontend (React/Vite)
```bash
cd frontend
npm install
copy .env.example .env

# Start dev server
npm run dev
```

## Known Issues
- Currently, since `Landsize` and `BuildingArea` were removed from the `NUMERIC_FEATURES` constraint inside the AI model code (because they aren't native to the latest CSV dump), the Random Forest regressions might exhibit marginally lower accuracy compared to full-featured datasets.
- Ensure that PostgreSQL user credentials match exactly what is provided in the `.env` string, as Windows machines often ship `postgres` users with differing default roles/passwords resulting in `OperationalError: connection to server at "localhost" failed: FATAL: password authentication failed` if not explicitly instantiated.
