// Fetches live display prices for the upgrade UI from GET /api/stripe/config.
//
// The endpoint reads the actual Stripe price objects, so the amounts shown in
// UpgradeModal never drift from what we charge. On any failure (Stripe not
// configured → 503, network error) this returns null and the modal degrades to
// the plain "Monthly"/"Annual" labels — the toggle and checkout still work.
//
// No credentials needed: /api/stripe/config is public (the modal renders before
// the user is necessarily authenticated).
import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_BASE_URL || '';

/**
 * @returns {{ monthly: PriceInfo|null, annual: PriceInfo|null } | null}
 *   where PriceInfo = { amount: number (minor units), currency: string, interval: string|null }
 *   null while loading or when prices are unavailable.
 */
export function useStripePrices() {
  const [prices, setPrices] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/api/stripe/config`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (!cancelled && data?.prices) setPrices(data.prices); })
      .catch(() => { /* degrade silently to plain labels */ });
    return () => { cancelled = true; };
  }, []);

  return prices;
}

/**
 * Formats a PriceInfo into a short display string, e.g. "$7.99/mo".
 * Returns '' when info is missing so the caller renders nothing.
 */
export function formatPrice(info, locale) {
  if (!info || info.amount == null || !info.currency) return '';
  const amount = new Intl.NumberFormat(locale || undefined, {
    style: 'currency',
    currency: info.currency.toUpperCase(),
  }).format(info.amount / 100);
  const suffix = info.interval === 'year' ? '/yr' : info.interval === 'month' ? '/mo' : '';
  return `${amount}${suffix}`;
}
