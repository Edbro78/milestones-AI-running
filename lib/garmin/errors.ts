export function isMfaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /mfa|multi.?factor|totp|verification code|2fa/i.test(msg);
}

export function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|rate[_ ]?limit|error 1015|too many requests/i.test(msg);
}

/** Kort, lesbar feil til UI — aldri rå Cloudflare/JSON/HTML-dump. */
export function formatGarminUserError(err: unknown): string {
  if (isRateLimitError(err)) {
    return "Garmin begrenser tilkoblingen akkurat nå. Vent et minutt og trykk Synkroniser.";
  }
  if (isMfaError(err)) {
    return "Garmin krever tofaktor. Skru av MFA for kontoen eller fullfør innlogging i Garmin Connect.";
  }
  const raw = err instanceof Error ? err.message : String(err);
  if (/404|page not found|page you're looking for/i.test(raw)) {
    return "Garmin svarte ikke på et av endepunktene. Prøv synkronisering på nytt.";
  }
  if (!raw || raw.length > 160 || raw.includes("{") || /<\/?[a-z]/i.test(raw)) {
    return "Kunne ikke hente data fra Garmin. Prøv igjen om litt.";
  }
  return raw;
}
