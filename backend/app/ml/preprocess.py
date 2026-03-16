"""Feature engineering and preprocessing for the ML pipeline."""

import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer

# Features used by the model
NUMERIC_FEATURES = [
    "Rooms",
    "Distance",
    "Bedrooms",
    "Bathrooms",
    "Cars",
    "YearBuilt",
    "Latitude",
    "Longitude",
    "PropertyCount",
    "PostCode",
]

CATEGORICAL_FEATURES = [
    "Type",
    "RegionName",
]

ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

TARGET_COLUMN = "Price"


def build_preprocessor() -> ColumnTransformer:
    """Build a reusable sklearn ColumnTransformer for numeric + categorical features."""
    numeric_transformer = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    categorical_transformer = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="constant", fill_value="Unknown")),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, NUMERIC_FEATURES),
            ("cat", categorical_transformer, CATEGORICAL_FEATURES),
        ],
        remainder="drop",
    )
    return preprocessor
