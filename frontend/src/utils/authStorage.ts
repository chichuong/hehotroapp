const ACCESS_TOKEN_KEY = "access_token";

export function getAccessToken(): string | null {
  const raw = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    return null;
  }

  return trimmed;
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}
