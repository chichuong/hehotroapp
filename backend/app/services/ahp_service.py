"""
AHP Engine — Analytic Hierarchy Process implementation.

Implements the standard AHP method:
1. Construct pairwise comparison matrix
2. Normalize columns
3. Compute priority vector (criteria weights)
4. Compute λmax
5. Compute CI = (λmax - n) / (n - 1)
6. Compute CR = CI / RI
"""
from typing import Dict, List, Tuple, Optional

import numpy as np

from app.models.ahp_matrix_entry import AHPMatrixEntry

# Standard Random Index table for AHP consistency check
RI_TABLE: Dict[int, float] = {
    1: 0.0,
    2: 0.0,
    3: 0.58,
    4: 0.90,
    5: 1.12,
    6: 1.24,
    7: 1.32,
    8: 1.41,
    9: 1.45,
}

CR_THRESHOLD = 0.1


def build_matrix_from_entries(
    entries: List[AHPMatrixEntry],
    criteria_ids: List[int],
) -> np.ndarray:
    """Build a full pairwise comparison matrix from stored upper-triangle entries."""
    n = len(criteria_ids)
    matrix = np.ones((n, n), dtype=float)
    id_to_idx = {cid: idx for idx, cid in enumerate(criteria_ids)}

    for entry in entries:
        row_idx = id_to_idx.get(entry.criteria_id_row)
        col_idx = id_to_idx.get(entry.criteria_id_col)
        if row_idx is None or col_idx is None:
            continue
        matrix[row_idx][col_idx] = entry.value
        if entry.value != 0:
            matrix[col_idx][row_idx] = 1.0 / entry.value

    return matrix


def normalize_matrix(matrix: np.ndarray) -> np.ndarray:
    """Normalize columns of the pairwise comparison matrix."""
    col_sums = matrix.sum(axis=0)
    # Avoid division by zero
    col_sums[col_sums == 0] = 1.0
    return matrix / col_sums


def calculate_priority_vector(matrix: np.ndarray) -> np.ndarray:
    """Compute the priority vector (criteria weights) by averaging normalized rows."""
    normalized = normalize_matrix(matrix)
    return normalized.mean(axis=1)


def calculate_lambda_max(matrix: np.ndarray, weights: np.ndarray) -> float:
    """Compute λmax — the principal eigenvalue approximation."""
    n = matrix.shape[0]
    weighted_sum = matrix @ weights
    # Avoid division by zero
    ratios = np.where(weights > 0, weighted_sum / weights, 0)
    return float(ratios.sum() / n)


def calculate_consistency_index(lambda_max: float, n: int) -> float:
    """Compute CI = (λmax - n) / (n - 1)."""
    if n <= 1:
        return 0.0
    return (lambda_max - n) / (n - 1)


def calculate_consistency_ratio(ci: float, n: int) -> float:
    """Compute CR = CI / RI."""
    ri = RI_TABLE.get(n, 1.45)  # Use 1.45 for n >= 9
    if ri == 0:
        return 0.0
    return ci / ri


def compute_ahp_weights(
    entries: List[AHPMatrixEntry],
    criteria_ids: List[int],
) -> Dict:
    """
    Full AHP computation pipeline.

    Returns dict with:
        weights: dict of criteria_id -> weight
        lambda_max: float
        ci: float
        cr: float
        is_consistent: bool
        matrix: list of lists (the full matrix)
    """
    n = len(criteria_ids)
    if n == 0:
        return {
            "weights": {},
            "lambda_max": 0.0,
            "ci": 0.0,
            "cr": 0.0,
            "is_consistent": True,
            "matrix": [],
        }

    matrix = build_matrix_from_entries(entries, criteria_ids)
    weights = calculate_priority_vector(matrix)
    lambda_max = calculate_lambda_max(matrix, weights)
    ci = calculate_consistency_index(lambda_max, n)
    cr = calculate_consistency_ratio(ci, n)

    weights_dict = {
        criteria_ids[i]: round(float(weights[i]), 6)
        for i in range(n)
    }

    return {
        "weights": weights_dict,
        "lambda_max": round(lambda_max, 6),
        "ci": round(ci, 6),
        "cr": round(cr, 6),
        "is_consistent": cr <= CR_THRESHOLD,
        "matrix": matrix.tolist(),
    }
