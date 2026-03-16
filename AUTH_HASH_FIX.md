# AUTH HASH FIX

## Root Cause

The backend used `passlib` with the `bcrypt` scheme for password hashing and verification. With current `bcrypt` package versions, this can cause runtime compatibility failures (including internal attribute access errors). In addition, bcrypt has a 72-byte password limit, which caused runtime crashes on long password inputs.

## What Was Changed

1. Replaced new password hashing from `passlib`+bcrypt to `pwdlib` recommended hasher (Argon2) in `backend/app/core/security.py`.
2. Kept auth helper API stable (`hash_password`, `verify_password`) so routes and architecture remain unchanged.
3. Added legacy bcrypt verification path in `verify_password` for existing bcrypt hashes (`$2a$`, `$2b$`, `$2y$`) using `bcrypt.checkpw`.
4. Added safe guards:
   - `hash_password` raises a clean validation error for empty password.
   - `verify_password` returns `False` for invalid inputs and never leaks backend crypto crashes.
   - bcrypt over-72-byte verify errors are caught and treated as invalid credentials instead of server errors.
5. Added defensive validation in auth flow:
   - `register` catches password hashing validation errors and returns HTTP 400.
   - `login` explicitly rejects empty password input.
6. Updated schema constraints:
   - `UserRegister.password`: `min_length=6`, `max_length=1024`
   - `UserLogin.password`: `min_length=1`, `max_length=1024`

## Dependency Changes

In `backend/requirements.txt`:

- Removed: `passlib[bcrypt]>=1.7.4`
- Added: `pwdlib[argon2]>=0.2.0`
- Added: `bcrypt>=4.1.0` (legacy bcrypt hash verification support)

## Verification Performed

Verification was run against the backend auth endpoints after installing dependencies and restarting backend:

1. Backend startup succeeds.
2. `POST /api/auth/register` succeeds (no bcrypt/passlib crash).
3. Stored `users.password_hash` is valid (Argon2 hash format).
4. `POST /api/auth/login` succeeds with the same password.
5. Login with incorrect password is rejected with 401.
6. No passlib/bcrypt compatibility crash appears in backend logs.
7. Long password input no longer crashes the server.
