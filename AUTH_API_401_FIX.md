# AUTH API 401 FIX

## Root Causes Found

1. Token handling was not sanitized centrally. Invalid values like `"null"` or `"undefined"` in local storage could still leak into request flow and trigger unauthorized behavior.
2. There was no centralized 401 handling in the API client, so expired/invalid token state was not synchronized to frontend auth state quickly.
3. Protected feature calls (notably compare/favorites actions) relied on partial guards and could still attempt protected endpoints before auth state was fully initialized.
4. Compare state refresh and mutation logic did not explicitly gate all protected requests with a strong `isAuthenticated + initialized` condition.

## What Was Fixed

1. Added centralized auth storage helpers in `frontend/src/utils/authStorage.ts`:
   - `getAccessToken()` sanitizes and clears invalid stored token values.
   - `setAccessToken()` and `clearAccessToken()` unify token writes/removes.

2. Hardened API client in `frontend/src/api/client.ts`:
   - Request interceptor now reads token from centralized auth storage.
   - It removes stale `Authorization` headers when no token exists.
   - Added response interceptor for 401 that clears token and emits a one-shot global auth unauthorized event (`app:auth-unauthorized`) to prevent repeated unauthorized loops.

3. Improved auth bootstrap and state source in `frontend/src/context/AuthContext.tsx`:
   - Added reliable auth state fields: `token`, `isAuthenticated`, `initialized` (with existing `loading`).
   - `/auth/me` is now called only when a valid token exists.
   - Global unauthorized event listener clears auth state immediately when token becomes invalid.
   - Login/logout now use centralized token storage utilities.

4. Prevented protected API request spam in compare flow (`frontend/src/context/CompareContext.tsx`):
   - `refresh()` now hard-guards on `initialized` and `isAuthenticated`.
   - Compare add/remove operations now short-circuit with Vietnamese message when unauthenticated.

5. Prevented protected API request spam in favorites checks (`frontend/src/components/FavoriteButton.tsx`):
   - Favorite check runs only when auth is initialized and authenticated.
   - For guest users, component now renders login CTA state instead of calling `/favorites/check/{id}`.

6. Added stronger click-time guard for compare action (`frontend/src/components/CompareButton.tsx`):
   - Avoids compare action before auth initialization.
   - Guests are redirected to login cleanly without protected API call.

## Endpoints Involved

- `GET /api/auth/me`
- `GET /api/favorites`
- `GET /api/favorites/check/{id}`
- `GET /api/compare`
- `POST /api/compare`
- `DELETE /api/compare/{id}`

## Guest vs Authenticated Behavior Now

### Guest user
- Public pages load without protected request flooding.
- No automatic favorites check requests are sent.
- Compare/favorite actions show login-directed behavior in UI.
- No repeated auth retries from missing token state.

### Authenticated user
- Token is attached consistently via `Authorization: Bearer <token>`.
- Protected endpoints are called only when auth state is initialized and valid.
- If token expires or is invalid, auth state is cleared centrally and unauthorized loops are stopped.

## Backend Protection Check

Backend protection is correct and preserved:
- `/api/auth/me` requires current user.
- `/api/favorites*` requires current user.
- `/api/compare*` requires current user.
- DSS user-specific endpoints are protected.

No backend endpoint access policy was loosened.
