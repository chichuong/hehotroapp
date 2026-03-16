# AHP Simplification Debugging Report

## What Broke
Following the recent simplification of the AHP real estate feature to precisely 5 criteria and 5 alternatives, several critical issues were introduced across the stack:
1. **Frontend Input State Mismatch (Critical rendering issue)**: The newly implemented numeric input form used `defaultValue` for its component state but did not use a controlled input, causing React to swallow state updates when existing matrices were loaded from the database or when values implicitly changed.
2. **Frontend Direct State Mutation**: The `handlePairChange` and parsing logic mutated `pair.value` directly into the array element, breaking React's declarative state model and causing infinite loops / stale closures.
3. **Backend Schema Validation (Bug)**: The pairwise comparison input was originally defined as a `float` > 0 in the Pydantic schemas. It didn't strictly reject floats that weren't representing integers, and the fastAPI manual validator (`val != int(val)`) in the endpoint was a bit unsafe and unstructured.
4. **Backend Stale "bathrooms"/"cars" References**: While the old attributes `bathrooms` and `cars` were removed from AHP evaluation, they were left in ranking schema payloads (`RankedPropertyItem`), raising some initial flags though perfectly valid since the `Property` model intrinsically kept those features. They did not affect ranking computation. 

## What Was Fixed
1. **Uncontrolled to Controlled Transformation**: 
    - Migrated the AHP inputs in `/dss/ahp` (`AHPSetupPage.tsx`) to controlled components. 
    - Implemented a dedicated `inputValues` state object to track raw untyped strings internally, seamlessly mapping valid integers to the overarching `pairs` array while allowing mid-typing states (e.g., cleared inputs).
2. **Immutable React State Management**: Refactored the array map rendering to safely shallow-clone initial pairs and values, preventing direct mutations on the client side. 
3. **Pydantic Hardening**: Placed robust integer-constraint logic directly onto the `AHPMatrixEntryInput` Pydantic schema using validators instead of manually sniffing values down the line in the API controller. Values are now properly constrained (`ge=1`, `le=9`, strictly integer evaluations).
4. **Robust Testing Baseline established**: Introduced Python unittests natively (`backend/app/tests/test_ahp_service.py`) executing structural validations on Eigenvector logic and inconsistency ratios to ensure backward robustness.

## Any Remaining Known Issues
- Currently, ranking calculations correctly supply `0.5` defaults for missing continuous measurements (like `distance` coordinates for unmapped suburbs) through `property_scoring_service.py`. While safe and prevents DB panics, it inherently punishes properties with missing latitude/longitude metrics.

## Any Assumptions Made
- We assumed properties intrinsically missing required numeric details (e.g. `price`, `year_built`) naturally inherit the midpoint equivalent during normalizations (`0.5`), keeping the alternatives logic structurally a 5x5 Matrix at all times.
- We assumed the user wishes to maintain exact numeric ranking limits in frontend arrays rather than querying a custom range size (i.e., mapping logic directly selects from Top-Priority candidates deterministically inside the `/ahp/alternatives` bounds).
- We assumed backend environment dependencies (`Pydantic`, `SQLAlchemy`) compile gracefully locally on Windows because the internal FastApi import tree returned `Backend imports OK`.
