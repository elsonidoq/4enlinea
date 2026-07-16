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
// Read the period suffix straight from the i18n bundles rather than the i18next
// runtime singleton: this module (and its test) must work under plain `node --test`
// (no i18next `init()`/loader), and formatPrice already takes an explicit `locale`
// param decoupled from the app's live language — a static bundle lookup matches that
// shape exactly. `with { type: 'json' }` is required by Node's ESM loader for JSON
// imports (see tests/unit/i18nKeyParity.test.js for the same pattern).
import en from '../i18n/en.json' with { type: 'json' };
import es from '../i18n/es.json' with { type: 'json' };

const SUFFIX_BUNDLES = { en, es };

const API = import.meta.env?.VITE_API_BASE_URL || '';

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
  // Resolve the period suffix from the i18n bundles (not hardcoded English) so
  // Spanish gets "/mes"/"/año" instead of a leaked "/mo"/"/yr".
  const lang = (locale || 'en').split('-')[0];
  const bundle = SUFFIX_BUNDLES[lang] || SUFFIX_BUNDLES.en;
  const suffix = info.interval === 'year' ? bundle.upgrade.suffixYear
    : info.interval === 'month' ? bundle.upgrade.suffixMonth
    : '';
  return `${amount}${suffix}`;
}

// D3: derive the badge from live /api/stripe/config so it can never drift from Stripe.
// Returns null (render nothing) rather than a misleading badge when prices are missing,
// currencies mismatch, or annual isn't a saving — useStripePrices already degrades
// silently by design.
//
// `monthly`/`annual` are PriceInfo objects ({amount, currency, interval}), NOT bare cent
// integers — see the useStripePrices() return shape above and stripeProcessor.js's
// getPrices()/describe(). `perMonth` is returned as a PriceInfo too, so the existing
// formatPrice renders it without new formatting code.
export function computeAnnualSavings(prices) {
  if (!prices) return null;
  const { monthly, annual } = prices;
  if (!monthly || !annual) return null;
  if (monthly.currency !== annual.currency) return null;
  const yearlyAtMonthly = monthly.amount * 12;
  if (annual.amount >= yearlyAtMonthly) return null;
  return {
    percent: Math.round((1 - annual.amount / yearlyAtMonthly) * 100),
    // interval is deliberately null: the "/mo billed annually" (en) / "/mes facturado
    // anual" (es) copy key owns the suffix. If formatPrice also appended '/mo' here,
    // English would render "$1.83/mo/mo billed annually" and Spanish would render a
    // hardcoded English "/mo" wedged into Spanish copy.
    perMonth: { amount: Math.round(annual.amount / 12), currency: annual.currency, interval: null },
  };
}
