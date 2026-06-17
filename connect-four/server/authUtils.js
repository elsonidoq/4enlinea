/**
 * Pure function — no side effects, no Express dependency.
 * Builds the Supabase Google OAuth authorize URL.
 *
 * @param {string} supabaseUrl — e.g. https://xxx.supabase.co
 * @param {string} frontendUrl — absolute URL where Supabase redirects after consent
 * @returns {string} full authorize URL with provider=google and encoded redirect_to
 */
export function buildGoogleAuthorizeUrl(supabaseUrl, frontendUrl) {
  return `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(frontendUrl)}`;
}
