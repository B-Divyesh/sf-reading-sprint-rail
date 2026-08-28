const SLUG = 'reading-sprint-rail';
const API = (import.meta.env.VITE_BILLING_API || 'https://api.sociobot.in/api/v1').replace(/\/$/, '');
const TOKEN_KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `${TOKEN_KEY}:verdict`;

export const checkoutUrl = `${API}/products/${SLUG}/checkout`;

export function captureLicenseFromUrl(): void {
  const url = new URL(location.href);
  const token = url.searchParams.get('license');
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function storeLicense(token: string): void {
  localStorage.setItem(TOKEN_KEY, token.trim());
  localStorage.removeItem(VERDICT_KEY);
}

export function getLicense(): string | null { return localStorage.getItem(TOKEN_KEY); }

export function cachedUnlock(): boolean {
  try { return Boolean(getLicense()) && JSON.parse(localStorage.getItem(VERDICT_KEY) || '{}').valid === true; }
  catch { return false; }
}

export async function verifyLicense(force = false): Promise<{ valid: boolean; reason: string }> {
  const token = getLicense();
  if (!token) return { valid: false, reason: 'missing' };
  try {
    const cached = JSON.parse(localStorage.getItem(VERDICT_KEY) || '{}');
    if (!force && cached.checkedAt > Date.now() - 86_400_000) return cached;
  } catch { /* verify below */ }
  const response = await fetch(`${API}/products/${SLUG}/verify?license=${encodeURIComponent(token)}`);
  if (!response.ok) throw new Error('License check is temporarily unavailable.');
  const result = await response.json() as { valid: boolean; reason: string };
  localStorage.setItem(VERDICT_KEY, JSON.stringify({ ...result, checkedAt: Date.now() }));
  return result;
}
